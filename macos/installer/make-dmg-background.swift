// Renders the DMG window background at 1x and 2x, then combines them into one
// HiDPI TIFF so Finder shows it crisp on Retina.
//
//   swift macos/installer/make-dmg-background.swift
//
// Layout contract with make-release.sh: 660×420 window, app icon centred at
// (170, 190), Applications at (490, 190), icons 112pt. Change one, change both.
import AppKit

let size = NSSize(width: 660, height: 420)
let here = URL(fileURLWithPath: CommandLine.arguments[0]).deletingLastPathComponent()

func color(_ hex: UInt32, _ alpha: CGFloat = 1) -> NSColor {
    NSColor(srgbRed: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255, alpha: alpha)
}

func render(scale: CGFloat) -> NSBitmapImageRep {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(size.width * scale),
                               pixelsHigh: Int(size.height * scale), bitsPerSample: 8, samplesPerPixel: 4,
                               hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
                               bytesPerRow: 0, bitsPerPixel: 0)!
    rep.size = size
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)

    // Gemba surface-page, with a soft brand wash in the top corner.
    color(0xF9FAFB).setFill()
    NSRect(origin: .zero, size: size).fill()
    let wash = NSGradient(colors: [color(0xFFDA44, 0.20), color(0xFFDA44, 0)])!
    wash.draw(in: NSBezierPath(ovalIn: NSRect(x: -140, y: 250, width: 420, height: 320)), relativeCenterPosition: .zero)

    func text(_ string: String, _ font: NSFont, _ hex: UInt32, y: CGFloat) {
        let style = NSMutableParagraphStyle(); style.alignment = .center
        let attributed = NSAttributedString(string: string, attributes: [
            .font: font, .foregroundColor: color(hex), .paragraphStyle: style])
        attributed.draw(in: NSRect(x: 0, y: y, width: size.width, height: 30))
    }

    // Finder draws icons in flipped space; this context is not flipped, so y
    // counts from the bottom: icon centres sit at 420 - 190 = 230.
    text("Gemba Filesend", .systemFont(ofSize: 20, weight: .semibold), 0x283349, y: 352)
    text("Drag the app into Applications", .systemFont(ofSize: 13, weight: .regular), 0x697080, y: 330)

    // The arrow between the two icons.
    let arrow = NSBezierPath()
    arrow.move(to: NSPoint(x: 262, y: 230))
    arrow.line(to: NSPoint(x: 392, y: 230))
    arrow.lineWidth = 3
    arrow.lineCapStyle = .round
    color(0x2066E6).setStroke()
    arrow.setLineDash([1, 9], count: 2, phase: 0)
    arrow.stroke()
    let head = NSBezierPath()
    head.move(to: NSPoint(x: 384, y: 242))
    head.line(to: NSPoint(x: 398, y: 230))
    head.line(to: NSPoint(x: 384, y: 218))
    head.lineWidth = 3
    head.lineCapStyle = .round
    head.lineJoinStyle = .round
    head.stroke()

    // The honest part: this build is not notarized, so say what to do if macOS
    // stops it, right where the person is looking.
    text("If macOS says it can't check the app: System Settings ▸ Privacy & Security ▸ Open Anyway",
         .systemFont(ofSize: 11, weight: .regular), 0x9499A4, y: 40)
    text("Encrypted on your Mac · send.gemba.uk", .systemFont(ofSize: 11, weight: .medium), 0x9499A4, y: 20)

    NSGraphicsContext.restoreGraphicsState()
    return rep
}

let reps = [render(scale: 1), render(scale: 2)]
let oneX = here.appendingPathComponent("dmg-background.png")
let twoX = here.appendingPathComponent("dmg-background@2x.png")
try reps[0].representation(using: .png, properties: [:])!.write(to: oneX)
try reps[1].representation(using: .png, properties: [:])!.write(to: twoX)

// One TIFF holding both resolutions — what Finder wants for a HiDPI background.
let tiff = here.appendingPathComponent("dmg-background.tiff")
let process = Process()
process.executableURL = URL(fileURLWithPath: "/usr/bin/tiffutil")
process.arguments = ["-cathidpicheck", oneX.path, twoX.path, "-out", tiff.path]
try process.run(); process.waitUntilExit()
try? FileManager.default.removeItem(at: oneX)
try? FileManager.default.removeItem(at: twoX)
print("wrote \(tiff.path)")
