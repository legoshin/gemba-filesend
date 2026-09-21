import SwiftUI

// MARK: - Animated Input

/// SmoothUI `animated-input`: a floating label that rises and shrinks to 0.85
/// when the field is focused or filled (0.28s), with the border strengthening
/// on focus. `secure` makes it a password field without changing the motion.
struct AnimatedInput: View {
    let label: String
    @Binding var text: String
    var secure = false
    var systemImage: String? = nil
    var onSubmit: () -> Void = {}

    @FocusState private var focused: Bool
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var floated: Bool { focused || !text.isEmpty }

    var body: some View {
        HStack(spacing: 8) {
            if let systemImage {
                Image(systemName: systemImage)
                    .font(.system(size: 12))
                    .foregroundStyle(focused ? Gemba.accent(scheme) : Gemba.textSubtle(scheme))
            }
            ZStack(alignment: .leading) {
                Text(label)
                    .font(.system(size: 13))
                    .foregroundStyle(focused ? Gemba.accent(scheme) : Gemba.textSubtle(scheme))
                    .scaleEffect(floated ? 0.85 : 1, anchor: .leading)
                    .offset(y: floated ? -11 : 0)
                    .allowsHitTesting(false)
                    .accessibilityHidden(true)
                Group {
                    if secure {
                        SecureField("", text: $text)
                    } else {
                        TextField("", text: $text)
                    }
                }
                .textFieldStyle(.plain)
                .font(.system(size: 13))
                .foregroundStyle(Gemba.textPrimary(scheme))
                .focused($focused)
                .offset(y: floated ? 6 : 0)
                .onSubmit(onSubmit)
                .accessibilityLabel(label)
            }
        }
        .padding(.horizontal, 12)
        .frame(height: 44)
        .background(Squircle(radius: 10).fill(Gemba.surfaceSubdued(scheme)))
        .overlay(
            Squircle(radius: 10)
                .strokeBorder(focused ? Gemba.accent(scheme) : Gemba.border(scheme), lineWidth: focused ? 1.5 : 1)
        )
        .animation(reduceMotion ? nil : Motion.label, value: floated)
        .animation(reduceMotion ? nil : Motion.smooth, value: focused)
        .contentShape(Rectangle())
        .onTapGesture { focused = true }
    }
}

// MARK: - Animated Toggle

/// SmoothUI `animated-toggle` (md: 44×24 track, 20pt thumb, 20pt travel): the
/// thumb slides on the house spring and the glyph inside it swaps with a quarter
/// turn — in from +90° at half size, out to -90°.
struct AnimatedToggle: View {
    let label: String
    @Binding var isOn: Bool
    var detail: String? = nil
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        Button {
            withAnimation(reduceMotion ? nil : Motion.smooth) { isOn.toggle() }
        } label: {
            HStack(alignment: .center, spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(label)
                        .font(.system(size: 13))
                        .foregroundStyle(Gemba.textPrimary(scheme))
                    if let detail {
                        Text(detail)
                            .font(.system(size: 11))
                            .foregroundStyle(Gemba.textSubtle(scheme))
                    }
                }
                Spacer(minLength: 8)
                track
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label)
        .accessibilityValue(isOn ? "On" : "Off")
        .accessibilityAddTraits(.isToggle)
    }

    private var track: some View {
        ZStack(alignment: .leading) {
            Capsule()
                .fill(isOn ? Gemba.accent(scheme) : Gemba.surfaceSubdued(scheme))
                .overlay(Capsule().strokeBorder(isOn ? .clear : Gemba.border(scheme), lineWidth: 1))
                .frame(width: 44, height: 24)
            Circle()
                .fill(.white)
                .shadow(color: .black.opacity(0.18), radius: 2, y: 1)
                .frame(width: 20, height: 20)
                .overlay {
                    ZStack {
                        if isOn {
                            Image(systemName: "checkmark")
                                .transition(.modifier(
                                    active: RotateScaleFade(angle: 90, scale: 0.5, opacity: 0),
                                    identity: RotateScaleFade(angle: 0, scale: 1, opacity: 1)))
                        } else {
                            Image(systemName: "xmark")
                                .transition(.modifier(
                                    active: RotateScaleFade(angle: -90, scale: 0.5, opacity: 0),
                                    identity: RotateScaleFade(angle: 0, scale: 1, opacity: 1)))
                        }
                    }
                    .font(.system(size: 9, weight: .heavy))
                    .foregroundStyle(isOn ? Gemba.accent(scheme) : Gemba.textSubtle(scheme))
                }
                .offset(x: isOn ? 22 : 2)
        }
    }
}

private struct RotateScaleFade: ViewModifier {
    let angle: Double
    let scale: CGFloat
    let opacity: Double
    func body(content: Content) -> some View {
        content.rotationEffect(.degrees(angle)).scaleEffect(scale).opacity(opacity)
    }
}

// MARK: - Animated Number Input

/// SmoothUI `animated-number-input`: digits roll 14pt in the direction of change
/// on the house spring; pushing past a bound shakes the field 6pt over 0.4s
/// instead of silently refusing; drag horizontally to scrub (4pt dead zone,
/// one step per 8pt); arrow keys step by 1, shift+arrow by 10.
struct AnimatedNumberInput: View {
    let label: String
    @Binding var value: Int
    let range: ClosedRange<Int>

    @State private var direction = 1
    @State private var shake: CGFloat = 0
    @State private var scrubOrigin: Int?
    @FocusState private var focused: Bool
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        HStack(spacing: 0) {
            stepButton("minus", delta: -1)
            Text("\(value)")
                .font(.system(size: 14, weight: .semibold).monospacedDigit())
                .foregroundStyle(Gemba.textPrimary(scheme))
                .id(value)
                .transition(reduceMotion ? .identity : .asymmetric(
                    insertion: .blurSlide(y: CGFloat(14 * direction)),
                    removal: .blurSlide(y: CGFloat(-14 * direction))))
                .frame(minWidth: 40)
                .clipped()
                .contentShape(Rectangle())
                .gesture(scrub)
                .onHover { inside in
                    if inside { NSCursor.resizeLeftRight.push() } else { NSCursor.pop() }
                }
            stepButton("plus", delta: 1)
        }
        .frame(height: 36)
        .background(Squircle(radius: 10).fill(Gemba.surfaceSubdued(scheme)))
        .overlay(Squircle(radius: 10).strokeBorder(focused ? Gemba.accent(scheme) : Gemba.border(scheme), lineWidth: 1))
        .offset(x: shake)
        .focusable()
        .focused($focused)
        .focusEffectDisabled()
        .onKeyPress(.upArrow) { step(NSEvent.modifierFlags.contains(.shift) ? 10 : 1); return .handled }
        .onKeyPress(.rightArrow) { step(NSEvent.modifierFlags.contains(.shift) ? 10 : 1); return .handled }
        .onKeyPress(.downArrow) { step(NSEvent.modifierFlags.contains(.shift) ? -10 : -1); return .handled }
        .onKeyPress(.leftArrow) { step(NSEvent.modifierFlags.contains(.shift) ? -10 : -1); return .handled }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label)
        .accessibilityValue("\(value)")
        .accessibilityAdjustableAction { direction in
            step(direction == .increment ? 1 : -1)
        }
    }

    private func stepButton(_ symbol: String, delta: Int) -> some View {
        Button { step(delta) } label: {
            Image(systemName: symbol)
                .font(.system(size: 10, weight: .bold))
                .frame(width: 30, height: 36)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .foregroundStyle(Gemba.textSubdued(scheme))
        .accessibilityHidden(true)
    }

    private var scrub: some Gesture {
        DragGesture(minimumDistance: 4)
            .onChanged { drag in
                if scrubOrigin == nil { scrubOrigin = value }
                let target = (scrubOrigin ?? value) + Int(drag.translation.width / 8)
                set(target)
            }
            .onEnded { _ in scrubOrigin = nil }
    }

    private func step(_ delta: Int) { set(value + delta) }

    private func set(_ target: Int) {
        let clamped = min(max(target, range.lowerBound), range.upperBound)
        if clamped != target && clamped == value {
            bump()
            return
        }
        guard clamped != value else { return }
        direction = clamped > value ? 1 : -1
        withAnimation(reduceMotion ? nil : Motion.smooth) { value = clamped }
    }

    /// The bound was hit: say so with a shake rather than doing nothing.
    private func bump() {
        guard !reduceMotion else { NSSound.beep(); return }
        let keyframes: [CGFloat] = [6, -6, 4, -4, 2, 0]
        for (index, x) in keyframes.enumerated() {
            withAnimation(.easeInOut(duration: 0.4 / Double(keyframes.count)).delay(Double(index) * 0.4 / Double(keyframes.count))) {
                shake = x
            }
        }
    }
}

// MARK: - Animated Tabs

/// SmoothUI `animated-tabs`: a pill slides between options on the house spring.
struct AnimatedTabs<Option: Hashable & Identifiable>: View {
    let options: [Option]
    @Binding var selection: Option
    let title: (Option) -> String
    @Namespace private var pill
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        HStack(spacing: 2) {
            ForEach(options) { option in
                let selected = option == selection
                Button {
                    withAnimation(reduceMotion ? nil : Motion.smooth) { selection = option }
                } label: {
                    Text(title(option))
                        .font(.system(size: 12, weight: selected ? .semibold : .regular))
                        .foregroundStyle(selected ? Gemba.textPrimary(scheme) : Gemba.textSubdued(scheme))
                        .padding(.horizontal, 10)
                        .frame(height: 28)
                        .background {
                            if selected {
                                Squircle(radius: 7)
                                    .fill(Gemba.buttonEmphasizedBG(scheme))
                                    .shadow(color: .black.opacity(scheme == .dark ? 0.3 : 0.08), radius: 2, y: 1)
                                    .matchedGeometryEffect(id: "pill", in: pill)
                            }
                        }
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(selected ? [.isSelected, .isButton] : .isButton)
            }
        }
        .padding(3)
        .background(Squircle(radius: 10).fill(Gemba.surfaceSubdued(scheme)))
    }
}

// MARK: - Duration Picker

/// SmoothUI `duration-picker`, fitted to what the server accepts: an amount
/// (an animated number input) and a unit (animated tabs) — hours, days or
/// months, the same three units the web upload page offers — capped at the
/// server's one-year limit. Changing unit keeps the amount if it still fits.
enum ExpiryUnit: String, CaseIterable, Identifiable {
    case hours, days, months
    var id: String { rawValue }
    var title: String { rawValue.capitalized }
    var seconds: TimeInterval {
        switch self {
        case .hours: 3600
        case .days: 24 * 3600
        case .months: 30 * 24 * 3600   // matches the web app's EXPIRY_UNIT_MS
        }
    }
    /// Largest amount that stays inside the server's 365-day cap.
    var maxAmount: Int {
        switch self { case .hours: 8760; case .days: 365; case .months: 12 }
    }
}

struct DurationPicker: View {
    @Binding var amount: Int
    @Binding var unit: ExpiryUnit

    var body: some View {
        HStack(spacing: 8) {
            AnimatedNumberInput(label: "Expires after", value: $amount, range: 1...unit.maxAmount)
            AnimatedTabs(options: ExpiryUnit.allCases, selection: $unit, title: \.title)
        }
        .onChange(of: unit) { _, newUnit in
            if amount > newUnit.maxAmount { amount = newUnit.maxAmount }
        }
    }
}

// MARK: - Animated Tags

/// SmoothUI `animated-tags`: chips blur up into place (y 20, blur 4) and the
/// rest reflow around additions and removals.
struct AnimatedTags: View {
    @Binding var tags: [String]
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        FlowLayout(spacing: 6) {
            ForEach(tags, id: \.self) { tag in
                HStack(spacing: 5) {
                    Text(tag)
                        .font(.system(size: 11))
                        .lineLimit(1)
                    Button {
                        withAnimation(reduceMotion ? nil : Motion.smooth) { tags.removeAll { $0 == tag } }
                    } label: {
                        Image(systemName: "xmark").font(.system(size: 8, weight: .bold))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Remove \(tag)")
                }
                .padding(.horizontal, 9)
                .padding(.vertical, 5)
                .foregroundStyle(Gemba.textPrimary(scheme))
                .background(Capsule().fill(Gemba.surfaceSubdued(scheme)))
                .overlay(Capsule().strokeBorder(Gemba.border(scheme), lineWidth: 1))
                .transition(reduceMotion ? .opacity : .tag)
            }
        }
        .animation(reduceMotion ? nil : Motion.smooth, value: tags)
    }
}

/// A wrapping row: children fill a line, then continue on the next. Used by the
/// tags so any number of addresses of any length reflow instead of clipping.
struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = arrange(width: proposal.width ?? .infinity, subviews: subviews)
        let height = rows.last.map { $0.y + $0.height } ?? 0
        let width = rows.map(\.width).max() ?? 0
        return CGSize(width: proposal.width ?? width, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        for row in arrange(width: bounds.width, subviews: subviews) {
            var x = bounds.minX
            for index in row.indices {
                let size = subviews[index].sizeThatFits(.unspecified)
                subviews[index].place(at: CGPoint(x: x, y: bounds.minY + row.y), proposal: ProposedViewSize(size))
                x += size.width + spacing
            }
        }
    }

    private struct Row { var indices: [Int] = []; var y: CGFloat = 0; var width: CGFloat = 0; var height: CGFloat = 0 }

    private func arrange(width: CGFloat, subviews: Subviews) -> [Row] {
        var rows: [Row] = [Row()]
        for index in subviews.indices {
            let size = subviews[index].sizeThatFits(.unspecified)
            var row = rows[rows.count - 1]
            let needed = row.indices.isEmpty ? size.width : row.width + spacing + size.width
            if needed > width && !row.indices.isEmpty {
                let y = row.y + row.height + spacing
                rows.append(Row(indices: [index], y: y, width: size.width, height: size.height))
                continue
            }
            row.indices.append(index)
            row.width = needed
            row.height = max(row.height, size.height)
            rows[rows.count - 1] = row
        }
        return rows.filter { !$0.indices.isEmpty }
    }
}
