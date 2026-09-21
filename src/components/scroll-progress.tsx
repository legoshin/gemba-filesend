"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";

import { transitions } from "@/lib/motion";

/**
 * Shared thin top bar tracking whole-document/window scroll progress.
 * Reuses `transitions.fill` (the same damped spring already used for
 * progress-bar fills) as its `useSpring` config so the bar carries no new
 * spring numbers. Mount once per scrollable page (the long upload/download
 * pages, not the short home page).
 *
 * Both `useScroll` and `useSpring` are called unconditionally — only which
 * MotionValue drives `scaleX` (smoothed vs. raw) is conditional, since hooks
 * must never be called conditionally.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, transitions.fill);
  const reduce = useReducedMotion() ?? false;
  const scaleX = reduce ? scrollYProgress : smooth;

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-50 h-[var(--space-1)] origin-left bg-primary"
      style={{ scaleX }}
    />
  );
}
