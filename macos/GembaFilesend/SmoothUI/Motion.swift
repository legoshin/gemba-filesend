import SwiftUI

// SmoothUI for SwiftUI.
//
// Native reimplementations of components from SmoothUI (https://smoothui.dev,
// MIT, © 2024 Eduardo Calvo). SmoothUI is React + Motion; nothing here is
// ported code — these are SwiftUI views rebuilt to the same motion spec, and
// every number below is taken from the named SmoothUI component's source so the
// two libraries feel the same. Colours come from the Gemba tokens (GembaTheme),
// not SmoothUI's theme: SmoothUI supplies the behaviour, Gemba the palette.
//
// Every animated component reads `accessibilityReduceMotion` and, when it is
// on, applies changes instantly — SmoothUI does the same with
// `prefers-reduced-motion`.

enum Motion {
    /// SmoothUI's house spring — `{ type: "spring", duration: 0.25, bounce: 0.1 }`.
    /// Used by file upload, toggle, list, tooltip, tags, swap panel and more.
    /// SwiftUI's `spring(duration:bounce:)` takes the same two parameters, so
    /// this is a one-to-one mapping, not an approximation.
    static let smooth = Animation.spring(duration: 0.25, bounce: 0.1)

    /// `SPRING_BOUNCY` from animated-file-upload — the drop-zone icon's float.
    static let bouncy = Animation.spring(duration: 0.3, bounce: 0.2)

    /// basic-accordion's content spring: stiffness 500, damping 40.
    static let accordion = Animation.interpolatingSpring(stiffness: 500, damping: 40)
    /// basic-accordion's chevron: 180° over 0.2s.
    static let chevron = Animation.easeOut(duration: 0.2)

    /// animated-progress-bar: mass 0.75, stiffness 100, damping 10 — deliberately
    /// underdamped, so the fill overshoots a touch and settles.
    static let progress = Animation.interpolatingSpring(mass: 0.75, stiffness: 100, damping: 10)

    /// number-flow: 300ms, cubic-bezier(0.22, 1, 0.36, 1).
    static let numberFlow = Animation.timingCurve(0.22, 1, 0.36, 1, duration: 0.3)

    /// animated-input's floating label: 0.28s.
    static let label = Animation.easeOut(duration: 0.28)

    /// notification-badge: spring, bounce 0.1, 0.3s.
    static let badge = Animation.spring(duration: 0.3, bounce: 0.1)

    /// basic-modal backdrop: 0.2s fade.
    static let backdrop = Animation.easeOut(duration: 0.2)

    /// The quick exit SmoothUI uses on removals (file row, text-morph): 0.15s.
    static let exit = Animation.easeOut(duration: 0.15)
}

extension View {
    /// `withAnimation` that respects Reduce Motion — the change still happens,
    /// just without movement.
    func smoothAnimation<V: Equatable>(_ animation: Animation = Motion.smooth, value: V, reduce: Bool) -> some View {
        self.animation(reduce ? nil : animation, value: value)
    }
}

/// Runs `body` with `animation`, or instantly when Reduce Motion is on.
@MainActor
func withSmoothAnimation(_ animation: Animation = Motion.smooth, _ body: () -> Void) {
    if NSWorkspace.shared.accessibilityDisplayShouldReduceMotion {
        body()
    } else {
        withAnimation(animation, body)
    }
}

// MARK: - Transitions

/// Offset + blur + opacity — the SmoothUI signature move. button-copy uses
/// y ±25 / blur 10, animated-tags y 20 / blur 4, shimmer-sweep x -22 / blur 8.
struct BlurSlideModifier: ViewModifier {
    let x: CGFloat
    let y: CGFloat
    let blur: CGFloat
    let scale: CGFloat
    let opacity: Double

    func body(content: Content) -> some View {
        content
            .offset(x: x, y: y)
            .blur(radius: blur)
            .scaleEffect(scale)
            .opacity(opacity)
    }
}

extension AnyTransition {
    static func blurSlide(x: CGFloat = 0, y: CGFloat = 0, blur: CGFloat = 0, scale: CGFloat = 1) -> AnyTransition {
        .modifier(
            active: BlurSlideModifier(x: x, y: y, blur: blur, scale: scale, opacity: 0),
            identity: BlurSlideModifier(x: 0, y: 0, blur: 0, scale: 1, opacity: 1)
        )
    }

    /// button-copy: enters from above blurred, leaves downward blurred —
    /// `initial {y:-25, blur 10}`, `exit {y:25, blur 10}`. Scaled to icon size.
    static var copySwap: AnyTransition {
        .asymmetric(
            insertion: .blurSlide(y: -12, blur: 10),
            removal: .blurSlide(y: 12, blur: 10)
        )
    }

    /// animated-file-upload rows: in from the left `{x:-16, scale .95}`, out to
    /// the right `{x:24, scale .95}` in 0.15s.
    static var fileRow: AnyTransition {
        .asymmetric(
            insertion: .blurSlide(x: -16, scale: 0.95),
            removal: .blurSlide(x: 24, scale: 0.95).animation(Motion.exit)
        )
    }

    /// animated-tags: `{y:20, blur 4}` both ways.
    static var tag: AnyTransition { .blurSlide(y: 20, blur: 4) }

    /// basic-toast: `{x:50, scale .8}`.
    static var toast: AnyTransition { .blurSlide(x: 50, scale: 0.8) }

    /// swap-panel: new content rises from y 12, old leaves to y -12.
    static var swapPanel: AnyTransition {
        .asymmetric(insertion: .blurSlide(y: 12), removal: .blurSlide(y: -12))
    }

    /// animated-file-upload hint text: `{y:4}` in, `{y:-4}` out, 0.15s.
    static var hintSwap: AnyTransition {
        .asymmetric(insertion: .blurSlide(y: 4), removal: .blurSlide(y: -4))
    }
}

// MARK: - Squircle

/// SmoothUI's squircle traces continuous-curvature corners by hand; SwiftUI's
/// `.continuous` corner style is the platform's own squircle, so every surface
/// here uses it.
struct Squircle: InsettableShape {
    var radius: CGFloat
    var inset: CGFloat = 0

    func path(in rect: CGRect) -> Path {
        RoundedRectangle(cornerRadius: max(0, radius - inset), style: .continuous)
            .path(in: rect.insetBy(dx: inset, dy: inset))
    }

    func inset(by amount: CGFloat) -> Squircle {
        Squircle(radius: radius, inset: inset + amount)
    }
}
