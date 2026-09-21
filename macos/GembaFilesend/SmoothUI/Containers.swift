import SwiftUI
import UniformTypeIdentifiers

// MARK: - Accordion

/// SmoothUI `basic-accordion`: the chevron turns 180° over 0.2s and the body
/// opens on a stiff spring (stiffness 500, damping 40) with its opacity on a
/// separate 0.2s fade. Here each accordion is a card; the parent keeps at most
/// one open, which is what stops the window ever needing to scroll.
struct SmoothAccordion<Header: View, Content: View>: View {
    @Binding var isExpanded: Bool
    @ViewBuilder let header: Header
    @ViewBuilder let content: Content
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                withAnimation(reduceMotion ? nil : Motion.accordion) { isExpanded.toggle() }
            } label: {
                HStack(spacing: 10) {
                    header
                    Image(systemName: "chevron.down")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(Gemba.textSubtle(scheme))
                        .rotationEffect(.degrees(isExpanded ? 180 : 0))
                        .animation(reduceMotion ? nil : Motion.chevron, value: isExpanded)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityAddTraits(.isHeader)
            .accessibilityHint(isExpanded ? "Collapse" : "Expand")

            if isExpanded {
                content
                    .padding(.horizontal, 16)
                    .padding(.bottom, 16)
                    .transition(.opacity.animation(reduceMotion ? nil : .easeOut(duration: 0.2)))
            }
        }
        .background(Squircle(radius: 16).fill(Gemba.surfaceCard(scheme)))
        .overlay(Squircle(radius: 16).strokeBorder(Gemba.border(scheme), lineWidth: 1))
        .clipShape(Squircle(radius: 16))
        .shadow(color: Color(red: 95/255, green: 105/255, blue: 133/255).opacity(scheme == .dark ? 0 : 0.06),
                radius: 8, y: 4)
    }
}

// MARK: - Animated File Upload

/// SmoothUI `animated-file-upload` storyboard, as a native drop zone:
///   idle  — dashed border
///   drag  — zone scales 1.02, border goes accent, icon floats up 4pt at 1.15
///           on the bouncy spring, hint text swaps (y ±4, 0.15s)
///   drop  — icon settles back
/// `compact` is the one-line version shown once there is something to send.
struct AnimatedFileUpload: View {
    let compact: Bool
    let onFiles: ([URL]) -> Void
    @State private var isTargeted = false
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        Group {
            if compact { compactRow } else { fullZone }
        }
        .background(
            Squircle(radius: 16)
                .fill(isTargeted ? Gemba.accentSubdued(scheme) : Gemba.surfaceCard(scheme))
        )
        .overlay(
            Squircle(radius: 16)
                .strokeBorder(isTargeted ? Gemba.accent(scheme) : Gemba.border(scheme),
                              style: StrokeStyle(lineWidth: isTargeted ? 2 : 1, dash: compact && !isTargeted ? [] : [6, 4]))
        )
        .scaleEffect(isTargeted && !reduceMotion ? 1.02 : 1)
        .animation(reduceMotion ? nil : Motion.smooth, value: isTargeted)
        .onDrop(of: [.fileURL], isTargeted: $isTargeted) { providers in
            Task { await load(providers) }
            return true
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Drop zone for files and folders")
    }

    private var fullZone: some View {
        VStack(spacing: 10) {
            Image(systemName: "arrow.up.doc")
                .font(.system(size: 28, weight: .light))
                .foregroundStyle(isTargeted ? Gemba.accent(scheme) : Gemba.textSubdued(scheme))
                .scaleEffect(isTargeted && !reduceMotion ? 1.15 : 1)
                .offset(y: isTargeted && !reduceMotion ? -4 : 0)
                .animation(reduceMotion ? nil : Motion.bouncy, value: isTargeted)
            ZStack {
                if isTargeted {
                    Text("Release to add").transition(.hintSwap)
                } else {
                    Text("Drop files or folders here").transition(.hintSwap)
                }
            }
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(Gemba.textPrimary(scheme))
            .animation(reduceMotion ? nil : .easeOut(duration: 0.15), value: isTargeted)
            Text("Folders are zipped for you, then the zip is deleted.")
                .font(.system(size: 11))
                .foregroundStyle(Gemba.textSubtle(scheme))
            Button("Choose…") { choose() }
                .buttonStyle(SmoothButtonStyle(variant: .soft))
                .padding(.top, 2)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 30)
    }

    private var compactRow: some View {
        HStack(spacing: 8) {
            Image(systemName: isTargeted ? "tray.and.arrow.down.fill" : "plus")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(isTargeted ? Gemba.accent(scheme) : Gemba.textSubdued(scheme))
                .contentTransition(reduceMotion ? .identity : .symbolEffect(.replace))
            ZStack(alignment: .leading) {
                if isTargeted {
                    Text("Release to add").transition(.hintSwap)
                } else {
                    Text("Drop more files or folders, or").transition(.hintSwap)
                }
            }
            .font(.system(size: 12))
            .foregroundStyle(Gemba.textSubdued(scheme))
            .animation(reduceMotion ? nil : .easeOut(duration: 0.15), value: isTargeted)
            if !isTargeted {
                Button("choose…") { choose() }
                    .buttonStyle(.plain)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Gemba.accent(scheme))
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    private func load(_ providers: [NSItemProvider]) async {
        let boxed = providers.map { DropBox($0) }
        var urls: [URL] = []
        for box in boxed {
            if let url = await Self.loadURL(box) { urls.append(url) }
        }
        let resolved = urls
        await MainActor.run { onFiles(resolved) }
    }

    private nonisolated static func loadURL(_ box: DropBox) async -> URL? {
        await box.provider.loadFileURL()
    }

    private func choose() {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = true
        panel.canChooseDirectories = true
        panel.canChooseFiles = true
        panel.message = "Choose files or folders to send — folders are zipped"
        if panel.runModal() == .OK { onFiles(panel.urls) }
    }
}

/// Carries an NSItemProvider across a single actor hop, where the surrounding
/// code guarantees only one place touches it.
struct DropBox: @unchecked Sendable {
    let provider: NSItemProvider
    init(_ provider: NSItemProvider) { self.provider = provider }
}

extension NSItemProvider {
    func loadFileURL() async -> URL? {
        await withCheckedContinuation { continuation in
            _ = loadObject(ofClass: URL.self) { url, _ in
                continuation.resume(returning: url)
            }
        }
    }
}

// MARK: - Folder Reveal

/// SmoothUI `folder-reveal`, at icon size: when a folder row appears, the flap
/// opens and three sheets fan out of it (rotated by their offset, on the house
/// spring), then settle — so a folder reads as "contents going in a zip".
struct FolderReveal: View {
    var size: CGFloat = 18
    @State private var open = false
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack(alignment: .bottom) {
            // Back of the folder, with its tab.
            Squircle(radius: size * 0.14)
                .fill(Gemba.accent(scheme).opacity(0.55))
                .frame(width: size, height: size * 0.72)
            ForEach(-1...1, id: \.self) { offset in
                Squircle(radius: size * 0.06)
                    .fill(Color.white)
                    .overlay(Squircle(radius: size * 0.06).strokeBorder(Gemba.border(scheme), lineWidth: 0.5))
                    .frame(width: size * 0.5, height: size * 0.58)
                    .rotationEffect(.degrees(open ? Double(offset) * 14 : 0), anchor: .bottom)
                    .offset(x: open ? CGFloat(offset) * size * 0.14 : 0, y: open ? -size * 0.2 : 0)
                    .opacity(open ? 1 : 0)
            }
            // Front flap, which tilts open.
            Squircle(radius: size * 0.14)
                .fill(Gemba.accent(scheme))
                .frame(width: size, height: size * 0.55)
                .rotation3DEffect(.degrees(open ? -28 : 0), axis: (x: 1, y: 0, z: 0), anchor: .bottom, perspective: 0.6)
        }
        .frame(width: size * 1.3, height: size * 1.1, alignment: .bottom)
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(Motion.smooth.delay(0.1)) { open = true }
            withAnimation(Motion.smooth.delay(0.9)) { open = false }
        }
        .onHover { inside in
            guard !reduceMotion else { return }
            withAnimation(Motion.smooth) { open = inside }
        }
        .accessibilityHidden(true)
    }
}

// MARK: - Animated List

/// SmoothUI `animated-list`: items enter one after another on the house spring.
struct StaggeredAppear: ViewModifier {
    let index: Int
    var step: Double = 0.05
    @State private var shown = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func body(content: Content) -> some View {
        content
            .modifier(BlurSlideModifier(x: 0, y: shown || reduceMotion ? 0 : 8, blur: 0,
                                        scale: shown || reduceMotion ? 1 : 0.95,
                                        opacity: shown || reduceMotion ? 1 : 0))
            .onAppear {
                guard !reduceMotion else { shown = true; return }
                withAnimation(Motion.smooth.delay(Double(index) * step)) { shown = true }
            }
    }
}

extension View {
    func staggeredAppear(_ index: Int, step: Double = 0.05) -> some View {
        modifier(StaggeredAppear(index: index, step: step))
    }
}
