import Cocoa
import SwiftUI
import UniformTypeIdentifiers
import GembaCrypto
import GembaUpload

/// The Finder / Share-menu entry point.
///
/// This extension does the whole job itself — encrypt, upload, finalize, link —
/// rather than handing the files to the main app. That keeps the flow to one
/// step for the user, and it avoids an App Group container, which needs a real
/// provisioning profile to work. `GembaCrypto` and `GembaUpload` are linked into
/// both targets, so there is exactly one implementation of the wire format.
final class ShareViewController: NSViewController {
    private var model = ShareExtensionModel()

    override func loadView() {
        let hosting = NSHostingView(
            rootView: ShareExtensionView(
                model: model,
                onClose: { [weak self] in self?.finish() },
                onCancel: { [weak self] in self?.cancel() }
            )
        )
        hosting.frame = NSRect(x: 0, y: 0, width: ShareExtensionView.width, height: ShareExtensionView.height)
        view = hosting
        preferredContentSize = hosting.frame.size
    }

    override func viewDidAppear() {
        super.viewDidAppear()
        Task { await loadAttachments() }
    }

    private func loadAttachments() async {
        guard let inputItems = extensionContext?.inputItems as? [NSExtensionItem] else { return }
        var urls: [URL] = []
        for item in inputItems {
            for provider in item.attachments ?? [] {
                guard provider.hasItemConformingToTypeIdentifier(UTType.fileURL.identifier) else { continue }
                // NSItemProvider isn't Sendable, and this view controller is
                // main-actor isolated, so the provider is boxed to cross the
                // await. Only this one call ever touches it.
                if let url = await loadFileURL(UncheckedSendable(provider)) { urls.append(url) }
            }
        }
        model.load(urls: urls)
    }

    private nonisolated func loadFileURL(_ boxed: UncheckedSendable<NSItemProvider>) async -> URL? {
        await boxed.value.loadFileURLValue()
    }

    private func finish() {
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }

    private func cancel() {
        model.cancelUpload()
        extensionContext?.cancelRequest(withError: NSError(domain: "uk.gemba.filesend", code: NSUserCancelledError))
    }
}

/// Carries a value the compiler cannot prove Sendable across one hop, where the
/// surrounding code guarantees single ownership.
struct UncheckedSendable<Value>: @unchecked Sendable {
    let value: Value
    init(_ value: Value) { self.value = value }
}

extension NSItemProvider {
    func loadFileURLValue() async -> URL? {
        await withCheckedContinuation { continuation in
            loadItem(forTypeIdentifier: UTType.fileURL.identifier, options: nil) { value, _ in
                if let url = value as? URL {
                    continuation.resume(returning: url)
                } else if let data = value as? Data,
                          let url = URL(dataRepresentation: data, relativeTo: nil) {
                    continuation.resume(returning: url)
                } else {
                    continuation.resume(returning: nil)
                }
            }
        }
    }
}

/// Sharing from Finder's context menu: the shared items, then the same share
/// settings the app's window offers (expiry, download limit, password,
/// recipients, email), then the upload. Expiry and download limit are
/// remembered for next time; passwords and recipients never are.
@MainActor
@Observable
final class ShareExtensionModel {
    enum State {
        case loading
        case review
        case working(String, Double)
        case done(ShareResult, summary: String)
        case failed(String)
    }

    var state: State = .loading
    var items: [ShareItem] = []
    let settings = ShareSettings(rememberKey: "shareExtension")
    let toasts = ToastCenter()

    private let uploader = ShareUploader()
    private var urls: [URL] = []
    private var uploadTask: Task<Void, Never>?

    var totalBytes: Int { items.reduce(0) { $0 + $1.size } }

    var canSend: Bool {
        guard case .review = state else { return false }
        return !items.isEmpty && settings.isComplete
    }

    var sendLabel: String {
        switch items.count {
        case 1: return items[0].isFolder ? "Zip, encrypt and send" : "Encrypt and send"
        default: return "Encrypt and send \(items.count) items"
        }
    }

    func load(urls: [URL]) {
        guard !urls.isEmpty else {
            state = .failed("Nothing to send — no files were passed in.")
            return
        }
        guard urls.count <= ShareOptions.maxFiles else {
            state = .failed("A share holds at most \(ShareOptions.maxFiles) items — \(urls.count) were selected.")
            return
        }
        self.urls = urls
        // Reading sizes (and counting a folder's files) needs the access the
        // share granted; take it for this, and again for the upload.
        let scoped = urls.filter { $0.startAccessingSecurityScopedResource() }
        defer { scoped.forEach { $0.stopAccessingSecurityScopedResource() } }
        items = urls.map { ShareItem(url: $0) }
        state = .review
    }

    func send() {
        guard canSend else {
            if let reason = settings.blockedReason { toasts.show(reason, kind: .error) }
            return
        }
        let options = settings.makeOptions()
        let summary = settings.summary
        settings.remember()
        let items = self.items
        let urls = self.urls
        let uploader = self.uploader
        state = .working(items.contains(where: \.isFolder) ? "Compressing…" : "Preparing…", 0)

        uploadTask = Task { [weak self] in
            // The share grants this sandboxed extension access to exactly what
            // was shared. For a folder that access has to cover everything
            // inside it while it is zipped, so hold it for the whole upload.
            let scoped = urls.filter { $0.startAccessingSecurityScopedResource() }
            defer { scoped.forEach { $0.stopAccessingSecurityScopedResource() } }
            do {
                let result = try await uploader.upload(
                    items: items,
                    options: options,
                    onProgress: { [weak self] progress in
                        Task { @MainActor in
                            guard let self, case .working = self.state else { return }
                            self.state = .working(progress.phase.label, progress.fraction)
                        }
                    }
                )
                guard let self else { return }
                self.state = .done(result, summary: summary)
                self.copyLink(result.absoluteString)
                if let notifyError = result.notifyError {
                    self.toasts.show("The link is ready, but emailing it failed: \(notifyError)", kind: .error)
                }
            } catch is CancellationError {
                return
            } catch {
                self?.state = .failed(error.localizedDescription)
            }
        }
    }

    func cancelUpload() {
        uploadTask?.cancel()
        uploadTask = nil
    }

    func copyLink(_ link: String) {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(link, forType: .string)
    }
}

struct ShareExtensionView: View {
    static let width: CGFloat = 520
    /// The Share sheet takes its size once, when it opens, and doesn't follow
    /// later changes (verified: resizing it afterwards leaves the content
    /// clipped or detached). So the sheet has one fixed size, tall enough for
    /// the settings as they open — and if more options are expanded than
    /// fit, the settings scroll inside their card while the header, with the
    /// Send button, stays put.
    static let height: CGFloat = 460

    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Bindable var model: ShareExtensionModel
    let onClose: () -> Void
    let onCancel: () -> Void

    private var stateKey: Int {
        switch model.state { case .loading: 0; case .review: 1; case .working: 2; case .done: 3; case .failed: 4 }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 10) {
                SpringScaleIn {
                    Squircle(radius: 7)
                        .fill(Gemba.yellow)
                        .frame(width: 24, height: 24)
                        .overlay(Image(systemName: "lock.fill")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(Gemba.ink900))
                }
                ShimmerSweep(text: "Gemba Filesend", font: .system(size: 14, weight: .semibold))
                    .foregroundStyle(Gemba.textPrimary(scheme))
                Spacer(minLength: 12)
                // The actions live in the header, not under the form: the
                // Share sheet's host draws its own bar over the top of this
                // view and doesn't always grow the sheet to the full content
                // height, so the bottom is the one place that can be cut off.
                buttons
            }

            ZStack(alignment: .topLeading) {
                switch model.state {
                case .loading:
                    // SmoothUI skeleton: placeholders while the shared items load.
                    VStack(alignment: .leading, spacing: 10) {
                        SkeletonBar(width: 220, height: 12)
                        SkeletonBar(width: 300, height: 8)
                        SkeletonBar(width: 180, height: 8)
                    }
                    .frame(height: 150, alignment: .topLeading)
                    .transition(.swapPanel)

                case .review:
                    review.transition(.swapPanel)

                case .working(let label, let fraction):
                    VStack(alignment: .leading, spacing: 12) {
                        HStack(spacing: 8) {
                            MotionLoader(size: 13)
                            TextMorph(text: label, font: .system(size: 12, weight: .medium))
                                .foregroundStyle(Gemba.textPrimary(scheme))
                                .lineLimit(1)
                            Spacer(minLength: 8)
                            NumberFlow(value: (fraction * 100).rounded()) { "\(Int($0))%" }
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(Gemba.textSubdued(scheme))
                        }
                        SmoothProgressBar(value: fraction)
                    }
                    .padding(14)
                    .background(Squircle(radius: 14).fill(Gemba.surfaceCard(scheme)))
                    .overlay(Squircle(radius: 14).strokeBorder(Gemba.border(scheme), lineWidth: 1))
                    .overlay { BorderBeam(radius: 14) }
                    .transition(.swapPanel)

                case .done(let result, let summary):
                    VStack(alignment: .leading, spacing: 12) {
                        HStack(spacing: 8) {
                            SpringScaleIn(delay: 0.05) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(Gemba.success(scheme))
                            }
                            SoftBlurIn(text: "Link copied to the clipboard", font: .system(size: 13, weight: .semibold))
                                .foregroundStyle(Gemba.textPrimary(scheme))
                        }
                        ScrambleText(text: result.absoluteString, font: .system(size: 10, design: .monospaced))
                            .foregroundStyle(Gemba.textPrimary(scheme))
                            .textSelection(.enabled)
                            .lineLimit(3)
                            .padding(10)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Squircle(radius: 9).fill(Gemba.surfaceSubdued(scheme)))
                        Text(doneSummary(result, settings: summary))
                            .font(.system(size: 11))
                            .foregroundStyle(Gemba.textSubtle(scheme))
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .transition(.swapPanel)

                case .failed(let message):
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(Gemba.critical(scheme))
                        Text(message)
                            .font(.system(size: 12))
                            .foregroundStyle(Gemba.textPrimary(scheme))
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Squircle(radius: 12).fill(Gemba.criticalSubdued(scheme)))
                    .transition(.swapPanel)
                }
            }
            .animation(reduceMotion ? nil : Motion.smooth, value: stateKey)
        }
        .padding(20)
        .frame(width: Self.width, height: Self.height, alignment: .top)
        .background(Gemba.surfacePage(scheme))
        .overlay { ToastStack(center: model.toasts) }
    }

    // MARK: Review — what's being sent, and how

    private var review: some View {
        VStack(alignment: .leading, spacing: 12) {
            itemsCard
            // The card is as tall as the form while it fits; past that it
            // takes the remaining height and scrolls inside.
            ViewThatFits(in: .vertical) {
                settingsForm
                ScrollView(.vertical) { settingsForm }
                    .scrollBounceBehavior(.basedOnSize)
                    .scrollIndicators(.visible)
            }
            .background(Squircle(radius: 14).fill(Gemba.surfaceCard(scheme)))
            .overlay(Squircle(radius: 14).strokeBorder(Gemba.border(scheme), lineWidth: 1))
            .clipShape(Squircle(radius: 14))
            if let reason = model.settings.blockedReason {
                Text(reason)
                    .font(.system(size: 11))
                    .foregroundStyle(Gemba.textSubdued(scheme))
                    .transition(.hintSwap)
            }
        }
        .animation(reduceMotion ? nil : Motion.smooth, value: model.settings.blockedReason)
    }

    private var settingsForm: some View {
        ShareSettingsForm(settings: model.settings) { model.toasts.show($0, kind: .error) }
            .padding(14)
    }

    private var itemsCard: some View {
        HStack(spacing: 10) {
            Group {
                if model.items.count == 1, model.items[0].isFolder {
                    FolderReveal(size: 18)
                } else {
                    Image(systemName: model.items.count > 1 ? "doc.on.doc" : "doc")
                        .font(.system(size: 15))
                        .foregroundStyle(Gemba.textSubtle(scheme))
                }
            }
            .frame(width: 24)
            VStack(alignment: .leading, spacing: 2) {
                Text(itemsTitle)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Gemba.textPrimary(scheme))
                    .lineLimit(1)
                    .truncationMode(.middle)
                Text(itemsDetail)
                    .font(.system(size: 11))
                    .foregroundStyle(Gemba.textSubtle(scheme))
                    .lineLimit(1)
                    .truncationMode(.middle)
            }
            Spacer(minLength: 8)
            Text(model.totalBytes.formattedBytes)
                .font(.system(size: 11).monospacedDigit())
                .foregroundStyle(Gemba.textSubdued(scheme))
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Squircle(radius: 12).fill(Gemba.surfaceSubdued(scheme)))
    }

    private var itemsTitle: String {
        model.items.count == 1 ? model.items[0].displayName : "\(model.items.count) items"
    }

    private var itemsDetail: String {
        let folders = model.items.filter(\.isFolder)
        if model.items.count == 1 {
            guard let folder = folders.first else { return "One link, one key." }
            return "\(folder.fileCount) \(folder.fileCount == 1 ? "file" : "files") · zipped as \(folder.name)"
        }
        let names = model.items.prefix(3).map(\.displayName).joined(separator: ", ")
            + (model.items.count > 3 ? "…" : "")
        return folders.isEmpty ? names : "\(names) · \(folders.count) zipped"
    }

    // MARK: Buttons

    private var buttons: some View {
        HStack(spacing: 8) {
            switch model.state {
            case .review:
                Button("Cancel") { onCancel() }
                    .buttonStyle(SmoothButtonStyle(variant: .ghost))
                    .keyboardShortcut(.cancelAction)
                Button { model.send() } label: {
                    Label("Send", systemImage: "paperplane.fill")
                }
                .help(model.sendLabel)
                .buttonStyle(SmoothButtonStyle(variant: .solid))
                .disabled(!model.canSend)
                .keyboardShortcut(.return, modifiers: .command)
            case .done(let result, _):
                ButtonCopy(text: result.absoluteString, label: "Copy again")
                Button("Done") { onClose() }
                    .buttonStyle(SmoothButtonStyle(variant: .solid))
                    .keyboardShortcut(.defaultAction)
            case .failed:
                Button("Close") { onCancel() }
                    .buttonStyle(SmoothButtonStyle(variant: .soft))
            default:
                Button("Cancel") { onCancel() }
                    .buttonStyle(SmoothButtonStyle(variant: .ghost))
                    .keyboardShortcut(.cancelAction)
            }
        }
    }

    private func doneSummary(_ result: ShareResult, settings: String) -> String {
        let folders = result.files.filter(\.isFolder).count
        let what = result.files.count == 1
            ? (folders == 1 ? "1 folder, zipped" : "1 file")
            : "\(result.files.count) items" + (folders > 0 ? ", \(folders) zipped" : "")
        var parts = [what, settings]
        if result.notified { parts.append("emailed") }
        parts.append(result.encrypted ? "encrypted" : "not encrypted")
        return parts.joined(separator: " · ")
    }
}
