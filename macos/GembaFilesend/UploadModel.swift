import Foundation
import SwiftUI
import AppKit
import GembaCrypto
import GembaUpload

/// Everything the window shows, and the one place an upload is driven from.
@MainActor
@Observable
final class UploadModel {
    // Selection — files and folders.
    var items: [ShareItem] = []

    // Options — the same model and form the Share Extension uses.
    let settings = ShareSettings()

    // Run state
    var progress = UploadProgress(phase: .idle, fraction: 0)
    var isUploading = false
    var result: ShareResult?

    /// Every transient message — errors, warnings, confirmations — goes here and
    /// appears as a toast, so nothing pushes the layout around.
    let toasts = ToastCenter()

    /// Set when encryption fails mid-run; the view shows the same three-way
    /// choice the web app shows and resumes the upload with the answer.
    var encryptionFailure: EncryptionFailurePrompt?

    struct EncryptionFailurePrompt: Identifiable {
        let id = UUID()
        let fileName: String
        let message: String
        let respond: @Sendable (EncryptionFallback) -> Void
    }

    private let endpoint: FilesendEndpoint
    private let uploader: ShareUploader

    init(endpoint: FilesendEndpoint = .production) {
        self.endpoint = endpoint
        self.uploader = ShareUploader(endpoint: endpoint)
    }

    var totalBytes: Int { items.reduce(0) { $0 + $1.size } }
    var folderCount: Int { items.filter(\.isFolder).count }

    var canUpload: Bool {
        !isUploading && !items.isEmpty && settings.isComplete
    }

    /// Why the send button is disabled, in words — shown under it so a greyed
    /// button never leaves anyone guessing.
    var blockedReason: String? {
        guard !isUploading else { return nil }
        if items.isEmpty { return nil }
        return settings.blockedReason
    }

    var memoryNotice: String? {
        guard let largest = items.map(\.size).max() else { return nil }
        return FileEncryptor.memoryWarning(forBytes: largest)
    }

    var sendLabel: String {
        // The progress card carries the detail; the button just says it's busy.
        if isUploading { return "Sending…" }
        switch items.count {
        case 0: return "Add something to send"
        case 1: return items[0].isFolder ? "Zip, encrypt and send" : "Encrypt and send"
        default: return "Encrypt and send \(items.count) items"
        }
    }

    func add(urls: [URL]) {
        for url in urls {
            // Folders are welcome: the uploader zips each one into a temporary
            // file just before sending and deletes it afterwards.
            guard FileManager.default.fileExists(atPath: url.path) else { continue }
            guard !items.contains(where: { $0.url == url }) else { continue }
            guard items.count < ShareOptions.maxFiles else {
                toasts.show("A share holds at most \(ShareOptions.maxFiles) items.", kind: .error)
                return
            }
            let item = ShareItem(url: url)
            if item.isFolder && item.fileCount == 0 {
                toasts.show("\(item.displayName) is empty — added anyway, it will arrive as an empty zip.", kind: .info)
            }
            withSmoothAnimation { items.append(item) }
        }
    }

    func remove(_ item: ShareItem) {
        withSmoothAnimation { items.removeAll { $0.id == item.id } }
    }

    func clearItems() {
        withSmoothAnimation { items.removeAll() }
    }

    func reset() {
        withSmoothAnimation {
            items = []
            result = nil
            progress = UploadProgress(phase: .idle, fraction: 0)
            settings.reset()
        }
    }

    func startUpload() {
        guard canUpload else { return }
        withSmoothAnimation { isUploading = true }
        result = nil

        let options = settings.makeOptions()
        let items = self.items
        let uploader = self.uploader

        Task { [weak self] in
            do {
                let result = try await uploader.upload(
                    items: items,
                    options: options,
                    onProgress: { [weak self] progress in
                        Task { @MainActor in self?.progress = progress }
                    },
                    onEncryptionFailure: { [weak self] name, error in
                        await self?.askAboutEncryptionFailure(name: name, error: error) ?? .cancel
                    }
                )
                await MainActor.run {
                    guard let self else { return }
                    withSmoothAnimation {
                        self.result = result
                        self.isUploading = false
                    }
                    if result.notified {
                        let recipients = options.verifiedRecipients
                        self.toasts.show("Emailed to \(recipients.count == 1 ? recipients[0] : "\(recipients.count) recipients").", kind: .success)
                    }
                    if let notifyError = result.notifyError {
                        self.toasts.show("The link is ready, but emailing it failed: \(notifyError)", kind: .error)
                    }
                }
            } catch {
                await MainActor.run {
                    guard let self else { return }
                    withSmoothAnimation {
                        self.isUploading = false
                        self.progress = UploadProgress(phase: .idle, fraction: 0)
                    }
                    self.toasts.show(error.localizedDescription, kind: .error)
                }
            }
        }
    }

    /// Mirrors the web app's dialog: never downgrade to plaintext silently.
    private func askAboutEncryptionFailure(name: String, error: Error) async -> EncryptionFallback {
        await withCheckedContinuation { continuation in
            let prompt = EncryptionFailurePrompt(fileName: name, message: error.localizedDescription) { choice in
                continuation.resume(returning: choice)
            }
            withSmoothAnimation { self.encryptionFailure = prompt }
        }
    }

    func answerEncryptionFailure(_ choice: EncryptionFallback) {
        let prompt = encryptionFailure
        withSmoothAnimation { encryptionFailure = nil }
        prompt?.respond(choice)
    }

#if DEBUG
    /// Seeds a UI state from a launch argument, so every layout state can be
    /// looked at without clicking through the app:
    ///
    ///     Gemba\ Filesend.app/Contents/MacOS/Gemba\ Filesend --demo settings
    ///
    /// Values: `files`, `settings`, `full`, `uploading`, `result`, `modal`.
    /// DEBUG only — it never exists in a Release build.
    func applyDemoStateIfRequested() -> String? {
        let arguments = CommandLine.arguments
        guard let index = arguments.firstIndex(of: "--demo"), index + 1 < arguments.count else { return nil }
        let state = arguments[index + 1]

        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("gemba-demo", isDirectory: true)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let fixtures: [(String, Int)] = [
            ("Q3-board-pack.pdf", 4_812_000),
            ("customer-export.csv", 918_000),
            ("meeting-notes.md", 12_400),
            ("logo-final-v3.png", 384_000),
            ("contract-signed.pdf", 1_240_000),
        ]
        let folder = directory.appendingPathComponent("Brand Assets", isDirectory: true)
        try? FileManager.default.createDirectory(at: folder.appendingPathComponent("logos"), withIntermediateDirectories: true)
        for (name, size) in [("logos/mark.svg", 42_000), ("logos/wordmark.svg", 51_000), ("guidelines.pdf", 8_300_000)] {
            let url = folder.appendingPathComponent(name)
            if !FileManager.default.fileExists(atPath: url.path) { try? Data(count: size).write(to: url) }
        }
        for (name, size) in fixtures {
            let url = directory.appendingPathComponent(name)
            if !FileManager.default.fileExists(atPath: url.path) { try? Data(count: size).write(to: url) }
        }

        items.append(ShareItem(url: folder))
        for (name, _) in fixtures.prefix(state == "files" ? 2 : fixtures.count) {
            items.append(ShareItem(url: directory.appendingPathComponent(name)))
        }

        switch state {
        case "settings", "full":
            settings.usePassword = true
            settings.password = "correct-horse"
            settings.useRecipients = true
            settings.notifyRecipients = state == "full"
            settings.recipients = ["alice@example.com", "bob@example.com", "carol@example.com", "dan@example.com"]
            settings.downloadLimit = 3
            settings.expiryAmount = 7
            settings.expiryUnit = .days
        case "uploading":
            isUploading = true
            progress = UploadProgress(phase: .uploading(file: "Brand Assets.zip", index: 0, of: items.count), fraction: 0.62)
        case "result":
            result = ShareResult(
                link: ShareLink(id: ShareID(), key: ShareKey(), passwordProtected: true,
                                origin: FilesendEndpoint.production.origin),
                encrypted: true, files: items, notified: false, notifyError: nil)
        case "modal":
            encryptionFailure = EncryptionFailurePrompt(
                fileName: "Q3-board-pack.pdf",
                message: "Encryption failed: could not read Q3-board-pack.pdf") { _ in }
        default:
            break
        }
        if state == "files" {
            toasts.show("Brand Assets will be zipped before it's encrypted.", kind: .info, seconds: 60)
        }
        return state
    }
#endif
}
