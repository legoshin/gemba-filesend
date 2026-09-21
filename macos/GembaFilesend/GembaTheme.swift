import SwiftUI

/// The Gemba design tokens, transcribed from `design-system/tokens/colors.css`
/// and the `.dark` block in `src/app/globals.css`. Values are not invented here:
/// when something isn't covered, derive it from the nearest token, the same rule
/// the web app follows.
enum Gemba {
    // Base palette (light)
    static let ink900 = Color(hex: 0x181D27)
    static let ink800 = Color(hex: 0x283349)   // primary text, buttons, icons
    static let ink500 = Color(hex: 0x697080)
    static let ink400 = Color(hex: 0x9499A4)
    static let yellow = Color(hex: 0xFFDA44)   // the brand mark

    /// Semantic tokens, resolved per colour scheme the way the CSS `.dark`
    /// override does — one authoring point, both appearances.
    static func surfacePage(_ s: ColorScheme) -> Color { s == .dark ? Color(hex: 0x0A0B0D) : Color(hex: 0xF9FAFB) }
    static func surfaceCard(_ s: ColorScheme) -> Color { s == .dark ? Color(hex: 0x16171A) : .white }
    static func surfaceSubdued(_ s: ColorScheme) -> Color { s == .dark ? Color(hex: 0x1F2024) : Color(hex: 0xF3F5F6) }

    static func textPrimary(_ s: ColorScheme) -> Color { s == .dark ? Color(hex: 0xF4F5F7) : ink800 }
    static func textSubdued(_ s: ColorScheme) -> Color { s == .dark ? Color(hex: 0xA2A8B4) : ink500 }
    static func textSubtle(_ s: ColorScheme) -> Color { s == .dark ? Color(hex: 0x7A808C) : ink400 }

    static func border(_ s: ColorScheme) -> Color {
        s == .dark ? Color.white.opacity(0.10) : Color(hex: 0xE8EAED)
    }
    static func borderStrong(_ s: ColorScheme) -> Color {
        s == .dark ? Color.white.opacity(0.24) : ink800
    }

    /// `--button-emphasized-bg`: #E8EAED light, #2A2C31 dark. Used where a raised
    /// surface has to separate from `surfaceSubdued` (the selected tab pill).
    /// Light mode uses the white card instead, which reads better on #F3F5F6.
    static func buttonEmphasizedBG(_ s: ColorScheme) -> Color { s == .dark ? Color(hex: 0x2A2C31) : .white }
    static func buttonPrimaryBG(_ s: ColorScheme) -> Color { s == .dark ? Color(hex: 0xF4F5F7) : ink800 }
    static func buttonPrimaryFG(_ s: ColorScheme) -> Color { s == .dark ? Color(hex: 0x0A0B0D) : .white }

    static func accent(_ s: ColorScheme) -> Color { s == .dark ? Color(hex: 0x5B9CFF) : Color(hex: 0x2066E6) }
    static func success(_ s: ColorScheme) -> Color { s == .dark ? Color(hex: 0x4EC06A) : Color(hex: 0x20982E) }
    static func warning(_ s: ColorScheme) -> Color { s == .dark ? Color(hex: 0xE7B02E) : Color(hex: 0xCD8C00) }
    static func critical(_ s: ColorScheme) -> Color { s == .dark ? Color(hex: 0xF08585) : Color(hex: 0xE95E5E) }
    static func criticalSubdued(_ s: ColorScheme) -> Color { critical(s).opacity(s == .dark ? 0.16 : 0.08) }
    static func accentSubdued(_ s: ColorScheme) -> Color { accent(s).opacity(s == .dark ? 0.16 : 0.08) }
    static func successSubdued(_ s: ColorScheme) -> Color { success(s).opacity(s == .dark ? 0.16 : 0.08) }

    // Radii and spacing, from tokens/spacing.css
    enum Radius {
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 24
    }
    enum Space {
        static let x3: CGFloat = 8
        static let x4: CGFloat = 12
        static let x5: CGFloat = 16
        static let x6: CGFloat = 24
        static let x7: CGFloat = 32
    }
}

extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }
}

// Buttons, cards and every other component live in SmoothUI/ — this file is
// only the Gemba palette and spacing they draw with.
