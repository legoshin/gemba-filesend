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
        hosting.frame = NSRect(x: 0, y: 0, width: 420, height: 320)
        view = hosting
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
        await model.start(urls: urls)
    }

    private nonisolated func loadFileURL(_ boxed: UncheckedSendable<NSItemProvider>) async -> URL? {
        await boxed.value.loadFileURLValue()
    }

    private func finish() {
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }

    private func cancel() {
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

/// Deliberately few choices: the Share sheet is a quick path, so it uses the
/// same defaults as the app's first run (24 hours, one download, encrypted) and
/// leaves passwords and recipients to the main window.
@MainActor
@Observable
final class ShareExtensionModel {
    enum State {
        case loading
        case working(String, Double)
        case done(ShareResult)
        case failed(String)
    }

    var state: State = .loading
    var copied = false

    private let uploader = ShareUploader()

    func start(urls: [URL]) async {
        guard !urls.isEmpty else {
            state = .failed("Nothing to send — no files were passed in.")
            return
        }
        // The share grants this sandboxed extension access to exactly what was
        // shared. For a folder that access has to cover everything inside it
        // while it is zipped, so hold it explicitly for the whole upload rather
        // than relying on the implicit grant lasting long enough.
        let scoped = urls.filter { $0.startAccessingSecurityScopedResource() }
        defer { scoped.forEach { $0.stopAccessingSecurityScopedResource() } }

        let items = urls.map { ShareItem(url: $0) }
        state = .working(items.contains(where: \.isFolder) ? "Compressing…" : "Preparing…", 0)
        do {
            let result = try await uploader.upload(
                items: items,
                options: ShareOptions(),
                onProgress: { [weak self] progress in
                    Task { @MainActor in self?.state = .working(progress.phase.label, progress.fraction) }
                }
            )
            state = .done(result)
            copyLink(result.absoluteString)
        } catch {
            state = .failed(error.localizedDescription)
        }
    }

    func copyLink(_ link: String) {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(link, forType: .string)
        copied = true
    }
}

struct ShareExtensionView: View {
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Bindable var model: ShareExtensionModel
    let onClose: () -> Void
    let onCancel: () -> Void

    private var stateKey: Int {
        switch model.state { case .loading: 0; case .working: 1; case .done: 2; case .failed: 3 }
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
                Spacer()
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
                    .transition(.swapPanel)

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

                case .done(let result):
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
                        Text(summary(result))
                            .font(.system(size: 11))
                            .foregroundStyle(Gemba.textSubtle(scheme))
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
                    .background(Squircle(radius: 12).fill(Gemba.criticalSubdued(scheme)))
                    .transition(.swapPanel)
                }
            }
            .animation(reduceMotion ? nil : Motion.smooth, value: stateKey)

            Spacer(minLength: 0)

            HStack(spacing: 8) {
                Spacer()
                switch model.state {
                case .done(let result):
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
        .padding(22)
        .frame(width: 420, height: 300)
        .background(Gemba.surfacePage(scheme))
    }

    private func summary(_ result: ShareResult) -> String {
        let folders = result.files.filter(\.isFolder).count
        let what = result.files.count == 1
            ? (folders == 1 ? "1 folder, zipped" : "1 file")
            : "\(result.files.count) items" + (folders > 0 ? ", \(folders) zipped" : "")
        return "\(what) · expires in 1 day · 1 download · encrypted"
    }
}
