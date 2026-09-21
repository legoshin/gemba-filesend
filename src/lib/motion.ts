"use client";

import type { Transition } from "motion/react";
import { useReducedMotion } from "motion/react";

/**
 * Named transition presets. Values consolidated from SmoothUI's own
 * (uncentralized) per-component spring constants — see
 * .planning/phases/09-smoothui-foundation/09-RESEARCH.md Pattern 1 for
 * provenance of each value.
 */
export const transitions = {
  // Toggle thumb, toast enter/exit, dialog panel, list item stagger,
  // button loading-spinner — the most common "snappy" UI spring.
  snappy: { type: "spring", bounce: 0.1, duration: 0.25 } as const satisfies Transition,
} as const;

/**
 * Named variant pairs: `full` motion vs. `reduced` (opacity-only,
 * zero-duration) fallback. Resolved once per consumer via
 * `resolveMotionPreset`/`useMotionPreset` — never re-implemented inline.
 */
export const variants = {
  fadeSlideUp: {
    full: {
      initial: { opacity: 0, y: 14, scale: 0.95 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, scale: 0.9 },
    },
    reduced: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0, transition: { duration: 0 } },
    },
  },
} as const;

type MotionPreset = {
  full: object;
  reduced: object;
};

/**
 * Pure resolver: given a variants pair, a transition, and whether the user
 * prefers reduced motion, returns the props to spread onto a `motion.*`
 * element. No hook call inside — safe to unit test without a React render.
 */
export function resolveMotionPreset(
  preset: MotionPreset,
  transition: Transition,
  shouldReduceMotion: boolean
) {
  return {
    ...(shouldReduceMotion ? preset.reduced : preset.full),
    transition: shouldReduceMotion ? { duration: 0 } : transition,
  };
}

/** Resolve a variants pair + transition against the user's live motion preference. */
export function useMotionPreset(preset: MotionPreset, transition: Transition) {
  return resolveMotionPreset(preset, transition, useReducedMotion() ?? false);
}
