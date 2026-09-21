import AppKit
import SwiftUI
import GembaUpdate

/// Gemba Filesend Updater — lives at `Gemba Filesend.app/Contents/Helpers/`.
///
/// The app itself stays sandboxed, and a sandboxed app can neither replace its
/// own bundle in /Applications nor download an app that will open (everything
/// it writes is quarantined). So the app only *checks* version.json; to update
/// it launches this helper and quits. The helper is not sandboxed, and does the
/// part that needs that, trusting nothing the app handed it but two paths:
///
///   1. reads the installed app's version from its Info.plist;
///   2. fetches version.json itself, downloads the release, and verifies size,
///      SHA-256 and the Ed25519 signature against the key in its own Info.plist;
///   3. unzips it and checks the bundle id, version and code signature;
///   4. waits for the app to quit, then hands the swap to a short script (the
///      helper itself lives inside the bundle being replaced) which puts the
///      old copy back on failure, re-registers the Share Extension and — when
///      asked — opens the new version.
///
/// The app starts it through LaunchServices — never as a child process, which
/// is what keeps it outside the app's sandbox — by opening
///
///     gemba-filesend-updater://install?app=<path>&pid=<pid>&relaunch=1
///
/// with this helper specifically (LaunchServices drops command-line arguments
/// from a sandboxed caller, but delivers a URL). For testing it also accepts
/// `--app <path> --pid <pid> [--relaunch] [--manifest <url>]`. With neither,
/// it updates the app it is embedded in.
@main
struct UpdateHelperApp: App {
    @NSApplicationDelegateAdaptor(HelperDelegate.self) private var delegate

    var body: some Scene {
        Window("Gemba Filesend Updater", id: "update") {
            UpdateWindow(job: UpdateJob.shared)
        }
        .windowResizability(.contentSize)
        .windowStyle(.hiddenTitleBar)
    }
}

final class HelperDelegate: NSObject, NSApplicationDelegate {
    func application(_ application: NSApplication, open urls: [URL]) {
        MainActor.assumeIsolated {
            guard let url = urls.first(where: { $0.scheme == "gemba-filesend-updater" }) else { return }
            UpdateJob.shared.start(UpdateJob.Request(url: url))
        }
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        MainActor.assumeIsolated {
            if CommandLine.arguments.contains("--app") {
                UpdateJob.shared.start(UpdateJob.Request(arguments: CommandLine.arguments))
                return
            }
            // Opened by URL: that arrives just after launch. If it never does
            // (someone opened the helper by hand), update the enclosing app.
            Task { @MainActor in
                try? await Task.sleep(for: .seconds(2))
                UpdateJob.shared.start(UpdateJob.Request())
            }
            NSApp.activate(ignoringOtherApps: true)
        }
    }
}

@MainActor
@Observable
final class UpdateJob {
    static let shared = UpdateJob()

    /// What to update, and whether to reopen it afterwards.
    struct Request {
        var app: URL?
        var appPID: pid_t?
        var relaunch = false
        var manifest: URL?

        /// No instructions: the app this helper is embedded in
        /// (`X.app/Contents/Helpers/Updater.app`).
        init() {
            app = Bundle.main.bundleURL.deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        }

        init(url: URL) {
            let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
            func value(_ name: String) -> String? { items.first(where: { $0.name == name })?.value }
            app = value("app").map { URL(fileURLWithPath: $0) }
            appPID = value("pid").flatMap { pid_t($0) }
            relaunch = value("relaunch") == "1"
            manifest = value("manifest").flatMap(URL.init(string:))
        }

        init(arguments: [String]) {
            func value(_ flag: String) -> String? {
                guard let index = arguments.firstIndex(of: flag), index + 1 < arguments.count else { return nil }
                return arguments[index + 1]
            }
            app = value("--app").map { URL(fileURLWithPath: $0) }
            appPID = value("--pid").flatMap { pid_t($0) }
            relaunch = arguments.contains("--relaunch")
            manifest = value("--manifest").flatMap(URL.init(string:))
        }
    }

    enum Phase: Equatable {
        case starting, downloading(String), verifying, waiting, installing, upToDate, failed(String)
    }

    var phase: Phase = .starting {
        didSet { Self.log("\(phase)") }
    }

    /// Every step goes to ~/Library/Logs/Gemba Filesend Updater.log, so a
    /// failed update can be diagnosed after the window is gone.
    static func log(_ message: String) {
        let url = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Logs/Gemba Filesend Updater.log")
        let line = "\(ISO8601DateFormatter().string(from: Date())) \(message)\n"
        if let handle = try? FileHandle(forWritingTo: url) {
            handle.seekToEndOfFile()
            handle.write(Data(line.utf8))
            try? handle.close()
        } else {
            try? Data(line.utf8).write(to: url)
        }
    }

    static let bundleIdentifier = "uk.gemba.filesend.mac"
    static let extensionIdentifier = "uk.gemba.filesend.mac.ShareExtension"
    static let appName = "Gemba Filesend"

    private(set) var app: URL?
    private(set) var appPID: pid_t?
    private(set) var relaunch = false
    private(set) var manifestURL = UpdateClient.productionManifest
    private var started = false

    /// Runs once; a second request (a repeated click) is ignored.
    func start(_ request: Request) {
        guard !started else { return }
        started = true
        // Two requests can race (a click on "Restart to update" and the quit
        // that follows); the first helper does the work, any other just leaves.
        let me = ProcessInfo.processInfo.processIdentifier
        let others = NSRunningApplication.runningApplications(withBundleIdentifier: Bundle.main.bundleIdentifier ?? "")
            .filter { $0.processIdentifier != me }
        if !others.isEmpty {
            Self.log("another updater is already running — leaving it to that one")
            NSApp.terminate(nil)
            return
        }
        app = request.app
        appPID = request.appPID
        relaunch = request.relaunch
        if let manifest = request.manifest { manifestURL = manifest }
        Task { await run() }
    }

    private var cache: URL {
        FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("\(Self.bundleIdentifier).Updater", isDirectory: true)
    }

    func run() async {
        Self.log("start app=\(app?.path ?? "-") pid=\(appPID.map(String.init) ?? "-") relaunch=\(relaunch) manifest=\(manifestURL)")
        do {
            guard let app, app.pathExtension == "app",
                  let info = NSDictionary(contentsOf: app.appendingPathComponent("Contents/Info.plist")),
                  info["CFBundleIdentifier"] as? String == Self.bundleIdentifier else {
                throw UpdateError.cannotInstall("Gemba Filesend wasn't found.")
            }
            guard UpdateInstaller.isInstallable(app) else {
                throw UpdateError.cannotInstall("Move Gemba Filesend to your Applications folder first, then update.")
            }
            guard let current = AppVersion(info["CFBundleShortVersionString"] as? String ?? "",
                                           build: Int(info["CFBundleVersion"] as? String ?? "") ?? 0) else {
                throw UpdateError.cannotInstall("The installed app's version couldn't be read.")
            }
            let verifier = try UpdateVerifier(
                publicKeyBase64: Bundle.main.object(forInfoDictionaryKey: "GembaUpdatePublicKey") as? String)
            let client = UpdateClient(manifestURL: manifestURL, verifier: verifier)

            guard let release = try await client.newerRelease(than: current) else {
                phase = .upToDate
                return
            }
            phase = .downloading(release.version)
            let zip = try await client.download(release, into: cache)

            phase = .verifying
            let stage = cache.appendingPathComponent("\(release.version)-\(release.build)", isDirectory: true)
            let (identifier, name) = (Self.bundleIdentifier, Self.appName)
            let prepared = try await Task.detached {
                try UpdateInstaller.prepare(zip: zip, manifest: release, bundleIdentifier: identifier,
                                            appName: name, into: stage)
            }.value
            try? FileManager.default.removeItem(at: zip)

            phase = .waiting
            try await waitForAppToQuit()

            phase = .installing
            try UpdateInstaller.launchSwap(prepared: prepared, destination: app, relaunch: relaunch,
                                           extensionIdentifier: Self.extensionIdentifier,
                                           needsAdmin: !UpdateInstaller.canReplaceWithoutAdmin(app))
            // The script waits for this process to end before swapping.
            try? await Task.sleep(for: .milliseconds(600))
            NSApp.terminate(nil)
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    private func waitForAppToQuit() async throws {
        let pid = appPID ?? NSRunningApplication.runningApplications(withBundleIdentifier: Self.bundleIdentifier)
            .first(where: { $0.bundleURL?.standardizedFileURL == app?.standardizedFileURL })?.processIdentifier
        guard let appPID = pid else { return }
        for _ in 0..<300 {   // 60 s
            if kill(appPID, 0) != 0 { return }
            try? await Task.sleep(for: .milliseconds(200))
        }
        throw UpdateError.cannotInstall("Gemba Filesend is still open. Quit it and try again.")
    }

    /// After a failure or "up to date": give the user their app back.
    func openAppAndQuit() {
        if relaunch, let app { NSWorkspace.shared.openApplication(at: app, configuration: .init()) }
        NSApp.terminate(nil)
    }
}

struct UpdateWindow: View {
    @Bindable var job: UpdateJob

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                RoundedRectangle(cornerRadius: 7, style: .continuous)
                    .fill(Color(red: 1.0, green: 0.84, blue: 0.2))
                    .frame(width: 26, height: 26)
                    .overlay(Image(systemName: "arrow.down").font(.system(size: 12, weight: .bold)).foregroundStyle(.black))
                Text("Updating Gemba Filesend").font(.system(size: 14, weight: .semibold))
            }
            switch job.phase {
            case .failed(let message):
                Label(message, systemImage: "exclamationmark.triangle.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(.red)
                    .fixedSize(horizontal: false, vertical: true)
                HStack { Spacer(); Button(job.relaunch ? "Open Gemba Filesend" : "Close") { job.openAppAndQuit() }.keyboardShortcut(.defaultAction) }
            case .upToDate:
                Text("You already have the newest version.").font(.system(size: 12))
                HStack { Spacer(); Button(job.relaunch ? "Open Gemba Filesend" : "Close") { job.openAppAndQuit() }.keyboardShortcut(.defaultAction) }
            default:
                ProgressView().progressViewStyle(.linear)
                Text(status).font(.system(size: 12)).foregroundStyle(.secondary)
            }
        }
        .padding(20)
        .frame(width: 360)
    }

    private var status: String {
        switch job.phase {
        case .starting: "Checking for the new version…"
        case .downloading(let version): "Downloading version \(version)…"
        case .verifying: "Checking the signature…"
        case .waiting: "Waiting for Gemba Filesend to close…"
        case .installing: "Installing…"
        default: ""
        }
    }
}
