import { describe, expect, it } from "vitest"

import { resolveMotionPreset, transitions, variants } from "@/lib/motion"

const TRANSFORM_KEYS = ["x", "y", "scale", "rotate"] as const

describe("resolveMotionPreset", () => {
  it("returns the full branch with the passed transition when reduced motion is false", () => {
    const preset = variants.fadeSlideUp
    const result = resolveMotionPreset(preset, transitions.snappy, false)
    expect(result).toMatchObject(preset.full)
    expect(result.transition).toEqual(transitions.snappy)
  })

  it("returns the reduced branch with a zero-duration transition when reduced motion is true", () => {
    const preset = variants.fadeSlideUp
    const result = resolveMotionPreset(preset, transitions.snappy, true)
    expect(result).toMatchObject(preset.reduced)
    expect(result.transition).toEqual({ duration: 0 })
  })
})

describe("variants reduced-motion contract", () => {
  it.each(Object.entries(variants))(
    "%s: reduced branch is opacity-only (no transform keys) in initial/animate",
    (_name, pair) => {
      const reduced = pair.reduced as {
        initial?: Record<string, unknown>
        animate?: Record<string, unknown>
      }

      for (const key of TRANSFORM_KEYS) {
        expect(reduced.initial ?? {}).not.toHaveProperty(key)
        expect(reduced.animate ?? {}).not.toHaveProperty(key)
      }
    }
  )
})

describe("transitions inventory", () => {
  it("exports snappy/fill/micro/backdrop with exact numeric configs", () => {
    expect(transitions.snappy).toEqual({
      type: "spring",
      bounce: 0.1,
      duration: 0.25,
    })
    expect(transitions.fill).toEqual({
      type: "spring",
      stiffness: 100,
      damping: 10,
      mass: 0.75,
      duration: 0.25,
    })
    expect(transitions.micro).toEqual({
      type: "spring",
      stiffness: 400,
      damping: 24,
      duration: 0.2,
    })
    expect(transitions.backdrop).toEqual({
      duration: 0.2,
      ease: "easeOut",
    })
  })
})

describe("variants inventory", () => {
  it("exports the full preset set required by the phase", () => {
    const expectedNames = [
      "fadeSlideUp",
      "scaleIn",
      "tapPress",
      "hover",
      "stagger",
      "toast",
      "progress",
      "menu",
    ]
    for (const name of expectedNames) {
      expect(variants).toHaveProperty(name)
    }
  })

  it("tapPress/hover reduced states carry no transform keys either", () => {
    const tapReduced = variants.tapPress.reduced as Record<string, unknown>
    const hoverReduced = variants.hover.reduced as Record<string, unknown>
    const tapWhileTap = (tapReduced.whileTap ?? {}) as Record<string, unknown>
    const hoverWhileHover = (hoverReduced.whileHover ?? {}) as Record<
      string,
      unknown
    >

    for (const key of TRANSFORM_KEYS) {
      expect(tapWhileTap).not.toHaveProperty(key)
      expect(hoverWhileHover).not.toHaveProperty(key)
    }
  })
})
