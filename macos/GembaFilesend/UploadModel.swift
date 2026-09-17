import Foundation
import SwiftUI
import GembaCrypto
import GembaUpload

/// Expiry presets, matching the units the web upload page offers.
enum ExpiryPreset: String, CaseIterable, Identifiable {
    case oneHour = "1 hour"
    case sixHours = "6 hours"
    case oneDay = "24 hours"
    case threeDays = "3 days"
    case sevenDays = "7 days"
    case thirtyDays = "30 days"

    var id: String { rawValue }

    var interval: TimeInterval {
        switch self {
        case .oneHour: return 3600
        case .sixHours: return 6 * 3600
        case .oneDay: return 24 * 3600
        case .threeDays: return 3 * 24 * 3600
        case .sevenDays: return 7 * 24 * 3600
        case .thirtyDays: return 30 * 24 * 3600
        }
    }
}

/// Everything the window shows, and the one place an upload is driven from.
@MainActor
@Observable
final class UploadModel {
    // Selection
    var items: [ShareItem] = []

    // Options
    var downloadLimit: Int = 1
    var expiry: ExpiryPreset = .oneDay
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
    var errorMessage: String?
    var copied = false

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

    /// The one-line form shown when the settings card is collapsed — the point
    /// of collapsing is that nothing is hidden, only compressed.
    var settingsSummary: String {
        var parts = [expiry.rawValue, downloadLimit == 1 ? "1 download" : "\(downloadLimit) downloads"]
        if usePassword { parts.append("password") }
        if useRecipients || notifyRecipients {
            let count = recipients.count
            parts.append(count == 1 ? "1 recipient" : "\(count) recipients")
        }
        // "emailed" is carried by the envelope badge next to this line instead —
        // the summary has one line and every word competes for it.
        return parts.joined(separator: " · ")
    }

    var canUpload: Bool {
        guard !isUploading, !items.isEmpty else { return false }
        if usePassword && password.isEmpty { return false }
        if (useRecipients || notifyRecipients) && recipients.isEmpty { return false }
        return true
    }

    /// Shown before the run when a file is big enough that one-shot encryption
    /// will be noticeable.
    var memoryNotice: String? {
        guard let largest = items.map(\.size).max() else { return nil }
        return FileEncryptor.memoryWarning(forBytes: largest)
    }

    func add(urls: [URL]) {
        errorMessage = nil
        for url in urls {
            var isDirectory: ObjCBool = false
            guard FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory) else { continue }
            if isDirectory.boolValue {
                errorMessage = "Folders can't be sent directly — zip \(url.lastPathComponent) first."
                continue
            }
            guard !items.contains(where: { $0.url == url }) else { continue }
            guard items.count < ShareOptions.maxFiles else {
                errorMessage = "A share holds at most \(ShareOptions.maxFiles) files."
                return
            }
            items.append(ShareItem(url: url))
        }
    }

    func remove(_ item: ShareItem) {
        items.removeAll { $0.id == item.id }
    }

    func addRecipientFromDraft() {
        let candidate = recipientDraft.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !candidate.isEmpty else { return }
        guard ShareOptions.looksLikeEmail(candidate) else {
            errorMessage = "\(candidate) doesn't look like an email address."
            return
        }
        guard recipients.count < ShareOptions.maxRecipients else {
            errorMessage = "At most \(ShareOptions.maxRecipients) recipients."
            return
        }
        if !recipients.contains(candidate) { recipients.append(candidate) }
        recipientDraft = ""
        errorMessage = nil
    }

    func reset() {
        items = []
        result = nil
        errorMessage = nil
        progress = UploadProgress(phase: .idle, fraction: 0)
        password = ""
        usePassword = false
        recipients = []
        recipientDraft = ""
        useRecipients = false
        notifyRecipients = false
        downloadLimit = 1
        copied = false
    }

    func startUpload() {
        guard canUpload else { return }
        isUploading = true
        errorMessage = nil
        result = nil
        copied = false

        let options = ShareOptions(
            downloadLimit: downloadLimit,
            expiresAt: Date().addingTimeInterval(expiry.interval),
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
                    self?.result = result
                    self?.isUploading = false
                    if let notifyError = result.notifyError {
                        self?.errorMessage = "The link is ready, but emailing it failed: \(notifyError)"
                    }
                }
            } catch {
                await MainActor.run {
                    self?.isUploading = false
                    self?.progress = UploadProgress(phase: .idle, fraction: 0)
                    self?.errorMessage = error.localizedDescription
                }
            }
        }
    }

    /// Mirrors the web app's dialog: never downgrade to plaintext silently.
    private func askAboutEncryptionFailure(name: String, error: Error) async -> EncryptionFallback {
        await withCheckedContinuation { continuation in
            let prompt = EncryptionFailurePrompt(
                fileName: name,
                message: error.localizedDescription
            ) { choice in
                continuation.resume(returning: choice)
            }
            self.encryptionFailure = prompt
        }
    }

    func answerEncryptionFailure(_ choice: EncryptionFallback) {
        let prompt = encryptionFailure
        encryptionFailure = nil
        prompt?.respond(choice)
    }

#if DEBUG
    /// Seeds a UI state from a launch argument, so every layout state can be
    /// looked at without clicking through the app:
    ///
    ///     Gemba\ Filesend.app/Contents/MacOS/Gemba\ Filesend --demo settings
    ///
    /// Values: `files`, `settings`, `full`, `result`. DEBUG only — it never
    /// exists in a Release build, and it touches nothing but this model.
    func applyDemoStateIfRequested() -> String? {
        let arguments = CommandLine.arguments
        guard let index = arguments.firstIndex(of: "--demo"), index + 1 < arguments.count else { return nil }
        let state = arguments[index + 1]

        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("gemba-demo", isDirectory: true)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let fixtures: [(String, Int)] = [
            ("Q3-board-pack.pdf", 4_812_000),
            ("customer-export.csv", 918_000),
            ("brand-assets.zip", 26_400_000),
            ("meeting-notes.md", 12_400),
            ("logo-final-v3.png", 384_000),
            ("contract-signed.pdf", 1_240_000),
        ]
        let wanted = state == "files" ? 3 : fixtures.count
        for (name, size) in fixtures.prefix(wanted) {
            let url = directory.appendingPathComponent(name)
            if !FileManager.default.fileExists(atPath: url.path) {
                try? Data(count: size).write(to: url)
            }
            items.append(ShareItem(url: url))
        }

        switch state {
        case "settings", "full":
            usePassword = true
            password = "correct-horse"
            useRecipients = true
            notifyRecipients = state == "full"
            recipients = ["alice@example.com", "bob@example.com", "carol@example.com", "dan@example.com"]
            downloadLimit = 3
            expiry = .sevenDays
        case "result":
            result = ShareResult(
                link: ShareLink(id: ShareID(), key: ShareKey(), passwordProtected: true,
                                origin: FilesendEndpoint.production.origin),
                encrypted: true,
                files: items,
                notified: false,
                notifyError: nil
            )
        default:
            break
        }
        return state
    }
#endif

    func copyLink() {
        guard let result else { return }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(result.absoluteString, forType: .string)
        copied = true
        Task {
            try? await Task.sleep(for: .seconds(2))
            await MainActor.run { self.copied = false }
        }
    }
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

import AppKit
