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
        let items = urls.map { ShareItem(url: $0) }
        state = .working("Preparing…", 0)
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
    @Bindable var model: ShareExtensionModel
    let onClose: () -> Void
    let onCancel: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Gemba.Space.x5) {
            HStack(spacing: Gemba.Space.x3) {
                RoundedRectangle(cornerRadius: 6)
                    .fill(Gemba.yellow)
                    .frame(width: 22, height: 22)
                    .overlay(Image(systemName: "lock.fill").font(.system(size: 11, weight: .bold)).foregroundStyle(Gemba.ink900))
                Text("Gemba Filesend")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Gemba.textPrimary(scheme))
                Spacer()
            }

            switch model.state {
            case .loading:
                ProgressView().controlSize(.small)
                Text("Reading the files…")
                    .font(.system(size: 12))
                    .foregroundStyle(Gemba.textSubdued(scheme))

            case .working(let label, let fraction):
                Text(label)
                    .font(.system(size: 12))
                    .foregroundStyle(Gemba.textPrimary(scheme))
                ProgressView(value: min(max(fraction, 0), 1))
                    .tint(Gemba.accent(scheme))

            case .done(let result):
                Label("Link copied to the clipboard", systemImage: "checkmark.circle.fill")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Gemba.success(scheme))
                Text(result.absoluteString)
                    .font(.system(size: 10, design: .monospaced))
                    .textSelection(.enabled)
                    .lineLimit(3)
                    .padding(Gemba.Space.x3)
                    .background(RoundedRectangle(cornerRadius: Gemba.Radius.sm).fill(Gemba.surfaceSubdued(scheme)))
                Text("Expires in 24 hours · 1 download · encrypted")
                    .font(.system(size: 11))
                    .foregroundStyle(Gemba.textSubtle(scheme))

            case .failed(let message):
                Label(message, systemImage: "exclamationmark.triangle.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(Gemba.critical(scheme))
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer()

            HStack {
                Spacer()
                switch model.state {
                case .done:
                    Button("Done") { onClose() }
                        .buttonStyle(GembaPrimaryButtonStyle())
                        .frame(width: 100)
                case .failed:
                    Button("Close") { onCancel() }
                        .buttonStyle(GembaSecondaryButtonStyle())
                default:
                    Button("Cancel") { onCancel() }
                        .buttonStyle(GembaSecondaryButtonStyle())
                }
            }
        }
        .padding(Gemba.Space.x6)
        .frame(width: 420, height: 320)
        .background(Gemba.surfacePage(scheme))
    }
}
