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

    // Options. Expiry is amount + unit, the same shape (and the same three
    // units) as the web upload page, so both clients offer the same choices.
    var downloadLimit: Int = 1
    var expiryAmount: Int = 1
    var expiryUnit: ExpiryUnit = .days
    var usePassword = false
    var password = ""
    var useRecipients = false
    var recipients: [String] = []
    var recipientDraft = ""
    var notifyRecipients = false

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

    var expiryInterval: TimeInterval { Double(expiryAmount) * expiryUnit.seconds }

    /// "1 day", "3 hours", "2 months".
    var expiryDescription: String {
        let unit = String(expiryUnit.rawValue.dropLast())
        return expiryAmount == 1 ? "1 \(unit)" : "\(expiryAmount) \(expiryUnit.rawValue)"
    }

    /// The one-line form shown when the settings card is collapsed — collapsing
    /// hides nothing, it only compresses.
    var settingsSummary: String {
        var parts = [expiryDescription, downloadLimit == 1 ? "1 download" : "\(downloadLimit) downloads"]
        if usePassword { parts.append("password") }
        if useRecipients || notifyRecipients {
            parts.append(recipients.count == 1 ? "1 recipient" : "\(recipients.count) recipients")
        }
        return parts.joined(separator: " · ")
    }

    var canUpload: Bool {
        guard !isUploading, !items.isEmpty else { return false }
        if usePassword && password.isEmpty { return false }
        if (useRecipients || notifyRecipients) && recipients.isEmpty { return false }
        return true
    }

    /// Why the send button is disabled, in words — shown under it so a greyed
    /// button never leaves anyone guessing.
    var blockedReason: String? {
        guard !isUploading else { return nil }
        if items.isEmpty { return nil }
        if usePassword && password.isEmpty { return "Enter a password, or turn the password off." }
        if (useRecipients || notifyRecipients) && recipients.isEmpty { return "Add at least one recipient." }
        return nil
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

    func addRecipientFromDraft() {
        let candidate = recipientDraft.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !candidate.isEmpty else { return }
        guard ShareOptions.looksLikeEmail(candidate) else {
            toasts.show("\(candidate) doesn't look like an email address.", kind: .error)
            return
        }
        guard recipients.count < ShareOptions.maxRecipients else {
            toasts.show("At most \(ShareOptions.maxRecipients) recipients.", kind: .error)
            return
        }
        if !recipients.contains(candidate) { withSmoothAnimation { recipients.append(candidate) } }
        recipientDraft = ""
    }

    func reset() {
        withSmoothAnimation {
            items = []
            result = nil
            progress = UploadProgress(phase: .idle, fraction: 0)
            password = ""
            usePassword = false
            recipients = []
            recipientDraft = ""
            useRecipients = false
            notifyRecipients = false
            downloadLimit = 1
            expiryAmount = 1
            expiryUnit = .days
        }
    }

    func startUpload() {
        guard canUpload else { return }
        withSmoothAnimation { isUploading = true }
        result = nil

        let options = ShareOptions(
            downloadLimit: downloadLimit,
            expiresAt: Date().addingTimeInterval(expiryInterval),
            password: usePassword ? password : nil,
            verifiedRecipients: (useRecipients || notifyRecipients) ? recipients : [],
            notifyRecipients: notifyRecipients,
            encrypt: true
        )
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
                        self.toasts.show("Emailed to \(self.recipients.count == 1 ? self.recipients[0] : "\(self.recipients.count) recipients").", kind: .success)
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
            usePassword = true
            password = "correct-horse"
            useRecipients = true
            notifyRecipients = state == "full"
            recipients = ["alice@example.com", "bob@example.com", "carol@example.com", "dan@example.com"]
            downloadLimit = 3
            expiryAmount = 7
            expiryUnit = .days
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

extension Int {
    /// Human file sizes, formatted the way the web app formats them.
    var formattedBytes: String {
        let bytes = Double(self)
        if bytes < 1024 { return "\(self) B" }
        if bytes < 1024 * 1024 { return String(format: "%.1f KB", bytes / 1024) }
        if bytes < 1024 * 1024 * 1024 { return String(format: "%.1f MB", bytes / (1024 * 1024)) }
        return String(format: "%.2f GB", bytes / (1024 * 1024 * 1024))
    }
}
