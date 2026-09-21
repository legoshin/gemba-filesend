import SwiftUI
import AppKit
import GembaUpload

/// The single window, built from the SmoothUI kit (see SmoothUI/).
///
/// Layout rule, unchanged from before the redesign: **the window never
/// scrolls.** It sizes to its content, at most one accordion is open, and the
/// two lists that can grow (files, recipients) are bounded. Transient messages
/// are toasts and the one blocking question is a modal — both overlays, so
/// neither changes the window's height.
struct ContentView: View {
    @State private var model = UploadModel()
    @State private var expanded: Panel?
    @AppStorage("themeChoice") private var themeRaw = ThemeChoice.system.rawValue
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    enum Panel { case files, settings }

    private func binding(for panel: Panel) -> Binding<Bool> {
        Binding(
            get: { expanded == panel },
            set: { expanded = $0 ? panel : nil }
        )
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            header

            UpdateBanner(updater: Updater.shared)

            ZStack {
                if let result = model.result {
                    ResultView(result: result, model: model)
                        .transition(.swapPanel)
                } else {
                    compose.transition(.swapPanel)
                }
            }
            .animation(reduceMotion ? nil : Motion.smooth, value: model.result != nil)
        }
        .padding(20)
        .frame(width: 520, alignment: .top)
        .background(Gemba.surfacePage(scheme))
        .overlay { ToastStack(center: model.toasts) }
        .overlay {
            SmoothModal(isPresented: Binding(
                get: { model.encryptionFailure != nil },
                set: { if !$0 { model.answerEncryptionFailure(.cancel) } }
            )) {
                if let prompt = model.encryptionFailure { EncryptionFallback(prompt: prompt, model: model) }
            }
        }
        .preferredColorScheme((ThemeChoice(rawValue: themeRaw) ?? .system).colorScheme)
        .onChange(of: model.items.count) { previous, current in
            // First item lands: show it — but never yank an open settings panel.
            if previous == 0 && current > 0 && expanded == nil {
                withAnimation(reduceMotion ? nil : Motion.accordion) { expanded = .files }
            } else if current == 0 && expanded == .files {
                withAnimation(reduceMotion ? nil : Motion.accordion) { expanded = nil }
            }
        }
        .onChange(of: model.isUploading) { _, uploading in
            // Collapse while working so progress never competes for height.
            if uploading { withAnimation(reduceMotion ? nil : Motion.accordion) { expanded = nil } }
        }
        .onAppear {
            #if DEBUG
            // `--theme light|dark|system`, for checking every state in both looks.
            if let i = CommandLine.arguments.firstIndex(of: "--theme"), i + 1 < CommandLine.arguments.count,
               let theme = ThemeChoice(rawValue: CommandLine.arguments[i + 1]) {
                themeRaw = theme.rawValue
            }
            if let state = model.applyDemoStateIfRequested() {
                expanded = (state == "settings" || state == "full") ? .settings
                    : (state == "uploading" || state == "result" ? nil : .files)
            }
            #endif
        }
    }

    // MARK: Header

    private var header: some View {
        HStack(spacing: 12) {
            SpringScaleIn {
                Squircle(radius: 9)
                    .fill(Gemba.yellow)
                    .frame(width: 32, height: 32)
                    .overlay(Image(systemName: "lock.fill")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Gemba.ink900))
            }
            VStack(alignment: .leading, spacing: 2) {
                ShimmerSweep(text: "Gemba Filesend", font: .system(size: 17, weight: .semibold))
                    .foregroundStyle(Gemba.textPrimary(scheme))
                ShimmerSweep(text: "Encrypted on this Mac. One link — the key never leaves it.",
                             font: .system(size: 12), delay: 0.08)
                    .foregroundStyle(Gemba.textSubdued(scheme))
            }
            Spacer(minLength: 0)
            ThemeToggle()
        }
    }

    // MARK: Compose

    private var compose: some View {
        VStack(alignment: .leading, spacing: 12) {
            AnimatedFileUpload(compact: !model.items.isEmpty) { urls in model.add(urls: urls) }
                .disabled(model.isUploading)

            if !model.items.isEmpty {
                SmoothAccordion(isExpanded: binding(for: .files)) {
                    HStack(spacing: 8) {
                        Text("Files")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Gemba.textPrimary(scheme))
                        NotificationBadge(count: model.items.count)
                        Spacer(minLength: 8)
                        NumberFlow(value: Double(model.totalBytes)) { Int($0).formattedBytes }
                            .font(.system(size: 12))
                            .foregroundStyle(Gemba.textSubdued(scheme))
                    }
                } content: {
                    FileList(model: model)
                }
                .transition(.blurSlide(y: 8))
            }

            SmoothAccordion(isExpanded: binding(for: .settings)) {
                HStack(spacing: 8) {
                    Text("Share settings")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Gemba.textPrimary(scheme))
                    Spacer(minLength: 8)
                    Text(model.settings.summary)
                        .font(.system(size: 12))
                        .foregroundStyle(Gemba.textSubdued(scheme))
                        .lineLimit(1)
                        .contentTransition(reduceMotion ? .identity : .interpolate)
                        .animation(reduceMotion ? nil : Motion.smooth, value: model.settings.summary)
                    if model.settings.notifyRecipients {
                        Image(systemName: "envelope")
                            .font(.system(size: 10))
                            .foregroundStyle(Gemba.textSubdued(scheme))
                            .transition(.blurSlide(scale: 0.5))
                    }
                }
            } content: {
                ShareSettingsForm(settings: model.settings) { model.toasts.show($0, kind: .error) }
            }
            .disabled(model.isUploading)

            if model.isUploading {
                ProgressCard(model: model).transition(.blurSlide(y: 8))
            }

            VStack(alignment: .leading, spacing: 6) {
                Button { model.startUpload() } label: {
                    TextMorph(text: model.sendLabel)
                }
                .buttonStyle(SmoothButtonStyle(variant: .solid, fullWidth: true))
                .disabled(!model.canUpload)
                .keyboardShortcut(.return, modifiers: .command)

                if let reason = model.blockedReason ?? (model.isUploading ? nil : model.memoryNotice) {
                    Text(reason)
                        .font(.system(size: 11))
                        .foregroundStyle(model.blockedReason != nil ? Gemba.textSubdued(scheme) : Gemba.warning(scheme))
                        .fixedSize(horizontal: false, vertical: true)
                        .transition(.hintSwap)
                }
            }
            .animation(reduceMotion ? nil : Motion.smooth, value: model.blockedReason)
        }
        .animation(reduceMotion ? nil : Motion.smooth, value: model.items.isEmpty)
        .animation(reduceMotion ? nil : Motion.smooth, value: model.isUploading)
    }
}

// MARK: - File list

/// Five rows show without scrolling; past that (a share holds up to 25) the
/// list scrolls inside its own fixed height — the only scrolling anywhere, and
/// it is inside an obvious list rather than on the window.
private struct FileList: View {
    @Bindable var model: UploadModel
    @Environment(\.colorScheme) private var scheme
    private let rowHeight: CGFloat = 38
    private let maxVisible = 5

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ScrollView(.vertical) {
                VStack(spacing: 0) {
                    ForEach(model.items) { item in
                        FileRow(item: item) { model.remove(item) }
                            .frame(height: rowHeight)
                            .transition(.fileRow)
                    }
                }
            }
            .frame(height: CGFloat(min(model.items.count, maxVisible)) * rowHeight)
            .scrollDisabled(model.items.count <= maxVisible)
            .scrollIndicators(model.items.count > maxVisible ? .automatic : .hidden)

            HStack {
                Text(model.items.count > 1
                     ? "All \(model.items.count) items share one link and one key."
                     : (model.items.first?.isFolder == true ? "Zipped just before sending; the zip is deleted after." : "One link, one key."))
                    .font(.system(size: 11))
                    .foregroundStyle(Gemba.textSubtle(scheme))
                Spacer(minLength: 0)
                Button("Clear") { model.clearItems() }
                    .buttonStyle(SmoothButtonStyle(variant: .ghost))
            }
        }
    }
}

private struct FileRow: View {
    let item: ShareItem
    let onRemove: () -> Void
    @State private var hoveringRemove = false
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        HStack(spacing: 10) {
            Group {
                if item.isFolder {
                    FolderReveal(size: 16)
                } else {
                    Image(systemName: "doc")
                        .font(.system(size: 13))
                        .foregroundStyle(Gemba.textSubtle(scheme))
                }
            }
            .frame(width: 22)

            VStack(alignment: .leading, spacing: 1) {
                Text(item.displayName)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Gemba.textPrimary(scheme))
                    .lineLimit(1)
                    .truncationMode(.middle)
                if item.isFolder {
                    Text("\(item.fileCount) \(item.fileCount == 1 ? "file" : "files") · sent as \(item.name)")
                        .font(.system(size: 10))
                        .foregroundStyle(Gemba.textSubtle(scheme))
                        .lineLimit(1)
                        .truncationMode(.middle)
                }
            }
            Spacer(minLength: 8)
            Text(item.size.formattedBytes)
                .font(.system(size: 11).monospacedDigit())
                .foregroundStyle(Gemba.textSubdued(scheme))
            Button(action: onRemove) {
                Image(systemName: "xmark")
                    .font(.system(size: 9, weight: .bold))
                    .frame(width: 20, height: 20)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .foregroundStyle(hoveringRemove ? Gemba.critical(scheme) : Gemba.textSubtle(scheme))
            .scaleEffect(hoveringRemove && !reduceMotion ? 1.1 : 1)
            .animation(reduceMotion ? nil : Motion.smooth, value: hoveringRemove)
            .onHover { hoveringRemove = $0 }
            .smoothTooltip("Remove")
            .accessibilityLabel("Remove \(item.displayName)")
        }
    }
}

// MARK: - Progress

private struct ProgressCard: View {
    @Bindable var model: UploadModel
    @Environment(\.colorScheme) private var scheme

    private var isMovingBytes: Bool {
        if case .uploading = model.progress.phase { return true }
        return false
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                MotionLoader(size: 13)
                TextMorph(text: model.progress.phase.label, font: .system(size: 12, weight: .medium))
                    .foregroundStyle(Gemba.textPrimary(scheme))
                    .lineLimit(1)
                Spacer(minLength: 8)
                NumberFlow(value: (model.progress.fraction * 100).rounded()) { "\(Int($0))%" }
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Gemba.textSubdued(scheme))
            }
            SmoothProgressBar(value: model.progress.fraction)
        }
        .padding(16)
        .background(Squircle(radius: 16).fill(Gemba.surfaceCard(scheme)))
        .overlay(Squircle(radius: 16).strokeBorder(Gemba.border(scheme), lineWidth: 1))
        // The beam runs only while bytes are actually travelling.
        .overlay { if isMovingBytes { BorderBeam(radius: 16) } }
    }
}

// MARK: - Result

private struct ResultView: View {
    let result: ShareResult
    @Bindable var model: UploadModel
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 10) {
                SpringScaleIn(delay: 0.1) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(Gemba.success(scheme))
                }
                SoftBlurIn(text: result.files.count > 1 ? "\(result.files.count) items, one link" : "Ready to share",
                           font: .system(size: 16, weight: .semibold))
                    .foregroundStyle(Gemba.textPrimary(scheme))
            }

            ScrambleText(text: result.absoluteString)
                .foregroundStyle(Gemba.textPrimary(scheme))
                .textSelection(.enabled)
                .lineLimit(3)
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Squircle(radius: 10).fill(Gemba.surfaceSubdued(scheme)))

            HStack(spacing: 8) {
                ButtonCopy(text: result.absoluteString)
                Button {
                    NSWorkspace.shared.open(result.link.url)
                } label: {
                    Label("Open", systemImage: "safari")
                }
                .buttonStyle(SmoothButtonStyle(variant: .soft))
                Spacer(minLength: 0)
                Button("Send more") { model.reset() }
                    .buttonStyle(SmoothButtonStyle(variant: .ghost))
            }

            VStack(alignment: .leading, spacing: 6) {
                ForEach(Array(result.files.prefix(4).enumerated()), id: \.element.id) { index, file in
                    HStack(spacing: 8) {
                        Image(systemName: file.isFolder ? "doc.zipper" : "doc")
                            .font(.system(size: 11))
                            .foregroundStyle(Gemba.textSubtle(scheme))
                            .frame(width: 16)
                        Text(file.name)
                            .font(.system(size: 12))
                            .foregroundStyle(Gemba.textPrimary(scheme))
                            .lineLimit(1)
                            .truncationMode(.middle)
                        Spacer(minLength: 8)
                        Text(file.size.formattedBytes)
                            .font(.system(size: 11).monospacedDigit())
                            .foregroundStyle(Gemba.textSubdued(scheme))
                    }
                    .staggeredAppear(index)
                }
                if result.files.count > 4 {
                    Text("and \(result.files.count - 4) more")
                        .font(.system(size: 11))
                        .foregroundStyle(Gemba.textSubtle(scheme))
                        .staggeredAppear(4)
                }
            }

            Text(result.encrypted
                 ? "Anyone with this exact link can open these — the part after # is the key."
                 : "Sent without encryption, by your choice. Anyone with the link can read it.")
                .font(.system(size: 11))
                .foregroundStyle(result.encrypted ? Gemba.textSubtle(scheme) : Gemba.warning(scheme))
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(20)
        .background(Squircle(radius: 16).fill(Gemba.surfaceCard(scheme)))
        .overlay(Squircle(radius: 16).strokeBorder(Gemba.border(scheme), lineWidth: 1))
    }
}

// MARK: - Encryption fallback

private struct EncryptionFallback: View {
    let prompt: UploadModel.EncryptionFailurePrompt
    @Bindable var model: UploadModel
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                Image(systemName: "exclamationmark.lock.fill")
                    .font(.system(size: 18))
                    .foregroundStyle(Gemba.warning(scheme))
                Text("Couldn't encrypt \(prompt.fileName)")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Gemba.textPrimary(scheme))
            }
            Text(prompt.message)
                .font(.system(size: 12))
                .foregroundStyle(Gemba.textSubdued(scheme))
                .fixedSize(horizontal: false, vertical: true)
            Text("Try again, or send the whole share without encryption — anyone with the link could then read it, because there is no key.")
                .font(.system(size: 12))
                .foregroundStyle(Gemba.textSubdued(scheme))
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 8) {
                Button("Cancel") { model.answerEncryptionFailure(.cancel) }
                    .buttonStyle(SmoothButtonStyle(variant: .ghost))
                    .keyboardShortcut(.cancelAction)
                Spacer(minLength: 0)
                Button("Send unencrypted") { model.answerEncryptionFailure(.uploadUnencrypted) }
                    .buttonStyle(SmoothButtonStyle(variant: .outline))
                Button("Try again") { model.answerEncryptionFailure(.retry) }
                    .buttonStyle(SmoothButtonStyle(variant: .solid))
                    .keyboardShortcut(.defaultAction)
            }
        }
    }
}
