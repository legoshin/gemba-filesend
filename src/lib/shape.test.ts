import { describe, expect, it } from "vitest"

import { clipCorner, shape } from "@/lib/shape"

// Every `shape` value must reference an existing Gemba radius/ring token —
// no raw hex colour, no bespoke pixel value, no new custom property name.
const ALLOWED_SHAPE_PATTERN =
  /^(rounded-\[var\(--radius-[a-z0-9]+\)\]|rounded-full|shadow-\[var\(--ring-[a-z]+\)\]|focus-visible:shadow-\[var\(--ring-[a-z]+\)\])$/

describe("shape", () => {
  it.each(Object.entries(shape))(
    "%s: %s matches an allowed existing-token pattern",
    (_name, value) => {
      expect(value).toMatch(ALLOWED_SHAPE_PATTERN)
    }
  )

  it("contains no raw hex colours or bespoke custom properties", () => {
    for (const value of Object.values(shape)) {
      expect(value).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    }
  })
})

describe("clipCorner", () => {
  it("exposes the three expected numeric geometry constants", () => {
    expect(typeof clipCorner.triangleSizePx).toBe("number")
    expect(typeof clipCorner.insetPx).toBe("number")
    expect(typeof clipCorner.hoverMovePx).toBe("number")
  })
})
