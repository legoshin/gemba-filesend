import SwiftUI

// MARK: - Number Flow

/// SmoothUI `number-flow`: digits roll to their new value (300ms,
/// cubic-bezier(0.22, 1, 0.36, 1)). SwiftUI's numeric content transition is
/// the same digit-roll, driven by the same curve.
struct NumberFlow: View {
    let value: Double
    var format: (Double) -> String = { String(Int($0.rounded())) }
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        Text(format(value))
            .monospacedDigit()
            .contentTransition(reduceMotion ? .identity : .numericText(value: value))
            .animation(reduceMotion ? nil : Motion.numberFlow, value: value)
    }
}

// MARK: - Text Morph

/// SmoothUI `text-morph`: when the string changes, characters that stay put
/// glide to their new place and new ones pop in — scale 0.72, 6pt below,
/// staggered 16ms apart (capped at 260ms); leaving ones shrink out in 0.15s.
struct TextMorph: View {
    let text: String
    var font: Font = .system(size: 14, weight: .semibold)
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Namespace private var glyphs

    private struct Glyph: Identifiable, Hashable {
        let id: String      // character + its occurrence count, so repeats stay distinct
        let character: Character
        let index: Int
    }

    private var glyphList: [Glyph] {
        var seen: [Character: Int] = [:]
        return text.enumerated().map { offset, character in
            let n = seen[character, default: 0]
            seen[character] = n + 1
            return Glyph(id: "\(character)-\(n)", character: character, index: offset)
        }
    }

    var body: some View {
        if reduceMotion {
            Text(text).font(font)
        } else {
            HStack(spacing: 0) {
                ForEach(glyphList) { glyph in
                    Text(String(glyph.character))
                        .font(font)
                        .matchedGeometryEffect(id: glyph.id, in: glyphs)
                        .transition(
                            .asymmetric(
                                insertion: .blurSlide(y: 6, scale: 0.72)
                                    .animation(Motion.smooth.delay(min(Double(glyph.index) * 0.016, 0.26))),
                                removal: .blurSlide(scale: 0.72).animation(Motion.exit)
                            )
                        )
                }
            }
            .animation(Motion.smooth, value: text)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(text)
        }
    }
}

// MARK: - Shimmer Sweep

/// SmoothUI `shimmer-sweep`: the whole line glides in from the left while its
/// blur dissolves — x -22, blur 8, 0.85s. Used once, on the header.
struct ShimmerSweep: View {
    let text: String
    var font: Font
    var delay: Double = 0
    @State private var shown = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        Text(text)
            .font(font)
            .modifier(BlurSlideModifier(
                x: shown || reduceMotion ? 0 : -22, y: 0,
                blur: shown || reduceMotion ? 0 : 8, scale: 1,
                opacity: shown || reduceMotion ? 1 : 0))
            .onAppear {
                guard !reduceMotion else { return }
                withAnimation(.easeOut(duration: 0.85).delay(delay)) { shown = true }
            }
    }
}

// MARK: - Soft Blur In

/// SmoothUI `soft-blur-in`: Apple's hero-title reveal — each character fades up
/// from 16pt below out of a 12pt blur, 0.9s, staggered.
struct SoftBlurIn: View {
    let text: String
    var font: Font
    var stagger: Double = 0.025
    @State private var shown = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(text.enumerated()), id: \.offset) { index, character in
                Text(String(character))
                    .font(font)
                    .modifier(BlurSlideModifier(
                        x: 0, y: shown || reduceMotion ? 0 : 16,
                        blur: shown || reduceMotion ? 0 : 12, scale: 1,
                        opacity: shown || reduceMotion ? 1 : 0))
                    .animation(reduceMotion ? nil : .easeOut(duration: 0.9).delay(Double(index) * stagger), value: shown)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(text)
        .onAppear { shown = true }
    }
}

// MARK: - Spring Scale In

/// SmoothUI `spring-scale-in`: an iOS app-icon pop — scale 0.7 → 1 with a soft
/// overshoot, 0.36s.
struct SpringScaleIn<Content: View>: View {
    var delay: Double = 0
    @ViewBuilder let content: Content
    @State private var shown = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        content
            .scaleEffect(shown || reduceMotion ? 1 : 0.7)
            .opacity(shown || reduceMotion ? 1 : 0)
            .onAppear {
                guard !reduceMotion else { return }
                withAnimation(.spring(duration: 0.36, bounce: 0.35).delay(delay)) { shown = true }
            }
    }
}

// MARK: - Scramble

/// SmoothUI `scramble-hover`, turned into a reveal: the text starts as noise and
/// resolves left to right. On the share link it reads as exactly what happened —
/// scrambled bytes becoming a working link.
struct ScrambleText: View {
    let text: String
    var font: Font = .system(size: 11, design: .monospaced)
    var duration: Double = 0.9
    @State private var start = Date()
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private static let noise = Array("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_")

    var body: some View {
        if reduceMotion {
            Text(text).font(font)
        } else {
            TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { context in
                let elapsed = context.date.timeIntervalSince(start)
                let resolved = Int(Double(text.count) * min(1, elapsed / duration))
                Text(scrambled(resolvedCount: resolved, tick: Int(elapsed * 30)))
                    .font(font)
            }
            .onAppear { start = Date() }
            .onChange(of: text) { _, _ in start = Date() }
            .accessibilityLabel(text)
        }
    }

    private func scrambled(resolvedCount: Int, tick: Int) -> String {
        guard resolvedCount < text.count else { return text }
        return String(text.enumerated().map { index, character in
            if index < resolvedCount || character == "/" || character == ":" || character == "." { return character }
            // Deterministic per tick, so it flickers rather than strobes.
            return Self.noise[(index &* 31 &+ tick &* 7) % Self.noise.count]
        })
    }
}
