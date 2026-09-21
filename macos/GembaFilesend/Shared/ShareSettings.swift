import SwiftUI
import GembaUpload

/// The per-share settings — expiry, download limit, password, recipients — as
/// one observable value with the form that edits it.
///
/// Compiled into both the app and the Share Extension, so sharing from Finder's
/// context menu offers exactly the same choices, bounds and wording as the
/// app's window, and there is one place that turns them into `ShareOptions`.
@MainActor
@Observable
final class ShareSettings {
    var downloadLimit: Int = 1
    // Amount + unit: the same shape and the same three units as the web page.
    var expiryAmount: Int = 1
    var expiryUnit: ExpiryUnit = .days
    var usePassword = false
    var password = ""
    var useRecipients = false
    var recipients: [String] = []
    var recipientDraft = ""
    var notifyRecipients = false

    /// When set, the expiry and download limit last used are remembered under
    /// this prefix and offered again next time. Passwords and recipients are
    /// never stored.
    private let rememberKey: String?

    init(rememberKey: String? = nil) {
        self.rememberKey = rememberKey
        guard let rememberKey else { return }
        let defaults = UserDefaults.standard
        if let unit = defaults.string(forKey: "\(rememberKey).expiryUnit").flatMap(ExpiryUnit.init(rawValue:)) {
            expiryUnit = unit
            expiryAmount = min(max(1, defaults.integer(forKey: "\(rememberKey).expiryAmount")), unit.maxAmount)
        }
        let limit = defaults.integer(forKey: "\(rememberKey).downloadLimit")
        if limit > 0 { downloadLimit = min(limit, ShareOptions.maxDownloads) }
    }

    var expiryInterval: TimeInterval { Double(expiryAmount) * expiryUnit.seconds }

    /// "1 day", "3 hours", "2 months".
    var expiryDescription: String {
        let unit = String(expiryUnit.rawValue.dropLast())
        return expiryAmount == 1 ? "1 \(unit)" : "\(expiryAmount) \(expiryUnit.rawValue)"
    }

    var needsRecipients: Bool { useRecipients || notifyRecipients }

    /// The one-line form, for a collapsed card or a finished share.
    var summary: String {
        var parts = [expiryDescription, downloadLimit == 1 ? "1 download" : "\(downloadLimit) downloads"]
        if usePassword { parts.append("password") }
        if needsRecipients {
            parts.append(recipients.count == 1 ? "1 recipient" : "\(recipients.count) recipients")
        }
        return parts.joined(separator: " · ")
    }

    /// Why sending isn't possible yet, in words. `nil` when it is.
    var blockedReason: String? {
        if usePassword && password.isEmpty { return "Enter a password, or turn the password off." }
        if needsRecipients && recipients.isEmpty { return "Add at least one recipient." }
        return nil
    }

    var isComplete: Bool { blockedReason == nil }

    /// Adds the typed address. Returns a message to show when it can't.
    @discardableResult
    func addRecipientFromDraft() -> String? {
        let candidate = recipientDraft.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !candidate.isEmpty else { return nil }
        guard ShareOptions.looksLikeEmail(candidate) else {
            return "\(candidate) doesn't look like an email address."
        }
        guard recipients.count < ShareOptions.maxRecipients else {
            return "At most \(ShareOptions.maxRecipients) recipients."
        }
        if !recipients.contains(candidate) { withSmoothAnimation { recipients.append(candidate) } }
        recipientDraft = ""
        return nil
    }

    /// The options for one upload, with the expiry counted from now.
    func makeOptions() -> ShareOptions {
        ShareOptions(
            downloadLimit: downloadLimit,
            expiresAt: Date().addingTimeInterval(expiryInterval),
            password: usePassword ? password : nil,
            verifiedRecipients: needsRecipients ? recipients : [],
            notifyRecipients: notifyRecipients,
            encrypt: true
        )
    }

    /// Stores the expiry and download limit, when this instance remembers.
    func remember() {
        guard let rememberKey else { return }
        let defaults = UserDefaults.standard
        defaults.set(expiryAmount, forKey: "\(rememberKey).expiryAmount")
        defaults.set(expiryUnit.rawValue, forKey: "\(rememberKey).expiryUnit")
        defaults.set(downloadLimit, forKey: "\(rememberKey).downloadLimit")
    }

    func reset() {
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

/// Edits a `ShareSettings`. Messages it can't show itself (a mistyped address)
/// go to `onMessage`, so each host shows them its own way — a toast in both.
struct ShareSettingsForm: View {
    @Bindable var settings: ShareSettings
    var onMessage: (String) -> Void = { _ in }
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 5) {
                    fieldLabel("Expires after")
                    DurationPicker(amount: $settings.expiryAmount, unit: $settings.expiryUnit)
                }
                VStack(alignment: .leading, spacing: 5) {
                    fieldLabel("Downloads")
                    AnimatedNumberInput(label: "Downloads allowed", value: $settings.downloadLimit,
                                        range: 1...ShareOptions.maxDownloads)
                }
                Spacer(minLength: 0)
            }

            Divider().overlay(Gemba.border(scheme)).padding(.vertical, 2)

            AnimatedToggle(label: "Require a password", isOn: $settings.usePassword)
            if settings.usePassword {
                AnimatedInput(label: "Password", text: $settings.password, secure: true, systemImage: "key")
                    .transition(.blurSlide(y: -6))
            }

            AnimatedToggle(label: "Only named recipients can download", isOn: $settings.useRecipients)
            AnimatedToggle(label: "Email them the link when it's ready", isOn: $settings.notifyRecipients)

            if settings.needsRecipients {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 8) {
                        AnimatedInput(label: "Recipient email", text: $settings.recipientDraft,
                                      systemImage: "envelope") { add() }
                        Button("Add") { add() }
                            .buttonStyle(SmoothButtonStyle(variant: .soft))
                    }
                    if !settings.recipients.isEmpty {
                        AnimatedTags(tags: $settings.recipients)
                    }
                }
                .transition(.blurSlide(y: -6))
            }

            Text(helpText)
                .font(.system(size: 11))
                .foregroundStyle(Gemba.textSubtle(scheme))
                .fixedSize(horizontal: false, vertical: true)
                .id(helpText)
                .transition(.hintSwap)
        }
        .animation(reduceMotion ? nil : Motion.smooth, value: settings.usePassword)
        .animation(reduceMotion ? nil : Motion.smooth, value: settings.needsRecipients)
        .animation(reduceMotion ? nil : .easeOut(duration: 0.15), value: helpText)
    }

    private func add() {
        if let message = settings.addRecipientFromDraft() { onMessage(message) }
    }

    /// One line of help, explaining whatever is switched on right now.
    private var helpText: String {
        if settings.notifyRecipients {
            return "The emailed link contains the key, so it's as private as the recipient's inbox."
        }
        if settings.usePassword {
            return "The password is hashed on the server. It isn't in the link and doesn't decrypt anything."
        }
        if settings.useRecipients {
            return "Recipients get a one-time code by email before they can download."
        }
        return "Anyone with the link can download until it expires or runs out."
    }

    private func fieldLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 11, weight: .medium))
            .foregroundStyle(Gemba.textSubdued(scheme))
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
