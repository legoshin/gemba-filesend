import SwiftUI
import UniformTypeIdentifiers
import AppKit
import GembaUpload

/// The single window.
///
/// Layout rule: **the window never scrolls.** Everything that can grow is either
/// collapsible or bounded, and the window itself sizes to its content
/// (`.windowResizability(.contentSize)` in the App), so opening a section makes
/// the window taller rather than producing a scrollbar. At most one section is
/// open at a time — opening one closes the other — which keeps the tallest
/// possible state comfortably under any screen height.
struct ContentView: View {
    @Environment(\.colorScheme) private var scheme
    @State private var model = UploadModel()
    @State private var expanded: Panel?
    @State private var isTargeted = false

    enum Panel { case files, settings }

    /// Only one panel open at a time: binding a panel to `true` closes the other.
    private func binding(for panel: Panel) -> Binding<Bool> {
        Binding(
            get: { expanded == panel },
            set: { isOpen in
                withAnimation(.snappy(duration: 0.22)) { expanded = isOpen ? panel : nil }
            }
        )
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Gemba.Space.x5) {
            header

            if let result = model.result {
                ResultCard(result: result, model: model)
            } else {
                DropArea(model: model, isTargeted: $isTargeted, compact: !model.items.isEmpty) {
                    withAnimation(.snappy(duration: 0.22)) { expanded = .files }
                }

                if !model.items.isEmpty {
                    DisclosureCard(
                        title: model.items.count == 1 ? "1 file" : "\(model.items.count) files",
                        summary: model.totalBytes.formattedBytes,
                        isExpanded: binding(for: .files)
                    ) {
                        FileList(model: model)
                    }
                }

                DisclosureCard(
                    title: "Share settings",
                    summary: model.settingsSummary,
                    badge: model.notifyRecipients ? "envelope" : nil,
                    isExpanded: binding(for: .settings)
                ) {
                    SettingsPanel(model: model)
                }

                if model.isUploading { ProgressCard(model: model) }
                uploadButton
            }

            if let error = model.errorMessage { errorBanner(error) }
            footer
        }
        .padding(Gemba.Space.x6)
        .frame(width: 520, alignment: .leading)
        .background(Gemba.surfacePage(scheme))
        .onChange(of: model.items.count) { previous, current in
            // First file lands: show what was added — but only if nothing else is
            // open. Dropping a file while editing settings must not yank the
            // panel out from under the person.
            if previous == 0 && current > 0 && expanded == nil {
                withAnimation(.snappy(duration: 0.22)) { expanded = .files }
            } else if current == 0 && expanded == .files {
                withAnimation(.snappy(duration: 0.22)) { expanded = nil }
            }
        }
        .onChange(of: model.isUploading) { _, isUploading in
            // Collapse while working: the progress bar should not have to compete
            // with an open settings panel for the window's height.
            if isUploading { withAnimation(.snappy(duration: 0.22)) { expanded = nil } }
        }
        .sheet(item: Binding(
            get: { model.encryptionFailure },
            set: { if $0 == nil { model.encryptionFailure = nil } }
        )) { prompt in
            EncryptionFallbackSheet(prompt: prompt, model: model)
        }
        .onAppear {
            #if DEBUG
            if let state = model.applyDemoStateIfRequested() {
                expanded = (state == "settings" || state == "full") ? .settings : .files
            }
            #endif
        }
    }

    private var header: some View {
        HStack(spacing: Gemba.Space.x4) {
            RoundedRectangle(cornerRadius: Gemba.Radius.sm)
                .fill(Gemba.yellow)
                .frame(width: 28, height: 28)
                .overlay(
                    Image(systemName: "lock.fill")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(Gemba.ink900)
                )
            VStack(alignment: .leading, spacing: 2) {
                Text("Gemba Filesend")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Gemba.textPrimary(scheme))
                Text("Encrypted on this Mac. One link, key never sent.")
                    .font(.system(size: 12))
                    .foregroundStyle(Gemba.textSubdued(scheme))
            }
            Spacer(minLength: 0)
        }
    }

    private var uploadButton: some View {
        VStack(alignment: .leading, spacing: Gemba.Space.x3) {
            if let notice = model.memoryNotice, !model.isUploading {
                Text(notice)
                    .font(.system(size: 11))
                    .foregroundStyle(Gemba.warning(scheme))
                    .fixedSize(horizontal: false, vertical: true)
            }
            Button(model.isUploading ? model.progress.phase.label : sendLabel) {
                model.startUpload()
            }
            .buttonStyle(GembaPrimaryButtonStyle())
            .disabled(!model.canUpload)
            .keyboardShortcut(.return, modifiers: .command)
        }
    }

    private var sendLabel: String {
        switch model.items.count {
        case 0: return "Add files to send"
        case 1: return "Encrypt and send"
        default: return "Encrypt and send \(model.items.count) files"
        }
    }

    private func errorBanner(_ message: String) -> some View {
        HStack(alignment: .top, spacing: Gemba.Space.x3) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(Gemba.critical(scheme))
            Text(message)
                .font(.system(size: 12))
                .foregroundStyle(Gemba.textPrimary(scheme))
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .padding(Gemba.Space.x4)
        .background(RoundedRectangle(cornerRadius: Gemba.Radius.md).fill(Gemba.criticalSubdued(scheme)))
    }

    private var footer: some View {
        Text("Files are encrypted before they leave this Mac. The key lives only in the link, after the #, and is never sent to the server.")
            .font(.system(size: 11))
            .foregroundStyle(Gemba.textSubtle(scheme))
            .fixedSize(horizontal: false, vertical: true)
    }
}

// MARK: - Collapsible card

/// A card that shows a one-line summary when closed and its content when open.
/// This is what keeps the window short: the information stays visible as a
/// summary, so collapsing costs nothing.
private struct DisclosureCard<Content: View>: View {
    @Environment(\.colorScheme) private var scheme
    let title: String
    let summary: String
    /// An optional SF Symbol shown after the summary — a state worth seeing at a
    /// glance that would otherwise cost words the one line cannot spare.
    var badge: String? = nil
    @Binding var isExpanded: Bool
    @ViewBuilder var content: Content

    var body: some View {
        GembaCard {
            VStack(alignment: .leading, spacing: isExpanded ? Gemba.Space.x5 : 0) {
                Button {
                    isExpanded.toggle()
                } label: {
                    HStack(spacing: Gemba.Space.x3) {
                        Text(title)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Gemba.textPrimary(scheme))
                        Spacer(minLength: Gemba.Space.x3)
                        Text(summary)
                            .font(.system(size: 12))
                            .foregroundStyle(Gemba.textSubdued(scheme))
                            .lineLimit(1)
                            .truncationMode(.tail)
                        if let badge {
                            Image(systemName: badge)
                                .font(.system(size: 10))
                                .foregroundStyle(Gemba.textSubdued(scheme))
                        }
                        Image(systemName: "chevron.right")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(Gemba.textSubtle(scheme))
                            .rotationEffect(.degrees(isExpanded ? 90 : 0))
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(title), \(summary)")
                .accessibilityHint(isExpanded ? "Collapse" : "Expand")

                if isExpanded { content }
            }
        }
    }
}

// MARK: - Drop area

/// Full-height when there is nothing to send, a single row once there is —
/// the empty state is the only time a big target earns its space.
private struct DropArea: View {
    @Environment(\.colorScheme) private var scheme
    @Bindable var model: UploadModel
    @Binding var isTargeted: Bool
    let compact: Bool
    let onFilesAdded: () -> Void

    var body: some View {
        Group {
            if compact { compactRow } else { emptyState }
        }
        .background(
            RoundedRectangle(cornerRadius: Gemba.Radius.lg)
                .fill(isTargeted ? Gemba.accentSubdued(scheme) : Gemba.surfaceCard(scheme))
        )
        .overlay(
            RoundedRectangle(cornerRadius: Gemba.Radius.lg)
                .strokeBorder(
                    isTargeted ? Gemba.accent(scheme) : Gemba.border(scheme),
                    style: StrokeStyle(lineWidth: isTargeted ? 2 : 1, dash: compact ? [] : [6, 4])
                )
        )
        .onDrop(of: [.fileURL], isTargeted: $isTargeted) { providers in
            Task { await handleDrop(providers) }
            return true
        }
    }

    private var emptyState: some View {
        VStack(spacing: Gemba.Space.x3) {
            Image(systemName: "arrow.up.doc")
                .font(.system(size: 26, weight: .light))
                .foregroundStyle(Gemba.textSubdued(scheme))
            Text("Drop files here")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(Gemba.textPrimary(scheme))
            Text("or")
                .font(.system(size: 11))
                .foregroundStyle(Gemba.textSubtle(scheme))
            Button("Choose files…") { chooseFiles() }
                .buttonStyle(GembaSecondaryButtonStyle())
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Gemba.Space.x7)
    }

    private var compactRow: some View {
        HStack(spacing: Gemba.Space.x3) {
            Image(systemName: "plus")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Gemba.textSubdued(scheme))
            Text("Drop more files, or")
                .font(.system(size: 12))
                .foregroundStyle(Gemba.textSubdued(scheme))
            Button("choose…") { chooseFiles() }
                .buttonStyle(.plain)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Gemba.accent(scheme))
            Spacer(minLength: 0)
        }
        .padding(.horizontal, Gemba.Space.x5)
        .padding(.vertical, Gemba.Space.x4)
    }

    private func handleDrop(_ providers: [NSItemProvider]) async {
        let boxed = providers.map { DropBox($0) }
        var urls: [URL] = []
        for box in boxed {
            if let url = await loadFileURL(box) { urls.append(url) }
        }
        let resolved = urls
        await MainActor.run {
            model.add(urls: resolved)
            onFilesAdded()
        }
    }

    private nonisolated func loadFileURL(_ box: DropBox) async -> URL? {
        await box.provider.loadFileURL()
    }

    private func chooseFiles() {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = true
        panel.canChooseDirectories = false
        panel.canChooseFiles = true
        panel.message = "Choose up to \(ShareOptions.maxFiles) files to send"
        if panel.runModal() == .OK {
            model.add(urls: panel.urls)
            onFilesAdded()
        }
    }
}

/// Carries an NSItemProvider across a single actor hop, where the surrounding
/// code guarantees only one place touches it.
struct DropBox: @unchecked Sendable {
    let provider: NSItemProvider
    init(_ provider: NSItemProvider) { self.provider = provider }
}

extension NSItemProvider {
    /// `loadItem` for a file URL, as an async call.
    func loadFileURL() async -> URL? {
        await withCheckedContinuation { continuation in
            _ = loadObject(ofClass: URL.self) { url, _ in
                continuation.resume(returning: url)
            }
        }
    }
}

// MARK: - File list

/// The one genuinely unbounded thing in the window — a share holds up to 25
/// files. Five rows fit without scrolling; beyond that the list itself scrolls
/// inside a fixed height. That keeps the scroll inside an obvious list rather
/// than on the window, which is the thing to avoid.
private struct FileList: View {
    @Environment(\.colorScheme) private var scheme
    @Bindable var model: UploadModel

    private let rowHeight: CGFloat = 26
    private let maxVisibleRows = 5

    var body: some View {
        VStack(alignment: .leading, spacing: Gemba.Space.x3) {
            ScrollView(.vertical) {
                VStack(spacing: 0) {
                    ForEach(model.items) { item in
                        HStack(spacing: Gemba.Space.x3) {
                            Image(systemName: "doc")
                                .font(.system(size: 11))
                                .foregroundStyle(Gemba.textSubtle(scheme))
                            Text(item.name)
                                .font(.system(size: 12))
                                .foregroundStyle(Gemba.textPrimary(scheme))
                                .lineLimit(1)
                                .truncationMode(.middle)
                            Spacer(minLength: Gemba.Space.x3)
                            Text(item.size.formattedBytes)
                                .font(.system(size: 11).monospacedDigit())
                                .foregroundStyle(Gemba.textSubdued(scheme))
                            Button {
                                withAnimation(.snappy(duration: 0.18)) { model.remove(item) }
                            } label: {
                                Image(systemName: "xmark")
                                    .font(.system(size: 9, weight: .semibold))
                            }
                            .buttonStyle(.plain)
                            .foregroundStyle(Gemba.textSubtle(scheme))
                            .help("Remove \(item.name)")
                        }
                        .frame(height: rowHeight)
                    }
                }
            }
            .frame(height: min(CGFloat(model.items.count), CGFloat(maxVisibleRows)) * rowHeight)
            .scrollDisabled(model.items.count <= maxVisibleRows)

            HStack {
                if model.items.count > 1 {
                    Text("All \(model.items.count) files share one link and one key.")
                        .font(.system(size: 11))
                        .foregroundStyle(Gemba.textSubtle(scheme))
                }
                Spacer(minLength: 0)
                Button("Clear") { withAnimation(.snappy(duration: 0.18)) { model.items.removeAll() } }
                    .buttonStyle(.plain)
                    .font(.system(size: 12))
                    .foregroundStyle(Gemba.accent(scheme))
            }
        }
    }
}

// MARK: - Settings

private struct SettingsPanel: View {
    @Environment(\.colorScheme) private var scheme
    @Bindable var model: UploadModel

    var body: some View {
        VStack(alignment: .leading, spacing: Gemba.Space.x5) {
            HStack(alignment: .top, spacing: Gemba.Space.x6) {
                VStack(alignment: .leading, spacing: 4) {
                    fieldLabel("Expires after")
                    Picker("", selection: $model.expiry) {
                        ForEach(ExpiryPreset.allCases) { Text($0.rawValue).tag($0) }
                    }
                    .labelsHidden()
                    .pickerStyle(.menu)
                    .frame(width: 130)
                }
                VStack(alignment: .leading, spacing: 4) {
                    fieldLabel("Downloads allowed")
                    Stepper(value: $model.downloadLimit, in: 1...ShareOptions.maxDownloads) {
                        Text("\(model.downloadLimit)")
                            .font(.system(size: 13).monospacedDigit())
                            .foregroundStyle(Gemba.textPrimary(scheme))
                            .frame(minWidth: 24, alignment: .leading)
                    }
                }
                Spacer(minLength: 0)
            }

            Divider().overlay(Gemba.border(scheme))

            // Password: the field sits on the toggle's row rather than below it,
            // so turning it on costs one field's width, not another row.
            HStack(spacing: Gemba.Space.x4) {
                Toggle("Require a password", isOn: $model.usePassword.animation(.snappy(duration: 0.2)))
                    .font(.system(size: 13))
                    .foregroundStyle(Gemba.textPrimary(scheme))
                    .fixedSize()
                if model.usePassword {
                    SecureField("Password", text: $model.password)
                        .textFieldStyle(.roundedBorder)
                        .frame(maxWidth: .infinity)
                }
            }

            Toggle("Only named recipients can download", isOn: $model.useRecipients.animation(.snappy(duration: 0.2)))
                .font(.system(size: 13))
                .foregroundStyle(Gemba.textPrimary(scheme))
            Toggle("Email them the link when it's ready", isOn: $model.notifyRecipients.animation(.snappy(duration: 0.2)))
                .font(.system(size: 13))
                .foregroundStyle(Gemba.textPrimary(scheme))

            if model.useRecipients || model.notifyRecipients {
                RecipientEditor(model: model)
            }

            Text(helpText)
                .font(.system(size: 11))
                .foregroundStyle(Gemba.textSubtle(scheme))
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    /// One line of help rather than one per option — the panel stays short and
    /// the text explains whatever is currently switched on.
    private var helpText: String {
        if model.notifyRecipients {
            return "The emailed link contains the key, so sending it by email is as private as the recipient's inbox."
        }
        if model.usePassword {
            return "The password is hashed and salted on the server. It is not part of the link and does not decrypt the files."
        }
        if model.useRecipients {
            return "Recipients get a one-time code by email before they can download."
        }
        return "Anyone with the link can download until it expires or runs out of downloads."
    }

    private func fieldLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 11, weight: .medium))
            .foregroundStyle(Gemba.textSubdued(scheme))
    }
}

private struct RecipientEditor: View {
    @Environment(\.colorScheme) private var scheme
    @Bindable var model: UploadModel

    var body: some View {
        VStack(alignment: .leading, spacing: Gemba.Space.x3) {
            HStack {
                TextField("name@company.com", text: $model.recipientDraft)
                    .textFieldStyle(.roundedBorder)
                    .onSubmit { withAnimation(.snappy(duration: 0.18)) { model.addRecipientFromDraft() } }
                Button("Add") { withAnimation(.snappy(duration: 0.18)) { model.addRecipientFromDraft() } }
                    .buttonStyle(GembaSecondaryButtonStyle())
            }
            if !model.recipients.isEmpty {
                // Bounded: ten recipients is the server's cap, three per row, so
                // this never grows past four rows.
                FlowRow(items: model.recipients) { email in
                    HStack(spacing: 4) {
                        Text(email).font(.system(size: 11)).lineLimit(1)
                        Button {
                            withAnimation(.snappy(duration: 0.18)) {
                                model.recipients.removeAll { $0 == email }
                            }
                        } label: {
                            Image(systemName: "xmark").font(.system(size: 8, weight: .bold))
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Capsule().fill(Gemba.surfaceSubdued(scheme)))
                    .overlay(Capsule().stroke(Gemba.border(scheme), lineWidth: 1))
                    .foregroundStyle(Gemba.textPrimary(scheme))
                }
            }
        }
    }
}

/// A minimal wrapping row — chips reflow instead of clipping.
private struct FlowRow<Item: Hashable, Content: View>: View {
    let items: [Item]
    @ViewBuilder let content: (Item) -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(Array(chunked().enumerated()), id: \.offset) { _, row in
                HStack(spacing: 6) {
                    ForEach(row, id: \.self) { content($0) }
                    Spacer(minLength: 0)
                }
            }
        }
    }

    private func chunked() -> [[Item]] {
        stride(from: 0, to: items.count, by: 3).map {
            Array(items[$0..<min($0 + 3, items.count)])
        }
    }
}

// MARK: - Progress

private struct ProgressCard: View {
    @Environment(\.colorScheme) private var scheme
    @Bindable var model: UploadModel

    var body: some View {
        GembaCard {
            VStack(alignment: .leading, spacing: Gemba.Space.x3) {
                HStack {
                    Text(model.progress.phase.label)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Gemba.textPrimary(scheme))
                        .lineLimit(1)
                    Spacer(minLength: Gemba.Space.x3)
                    Text("\(Int((model.progress.fraction * 100).rounded()))%")
                        .font(.system(size: 12).monospacedDigit())
                        .foregroundStyle(Gemba.textSubdued(scheme))
                }
                ProgressView(value: min(max(model.progress.fraction, 0), 1))
                    .progressViewStyle(.linear)
                    .tint(Gemba.accent(scheme))
            }
        }
    }
}

// MARK: - Result

private struct ResultCard: View {
    @Environment(\.colorScheme) private var scheme
    let result: ShareResult
    @Bindable var model: UploadModel

    var body: some View {
        GembaCard {
            VStack(alignment: .leading, spacing: Gemba.Space.x5) {
                HStack(spacing: Gemba.Space.x3) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(Gemba.success(scheme))
                    Text(result.files.count > 1
                         ? "\(result.files.count) files ready on one link"
                         : "Ready to share")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Gemba.textPrimary(scheme))
                }

                Text(result.absoluteString)
                    .font(.system(size: 11, design: .monospaced))
                    .textSelection(.enabled)
                    .foregroundStyle(Gemba.textPrimary(scheme))
                    .padding(Gemba.Space.x4)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(RoundedRectangle(cornerRadius: Gemba.Radius.sm).fill(Gemba.surfaceSubdued(scheme)))
                    .fixedSize(horizontal: false, vertical: true)

                HStack(spacing: Gemba.Space.x3) {
                    Button(model.copied ? "Copied" : "Copy link") { model.copyLink() }
                        .buttonStyle(GembaSecondaryButtonStyle())
                    Button("Open in browser") { NSWorkspace.shared.open(result.link.url) }
                        .buttonStyle(GembaSecondaryButtonStyle())
                    Spacer(minLength: 0)
                    Button("Send more") { model.reset() }
                        .buttonStyle(GembaSecondaryButtonStyle())
                }

                if result.notified {
                    Label("Emailed to \(model.recipients.joined(separator: ", "))", systemImage: "envelope")
                        .font(.system(size: 11))
                        .foregroundStyle(Gemba.textSubdued(scheme))
                        .lineLimit(2)
                }

                Text(result.encrypted
                     ? "Anyone with this exact link can open the files — the part after # is the key."
                     : "This share was uploaded without encryption, by your choice. Anyone with the link can read it.")
                    .font(.system(size: 11))
                    .foregroundStyle(result.encrypted ? Gemba.textSubtle(scheme) : Gemba.warning(scheme))
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

// MARK: - Encryption fallback

private struct EncryptionFallbackSheet: View {
    @Environment(\.colorScheme) private var scheme
    let prompt: UploadModel.EncryptionFailurePrompt
    @Bindable var model: UploadModel

    var body: some View {
        VStack(alignment: .leading, spacing: Gemba.Space.x5) {
            Text("Couldn't encrypt \(prompt.fileName)")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Gemba.textPrimary(scheme))
            Text(prompt.message)
                .font(.system(size: 12))
                .foregroundStyle(Gemba.textSubdued(scheme))
                .fixedSize(horizontal: false, vertical: true)
            Text("You can try again, or send this share without encryption — anyone with the link would then be able to read it, since there is no key.")
                .font(.system(size: 12))
                .foregroundStyle(Gemba.textSubdued(scheme))
                .fixedSize(horizontal: false, vertical: true)
            HStack {
                Button("Cancel") { model.answerEncryptionFailure(.cancel) }
                    .buttonStyle(GembaSecondaryButtonStyle())
                Spacer()
                Button("Send unencrypted") { model.answerEncryptionFailure(.uploadUnencrypted) }
                    .buttonStyle(GembaSecondaryButtonStyle())
                Button("Try again") { model.answerEncryptionFailure(.retry) }
                    .buttonStyle(GembaPrimaryButtonStyle())
                    .frame(width: 110)
            }
        }
        .padding(Gemba.Space.x6)
        .frame(width: 440)
        .background(Gemba.surfaceCard(scheme))
    }
}
