"use client"

import { MotionConfig } from "motion/react"

/**
 * App-root reduced-motion default (belt-and-suspenders alongside the
 * per-preset `reduced` branches in `@/lib/motion`). `reducedMotion="user"`
 * makes every `motion.*` element in the tree honor
 * `prefers-reduced-motion: reduce` even for a component that has not yet
 * been migrated to `useMotionPreset()`.
 */
export function AppMotionConfig({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
