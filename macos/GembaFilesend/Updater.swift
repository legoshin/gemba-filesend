import AppKit
import SwiftUI
import GembaUpdate

/// Keeps the app current from `https://send.gemba.uk/download/version.json`.
///
/// This app is sandboxed, so it only *checks*: on launch and then daily it
/// reads version.json and compares versions. Installing is done by the
/// updater helper embedded at `Contents/Helpers/Gemba Filesend Updater.app`,
/// which is not sandboxed — it downloads the release itself, verifies its size,
/// SHA-256 and Ed25519 signature (against the public key in its own
/// Info.plist) and the unzipped app's bundle id, version and code signature,
/// then swaps it in once this app has quit. See UpdateHelper/UpdateHelperApp.swift.
@MainActor
@Observable
final class Updater {
    enum State: Equatable {
        case idle
        case checking
        case upToDate
        case available(String)
        case failed(String)
    }

    private(set) var state: State = .idle
    var notes: String?

    /// "Check for Updates Automatically" in the app menu. When on, an update
    /// found by the daily check is also installed when the app quits.
    var automatic: Bool = UserDefaults.standard.object(forKey: "autoUpdate") as? Bool ?? true {
        didSet {
            UserDefaults.standard.set(automatic, forKey: "autoUpdate")
            if automatic { start() } else { timer?.invalidate(); timer = nil }
        }
    }

    static let shared = Updater()

    private let client: UpdateClient?
    private let current: AppVersion?
    private let manifestOverride: String?
    private var timer: Timer?

    private init(bundle: Bundle = .main) {
        current = AppVersion.of(bundle: bundle)
        let verifier = try? UpdateVerifier(publicKeyBase64: bundle.object(forInfoDictionaryKey: "GembaUpdatePublicKey") as? String)
        // For testing against a local server: `defaults write uk.gemba.filesend.mac
        // updateManifestURL http://localhost:8080/version.json` (in the app's
        // container). Only https or localhost is accepted, and the helper checks
        // the signature either way.
        manifestOverride = UserDefaults.standard.string(forKey: "updateManifestURL")
        let manifestURL = manifestOverride.flatMap(URL.init(string:)) ?? UpdateClient.productionManifest
        client = verifier.map { UpdateClient(manifestURL: manifestURL, verifier: $0) }
    }

    var currentVersion: String {
        guard let current else { return "" }
        return "\(current) (\(current.build))"
    }

    private var helper: URL {
        Bundle.main.bundleURL.appendingPathComponent("Contents/Helpers/Gemba Filesend Updater.app")
    }

    func start() {
        #if DEBUG
        // A Debug build lives in DerivedData; never let it replace itself
        // unless explicitly pointed at a test manifest.
        guard manifestOverride != nil else { return }
        #endif
        guard automatic, timer == nil else { return }
        Task {
            try? await Task.sleep(for: .seconds(4))
            await check(manual: false)
        }
        timer = Timer.scheduledTimer(withTimeInterval: 24 * 3600, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self, self.automatic else { return }
                await self.check(manual: false)
            }
        }
    }

    func check(manual: Bool) async {
        if state == .checking { return }
        if case .available = state, !manual { return }
        guard let client, let current else {
            state = manual ? .failed("This build can't verify updates.") : .idle
            return
        }
        withSmoothAnimation { state = .checking }
        do {
            if let release = try await client.newerRelease(than: current) {
                notes = release.notes
                withSmoothAnimation { state = .available(release.version) }
            } else {
                withSmoothAnimation { state = manual ? .upToDate : .idle }
                if manual { dismissLater() }
            }
        } catch {
            // A failed automatic check stays quiet — the network may simply be
            // down — and is tried again tomorrow. A manual one says why.
            withSmoothAnimation { state = manual ? .failed(error.localizedDescription) : .idle }
        }
    }

    func dismiss() {
        withSmoothAnimation { state = .idle }
    }

    private func dismissLater() {
        Task {
            try? await Task.sleep(for: .seconds(4))
            if state == .upToDate { withSmoothAnimation { state = .idle } }
        }
    }

    /// Set once the helper has been started, so quitting doesn't start it twice.
    private var helperStarted = false

    /// Starts the updater helper and quits; the helper installs the update
    /// and, with `relaunch`, opens the new version.
    func install(relaunch: Bool) {
        launchHelper(relaunch: relaunch) { started in
            if started { NSApp.terminate(nil) }
        }
    }

    /// Whether quitting should hand over to the helper first: automatic
    /// updates on and a newer version known.
    var installsOnQuit: Bool {
        guard automatic, !helperStarted, case .available = state else { return false }
        return true
    }

    /// Starts the helper; `done(true)` once LaunchServices has it running.
    func launchHelper(relaunch: Bool, done: @escaping @MainActor (Bool) -> Void) {
        guard !helperStarted else { done(true); return }
        guard FileManager.default.fileExists(atPath: helper.path) else {
            state = .failed("The updater is missing from this copy of the app — reinstall it from send.gemba.uk/download.")
            done(false)
            return
        }
        // LaunchServices drops command-line arguments from a sandboxed caller,
        // so the instructions travel as a URL opened with the helper itself.
        var components = URLComponents()
        components.scheme = "gemba-filesend-updater"
        components.host = "install"
        components.queryItems = [
            URLQueryItem(name: "app", value: Bundle.main.bundlePath),
            URLQueryItem(name: "pid", value: String(ProcessInfo.processInfo.processIdentifier)),
            URLQueryItem(name: "relaunch", value: relaunch ? "1" : "0"),
        ] + (manifestOverride.map { [URLQueryItem(name: "manifest", value: $0)] } ?? [])
        guard let url = components.url else { done(false); return }
        let configuration = NSWorkspace.OpenConfiguration()
        configuration.createsNewApplicationInstance = true
        configuration.activates = true
        helperStarted = true
        // Launched through LaunchServices — not as a child process — so the
        // helper runs with its own entitlements, outside this app's sandbox.
        NSWorkspace.shared.open([url], withApplicationAt: helper, configuration: configuration) { _, error in
            Task { @MainActor in
                if let error {
                    self.helperStarted = false
                    self.state = .failed("The updater couldn't start: \(error.localizedDescription)")
                    done(false)
                } else {
                    done(true)
                }
            }
        }
    }
}

/// The update card — shown above everything else in the window only while
/// there's something to say.
struct UpdateBanner: View {
    @Bindable var updater: Updater
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        switch updater.state {
        case .idle:
            EmptyView()
        case .checking:
            row(icon: nil, text: "Checking for updates…")
        case .upToDate:
            row(icon: "checkmark.circle.fill", tint: Gemba.success(scheme),
                text: "Gemba Filesend \(updater.currentVersion) is the newest version.")
        case .failed(let message):
            row(icon: "exclamationmark.triangle.fill", tint: Gemba.critical(scheme), text: message) {
                Button("OK") { updater.dismiss() }
                    .buttonStyle(SmoothButtonStyle(variant: .ghost))
            }
        case .available(let version):
            row(icon: "arrow.down.circle.fill", tint: Gemba.accent(scheme),
                text: "Version \(version) is available.") {
                Button("Restart to update") { updater.install(relaunch: true) }
                    .buttonStyle(SmoothButtonStyle(variant: .solid))
            }
        }
    }

    private func row(icon: String?, tint: Color = .secondary, text: String,
                     @ViewBuilder trailing: () -> some View = { EmptyView() }) -> some View {
        HStack(spacing: 10) {
            if let icon {
                Image(systemName: icon).foregroundStyle(tint).font(.system(size: 14, weight: .semibold))
            } else {
                MotionLoader(size: 12)
            }
            Text(text)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Gemba.textPrimary(scheme))
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 8)
            trailing()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Squircle(radius: 12).fill(Gemba.surfaceCard(scheme)))
        .overlay(Squircle(radius: 12).strokeBorder(Gemba.border(scheme), lineWidth: 1))
        .transition(.blurSlide(y: -8))
    }
}
