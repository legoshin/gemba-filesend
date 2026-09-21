"use client";

import type { Transition } from "motion/react";
import { useReducedMotion } from "motion/react";

import { resolveMotionPreset, type MotionPreset } from "@/lib/motion";

/**
 * Resolve a variants pair + transition against the user's live motion
 * preference. Split into its own client-only module (separate from
 * `src/lib/motion.ts`) so the pure transition/variant data and
 * `resolveMotionPreset` stay import-safe from Server Components — only this
 * hook needs a client boundary (see 09-REVIEW.md WR-03).
 */
export function useMotionPreset<F extends object, R extends object>(
  preset: MotionPreset<F, R>,
  transition: Transition
) {
  return resolveMotionPreset(preset, transition, useReducedMotion() ?? false);
}
