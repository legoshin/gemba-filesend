import SwiftUI

// MARK: - Motion Loader

/// SmoothUI `motion-loader`: an arc that sweeps round while its length breathes,
/// so it reads as working rather than stuck.
struct MotionLoader: View {
    var size: CGFloat = 14
    var lineWidth: CGFloat = 2
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        TimelineView(.animation(paused: reduceMotion)) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            let rotation = reduceMotion ? 0 : (t.truncatingRemainder(dividingBy: 0.9) / 0.9) * 360
            let breath = reduceMotion ? 0.7 : 0.35 + 0.35 * (sin(t * 3.4) + 1) / 2
            Circle()
                .trim(from: 0, to: breath)
                .stroke(Gemba.accent(scheme), style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(rotation))
                .frame(width: size, height: size)
        }
        .accessibilityLabel("Working")
    }
}

// MARK: - Animated Progress Bar

/// SmoothUI `animated-progress-bar`: the fill follows its value on an
/// underdamped spring (mass 0.75, stiffness 100, damping 10), and the percentage
/// label rolls with number-flow.
struct SmoothProgressBar: View {
    let value: Double          // 0...1
    var height: CGFloat = 8
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Capsule().fill(Gemba.surfaceSubdued(scheme))
                Capsule()
                    .fill(Gemba.accent(scheme))
                    .frame(width: max(height, proxy.size.width * clamped))
                    .opacity(clamped > 0 ? 1 : 0)
            }
        }
        .frame(height: height)
        .animation(reduceMotion ? nil : Motion.progress, value: clamped)
        .accessibilityElement()
        .accessibilityLabel("Progress")
        .accessibilityValue("\(Int(clamped * 100)) percent")
    }

    private var clamped: Double { min(max(value, 0), 1) }
}

// MARK: - Border Beam

/// SmoothUI `border-beam`: a comet of light travelling around a card's border —
/// used on the progress card while bytes are moving, and only then.
struct BorderBeam: View {
    var radius: CGFloat = 16
    var lap: Double = 3.2
    var length: CGFloat = 0.22
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        if !reduceMotion {
            TimelineView(.animation) { context in
                let t = context.date.timeIntervalSinceReferenceDate
                let head = (t.truncatingRemainder(dividingBy: lap)) / lap
                ZStack {
                    beam(from: head - length, to: head, width: 7, blur: 7, opacity: 0.75)  // halo
                    beam(from: head - length, to: head, width: 2, blur: 0, opacity: 1)     // core
                }
            }
            .allowsHitTesting(false)
        }
    }

    /// The trim wraps past 1, so draw the part that spills over the seam twice.
    @ViewBuilder
    private func beam(from start: Double, to end: Double, width: CGFloat, blur: CGFloat, opacity: Double) -> some View {
        let gradient = LinearGradient(colors: [Gemba.accent(scheme).opacity(0), Gemba.accent(scheme)],
                                      startPoint: .leading, endPoint: .trailing)
        ZStack {
            Squircle(radius: radius).trim(from: max(0, start), to: max(0, end))
                .stroke(gradient, style: StrokeStyle(lineWidth: width, lineCap: .round))
            if start < 0 {
                Squircle(radius: radius).trim(from: 1 + start, to: 1)
                    .stroke(Gemba.accent(scheme).opacity(0.5), style: StrokeStyle(lineWidth: width, lineCap: .round))
            }
        }
        .blur(radius: blur)
        .opacity(opacity)
    }
}

// MARK: - Skeleton

/// SmoothUI `skeleton-loader`: a placeholder bar with a light sweep across it.
struct SkeletonBar: View {
    var width: CGFloat? = nil
    var height: CGFloat = 10
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        TimelineView(.animation(paused: reduceMotion)) { context in
            let phase = reduceMotion ? 0.5 : (context.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: 1.4)) / 1.4
            Capsule()
                .fill(Gemba.surfaceSubdued(scheme))
                .overlay(
                    LinearGradient(
                        colors: [.clear, Gemba.border(scheme).opacity(0.9), .clear],
                        startPoint: UnitPoint(x: phase * 2 - 1, y: 0.5),
                        endPoint: UnitPoint(x: phase * 2, y: 0.5))
                    .clipShape(Capsule())
                )
        }
        .frame(width: width, height: height)
        .accessibilityHidden(true)
    }
}

// MARK: - Toast

/// SmoothUI `basic-toast`: slides in from 50pt right at 0.8 scale, stacks,
/// dismisses itself. One place for every transient message in the app — errors,
/// confirmations, the email result — instead of banners that push layout around.
struct ToastMessage: Identifiable, Equatable {
    enum Kind { case success, error, info }
    let id = UUID()
    let kind: Kind
    let text: String
}

@MainActor
@Observable
final class ToastCenter {
    private(set) var toasts: [ToastMessage] = []

    func show(_ text: String, kind: ToastMessage.Kind = .info, seconds: Double = 3.5) {
        let toast = ToastMessage(kind: kind, text: text)
        withSmoothAnimation { toasts.append(toast) }
        // Errors stay longer: they are the ones someone needs time to read.
        let visible = kind == .error ? max(seconds, 6) : seconds
        Task { @MainActor in
            try? await Task.sleep(for: .seconds(visible))
            self.dismiss(toast)
        }
    }

    func dismiss(_ toast: ToastMessage) {
        withSmoothAnimation(Motion.exit) { toasts.removeAll { $0.id == toast.id } }
    }
}

struct ToastStack: View {
    @Bindable var center: ToastCenter
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        VStack(alignment: .trailing, spacing: 8) {
            ForEach(center.toasts) { toast in
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: icon(toast.kind))
                        .foregroundStyle(tint(toast.kind))
                        .font(.system(size: 13, weight: .semibold))
                    Text(toast.text)
                        .font(.system(size: 12))
                        .foregroundStyle(Gemba.textPrimary(scheme))
                        .fixedSize(horizontal: false, vertical: true)
                    Button {
                        center.dismiss(toast)
                    } label: {
                        Image(systemName: "xmark").font(.system(size: 9, weight: .bold))
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(Gemba.textSubtle(scheme))
                    .accessibilityLabel("Dismiss")
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .frame(maxWidth: 360, alignment: .leading)
                .background(Squircle(radius: 12).fill(Gemba.surfaceCard(scheme)))
                .overlay(Squircle(radius: 12).strokeBorder(Gemba.border(scheme), lineWidth: 1))
                .shadow(color: .black.opacity(scheme == .dark ? 0.4 : 0.12), radius: 16, y: 8)
                .transition(.toast)
                .accessibilityElement(children: .combine)
            }
        }
        // Top-trailing, over the header: a toast must never cover the primary
        // action, and the bottom of this window is where the send button lives.
        .padding(.top, 14)
        .padding(.horizontal, 16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
        .allowsHitTesting(!center.toasts.isEmpty)
    }

    private func icon(_ kind: ToastMessage.Kind) -> String {
        switch kind {
        case .success: "checkmark.circle.fill"
        case .error: "exclamationmark.triangle.fill"
        case .info: "info.circle.fill"
        }
    }

    private func tint(_ kind: ToastMessage.Kind) -> Color {
        switch kind {
        case .success: Gemba.success(scheme)
        case .error: Gemba.critical(scheme)
        case .info: Gemba.accent(scheme)
        }
    }
}

// MARK: - Modal

/// SmoothUI `basic-modal` / `dialog`: backdrop fades in over 0.2s while the
/// panel rises from 8pt below at 0.96 scale. Drawn in-window rather than as a
/// system sheet, which can't take this motion.
struct SmoothModal<Content: View>: View {
    @Binding var isPresented: Bool
    var dismissible = false
    @ViewBuilder let content: Content
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        ZStack {
            if isPresented {
                Color.black.opacity(scheme == .dark ? 0.55 : 0.28)
                    .ignoresSafeArea()
                    .transition(.opacity.animation(Motion.backdrop))
                    .onTapGesture { if dismissible { withSmoothAnimation { isPresented = false } } }
                    .accessibilityHidden(true)
                content
                    .padding(24)
                    .frame(maxWidth: 440)
                    .background(Squircle(radius: 18).fill(Gemba.surfaceCard(scheme)))
                    .overlay(Squircle(radius: 18).strokeBorder(Gemba.border(scheme), lineWidth: 1))
                    .shadow(color: .black.opacity(0.25), radius: 32, y: 16)
                    .padding(24)
                    .transition(.blurSlide(y: 8, scale: 0.96))
                    .accessibilityAddTraits(.isModal)
            }
        }
        .animation(Motion.smooth, value: isPresented)
    }
}
