import SwiftUI
import AppKit

// MARK: - Smooth Button

/// SmoothUI `smooth-button`: variant → appearance, color → hue. The variants
/// used here are `solid` (the primary action), `soft` and `ghost`. Press gives a
/// 0.97 squeeze on the house spring; hover lifts the fill a shade.
struct SmoothButtonStyle: ButtonStyle {
    enum Variant { case solid, soft, outline, ghost }
    var variant: Variant = .solid
    var fullWidth = false

    func makeBody(configuration: Configuration) -> some View {
        SmoothButtonBody(configuration: configuration, variant: variant, fullWidth: fullWidth)
    }
}

private struct SmoothButtonBody: View {
    let configuration: ButtonStyle.Configuration
    let variant: SmoothButtonStyle.Variant
    let fullWidth: Bool
    @Environment(\.colorScheme) private var scheme
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var hovering = false

    var body: some View {
        configuration.label
            .font(.system(size: variant == .solid ? 14 : 13, weight: variant == .solid ? .semibold : .medium))
            .padding(.horizontal, variant == .solid ? 18 : 12)
            .padding(.vertical, variant == .solid ? 11 : 7)
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .foregroundStyle(foreground.opacity(isEnabled ? 1 : 0.45))
            .background(Squircle(radius: variant == .solid ? 12 : 9).fill(fill))
            .overlay(Squircle(radius: variant == .solid ? 12 : 9).strokeBorder(stroke, lineWidth: 1))
            .scaleEffect(configuration.isPressed && isEnabled && !reduceMotion ? 0.97 : 1)
            .animation(reduceMotion ? nil : Motion.smooth, value: configuration.isPressed)
            .animation(reduceMotion ? nil : Motion.smooth, value: hovering)
            .onHover { hovering = $0 }
            .contentShape(Squircle(radius: 12))
    }

    private var foreground: Color {
        switch variant {
        case .solid: return Gemba.buttonPrimaryFG(scheme)
        case .soft, .outline: return Gemba.textPrimary(scheme)
        case .ghost: return Gemba.accent(scheme)
        }
    }

    private var fill: Color {
        let lift = hovering && isEnabled ? 0.9 : 1
        switch variant {
        case .solid:
            return Gemba.buttonPrimaryBG(scheme).opacity(isEnabled ? lift : 0.18)
        case .soft:
            return Gemba.surfaceSubdued(scheme).opacity(hovering ? 0.7 : 1)
        case .outline:
            return hovering ? Gemba.surfaceSubdued(scheme) : .clear
        case .ghost:
            return hovering ? Gemba.accentSubdued(scheme) : .clear
        }
    }

    private var stroke: Color {
        switch variant {
        case .soft, .outline: return Gemba.border(scheme)
        default: return .clear
        }
    }
}

// MARK: - Button Copy

/// SmoothUI `button-copy`: idle → copying → copied, with the icon swapping by
/// blur-and-slide (enters from above out of blur 10, leaves downward into it).
/// Announces the result to VoiceOver, as SmoothUI does with aria-live.
struct ButtonCopy: View {
    let text: String
    var label = "Copy link"
    var copiedLabel = "Copied"
    var onCopied: () -> Void = {}

    private enum Phase { case idle, copying, copied }
    @State private var phase: Phase = .idle
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        Button(action: copy) {
            HStack(spacing: 6) {
                ZStack {
                    switch phase {
                    case .idle:
                        Image(systemName: "doc.on.doc").transition(.copySwap)
                    case .copying:
                        MotionLoader(size: 12).transition(.copySwap)
                    case .copied:
                        Image(systemName: "checkmark").fontWeight(.bold).transition(.copySwap)
                    }
                }
                .frame(width: 14, height: 14)
                .clipped()
                Text(phase == .copied ? copiedLabel : label)
                    .contentTransition(reduceMotion ? .identity : .interpolate)
            }
        }
        .buttonStyle(SmoothButtonStyle(variant: .soft))
        .accessibilityLabel(phase == .copied ? "Link copied" : label)
    }

    private func copy() {
        guard phase == .idle else { return }
        withSmoothAnimation { phase = .copying }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(text, forType: .string)
        NSAccessibility.post(element: NSApp.mainWindow as Any, notification: .announcementRequested,
                             userInfo: [.announcement: "Link copied", .priority: NSAccessibilityPriorityLevel.high.rawValue])
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(220))
            withSmoothAnimation { phase = .copied }
            onCopied()
            try? await Task.sleep(for: .seconds(2))
            withSmoothAnimation { phase = .idle }
        }
    }
}

// MARK: - Notification Badge

/// SmoothUI `notification-badge`: pops in from scale 0; when the count changes
/// the new number rolls in from 12pt in the direction of change.
struct NotificationBadge: View {
    let count: Int
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var previous = 0

    var body: some View {
        ZStack {
            if count > 0 {
                Text("\(count)")
                    .font(.system(size: 10, weight: .bold).monospacedDigit())
                    .id(count)
                    .transition(reduceMotion ? .opacity : .asymmetric(
                        insertion: .blurSlide(y: count >= previous ? 12 : -12),
                        removal: .blurSlide(y: count >= previous ? -12 : 12)))
                    .foregroundStyle(Gemba.buttonPrimaryFG(scheme))
                    .padding(.horizontal, 6)
                    .frame(minWidth: 18, minHeight: 18)
                    .background(Capsule().fill(Gemba.accent(scheme)))
                    .clipShape(Capsule())
                    .transition(.scale(scale: 0).combined(with: .opacity))
            }
        }
        .animation(reduceMotion ? nil : Motion.badge, value: count)
        .onChange(of: count) { old, _ in previous = old }
    }
}

// MARK: - Animated Tooltip

/// SmoothUI `animated-tooltip`: on hover, after a short delay, a label scales in
/// from 0.95 and 4pt away from its anchor on the house spring. Replaces the
/// system `.help` tooltip, which cannot animate.
struct AnimatedTooltip: ViewModifier {
    let text: String
    var delay: Double = 0.35
    @State private var hovering = false
    @State private var shown = false
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func body(content: Content) -> some View {
        content
            .onHover { inside in
                hovering = inside
                if inside {
                    Task { @MainActor in
                        try? await Task.sleep(for: .seconds(delay))
                        if hovering { withAnimation(reduceMotion ? nil : Motion.smooth) { shown = true } }
                    }
                } else {
                    withAnimation(reduceMotion ? nil : Motion.exit) { shown = false }
                }
            }
            .overlay(alignment: .top) {
                if shown {
                    Text(text)
                        .font(.system(size: 11, weight: .medium))
                        .fixedSize()
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .foregroundStyle(Gemba.buttonPrimaryFG(scheme))
                        .background(Squircle(radius: 6).fill(Gemba.buttonPrimaryBG(scheme)))
                        .offset(y: -28)
                        .transition(.blurSlide(y: 4, scale: 0.95))
                        .allowsHitTesting(false)
                        .zIndex(10)
                }
            }
            .accessibilityHint(text)
    }
}

extension View {
    func smoothTooltip(_ text: String) -> some View { modifier(AnimatedTooltip(text: text)) }
}

// MARK: - Theme Toggle

/// SmoothUI `theme-toggle`: System / Light / Dark, with the icon morphing
/// between states. Persists per user.
enum ThemeChoice: String, CaseIterable, Identifiable {
    case system, light, dark
    var id: String { rawValue }
    var colorScheme: ColorScheme? {
        switch self { case .system: nil; case .light: .light; case .dark: .dark }
    }
    var symbol: String {
        switch self { case .system: "circle.lefthalf.filled"; case .light: "sun.max.fill"; case .dark: "moon.fill" }
    }
    var next: ThemeChoice {
        switch self { case .system: .light; case .light: .dark; case .dark: .system }
    }
}

struct ThemeToggle: View {
    @AppStorage("themeChoice") private var raw = ThemeChoice.system.rawValue
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var choice: ThemeChoice { ThemeChoice(rawValue: raw) ?? .system }

    var body: some View {
        Button {
            withSmoothAnimation { raw = choice.next.rawValue }
        } label: {
            Image(systemName: choice.symbol)
                .font(.system(size: 13, weight: .medium))
                .contentTransition(reduceMotion ? .identity : .symbolEffect(.replace.downUp))
                .frame(width: 28, height: 28)
                .foregroundStyle(Gemba.textSubdued(scheme))
                .background(Squircle(radius: 8).fill(Gemba.surfaceSubdued(scheme)))
        }
        .buttonStyle(.plain)
        .smoothTooltip("Appearance: \(choice.rawValue.capitalized)")
        .accessibilityLabel("Appearance, \(choice.rawValue)")
    }
}
