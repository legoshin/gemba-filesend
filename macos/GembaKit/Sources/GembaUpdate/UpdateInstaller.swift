import Foundation

/// Unpacks a verified release, checks the app inside, and swaps it in for the
/// running one.
///
/// The swap can't happen while the app runs, so it is done by a small shell
/// script started just before the app quits: it waits for the app's process to
/// end, moves the old bundle aside, moves the new one into place (putting the
/// old one back if that fails), re-registers the Share Extension, and — when
/// asked — opens the new version.
public enum UpdateInstaller {
    public struct Prepared: Sendable {
        public let app: URL
        public let version: AppVersion
    }

    /// Extracts `zip` into `directory` and checks the app it contains is this
    /// app (`bundleIdentifier`), is exactly the version the manifest announced,
    /// and has an intact code signature.
    public static func prepare(zip: URL, manifest: UpdateManifest, bundleIdentifier: String,
                               appName: String, into directory: URL) throws -> Prepared {
        let fm = FileManager.default
        try? fm.removeItem(at: directory)
        try fm.createDirectory(at: directory, withIntermediateDirectories: true)
        try run("/usr/bin/ditto", ["-x", "-k", zip.path, directory.path], failure: "couldn't unzip it")

        let app = directory.appendingPathComponent("\(appName).app")
        // Read Info.plist directly: `Bundle(url:)` caches by path, and a
        // second update staged at the same path would be read stale.
        guard let plistData = try? Data(contentsOf: app.appendingPathComponent("Contents/Info.plist")),
              let info = try? PropertyListSerialization.propertyList(from: plistData, format: nil) as? [String: Any] else {
            throw UpdateError.badBundle("\(appName).app is missing from the download")
        }
        let identifier = info["CFBundleIdentifier"] as? String
        guard identifier == bundleIdentifier else {
            throw UpdateError.badBundle("it is \(identifier ?? "an unknown app"), not \(bundleIdentifier)")
        }
        guard let version = AppVersion(info["CFBundleShortVersionString"] as? String ?? "",
                                       build: Int(info["CFBundleVersion"] as? String ?? "") ?? -1),
              let announced = manifest.appVersion,
              version == announced, version.build == announced.build else {
            throw UpdateError.badBundle("its version doesn't match the one announced")
        }
        try run("/usr/bin/codesign", ["--verify", "--deep", "--strict", app.path], failure: "its code signature is broken")
        // Downloaded by this app, not a browser, so it shouldn't carry a
        // quarantine flag — but make sure: a quarantined ad-hoc app won't open.
        _ = try? runStatus("/usr/bin/xattr", ["-dr", "com.apple.quarantine", app.path])
        return Prepared(app: app, version: version)
    }

    /// Whether the current user can replace `destination` without an admin password.
    public static func canReplaceWithoutAdmin(_ destination: URL) -> Bool {
        let parent = destination.deletingLastPathComponent().path
        return FileManager.default.isWritableFile(atPath: parent)
            && FileManager.default.isWritableFile(atPath: destination.path)
    }

    /// A bundle running from somewhere it can't stay — a disk image, or the
    /// randomised read-only copy Gatekeeper makes of an app run from Downloads.
    public static func isInstallable(_ destination: URL) -> Bool {
        let path = destination.path
        return !path.hasPrefix("/Volumes/") && !path.contains("/AppTranslocation/")
    }

    /// The swap script. Arguments: pid, new app, destination, relaunch (1/0),
    /// share-extension bundle id, the user's uid. When it runs as root (an
    /// admin password was needed) it still registers and opens the app as that
    /// user, never as root.
    public static let script = #"""
    #!/bin/bash
    # Gemba Filesend updater — replaces the app once it has quit.
    PID="$1"; NEW="$2"; DEST="$3"; RELAUNCH="$4"; EXT_ID="$5"; USER_ID="$6"
    as_user() {
      if [ "$(id -u)" = "0" ] && [ -n "$USER_ID" ]; then launchctl asuser "$USER_ID" sudo -u "#$USER_ID" "$@"; else "$@"; fi
    }
    LOG="${TMPDIR:-/tmp}/gemba-filesend-update.log"
    exec >>"$LOG" 2>&1
    echo "$(date) updating $DEST"
    # One swap at a time: a second updater started meanwhile must not move the
    # bundle the first has just put in place.
    LOCK="/tmp/gemba-filesend-update.lock"
    if ! mkdir "$LOCK" 2>/dev/null; then
      if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +10 2>/dev/null)" ]; then rm -rf "$LOCK"; mkdir "$LOCK" || exit 0
      else echo "another update is in progress"; exit 0; fi
    fi
    trap 'rm -rf "$LOCK"' EXIT
    for _ in $(seq 1 300); do kill -0 "$PID" 2>/dev/null || break; sleep 0.2; done
    if kill -0 "$PID" 2>/dev/null; then echo "app still running, giving up"; exit 1; fi
    OLD="$(dirname "$DEST")/.$(basename "$DEST").old.$$"
    if ! mv "$DEST" "$OLD"; then echo "couldn't move the old app aside"; exit 1; fi
    if ! mv "$NEW" "$DEST"; then
      echo "couldn't move the new app in — restoring"; mv "$OLD" "$DEST"; exit 1
    fi
    rm -rf "$OLD"
    echo "$(date) installed"
    # Tests swap a stand-in app and must not register it with the system.
    if [ "${GEMBA_UPDATE_SKIP_REGISTER:-0}" = "1" ]; then exit 0; fi
    LSREGISTER=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister
    as_user "$LSREGISTER" -f -R -trusted "$DEST" || true
    as_user pluginkit -a "$DEST/Contents/PlugIns/ShareExtension.appex" || true
    as_user pluginkit -e use -i "$EXT_ID" || true
    if [ "$RELAUNCH" = "1" ]; then as_user open "$DEST"; fi
    """#

    /// Writes the script next to the staged app and starts it detached, so it
    /// outlives this process. With `needsAdmin`, macOS asks for an admin
    /// password first (the one prompt a standard user sees).
    public static func launchSwap(prepared: Prepared, destination: URL, relaunch: Bool,
                                  extensionIdentifier: String, needsAdmin: Bool) throws {
        let scriptURL = prepared.app.deletingLastPathComponent().appendingPathComponent("swap.sh")
        try script.write(to: scriptURL, atomically: true, encoding: .utf8)
        try FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: scriptURL.path)

        let args = [scriptURL.path, String(ProcessInfo.processInfo.processIdentifier), prepared.app.path,
                    destination.path, relaunch ? "1" : "0", extensionIdentifier, String(getuid())]
        let process = Process()
        if needsAdmin {
            let command = args.map(shellQuote).joined(separator: " ") + " &> /dev/null &"
            process.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
            process.arguments = ["-e", "do shell script \(appleScriptQuote(command)) with administrator privileges"]
        } else {
            process.executableURL = URL(fileURLWithPath: "/bin/bash")
            process.arguments = args
        }
        process.standardInput = FileHandle.nullDevice
        process.standardOutput = FileHandle.nullDevice
        process.standardError = FileHandle.nullDevice
        do { try process.run() } catch { throw UpdateError.cannotInstall(error.localizedDescription) }
        if needsAdmin {
            // The prompt blocks osascript; wait so a cancelled prompt is reported.
            process.waitUntilExit()
            if process.terminationStatus != 0 { throw UpdateError.cannotInstall("an administrator password is needed") }
        }
    }

    static func shellQuote(_ s: String) -> String { "'" + s.replacingOccurrences(of: "'", with: "'\\''") + "'" }
    static func appleScriptQuote(_ s: String) -> String {
        "\"" + s.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "\"", with: "\\\"") + "\""
    }

    @discardableResult
    static func runStatus(_ tool: String, _ arguments: [String]) throws -> Int32 {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: tool)
        process.arguments = arguments
        process.standardOutput = FileHandle.nullDevice
        process.standardError = FileHandle.nullDevice
        try process.run()
        process.waitUntilExit()
        return process.terminationStatus
    }

    static func run(_ tool: String, _ arguments: [String], failure: String) throws {
        let status: Int32
        do { status = try runStatus(tool, arguments) } catch { throw UpdateError.badBundle(failure) }
        guard status == 0 else { throw UpdateError.badBundle(failure) }
    }
}
