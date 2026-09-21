"use client";

import { motion, useReducedMotion } from "motion/react";

import { staggerContainer, variants } from "@/lib/motion";

interface PageEntranceProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Stagger CONTAINER for a page/section entrance. Sets the `initial`/
 * `animate` variant LABELS; children (`PageEntranceItem`) inherit those
 * labels from Motion's parent/child propagation and only supply their own
 * `variants` — never their own `initial`/`animate` — so the container's
 * `staggerContainer` timing reaches every item. Reduced motion collapses
 * the stagger to a zero-duration transition (items still resolve to their
 * own opacity-only reduced variant).
 */
export function PageEntrance({ children, className }: PageEntranceProps) {
  const reduce = useReducedMotion() ?? false;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{
        animate: { transition: reduce ? { duration: 0 } : staggerContainer },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface PageEntranceItemProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Stagger ITEM. Reuses `variants.stagger` (full/reduced) and inherits its
 * `initial`/`animate` labels from the parent `PageEntrance` — no explicit
 * `initial`/`animate` here, since setting either on the item breaks Motion's
 * stagger propagation from the container.
 */
export function PageEntranceItem({ children, className }: PageEntranceItemProps) {
  const reduce = useReducedMotion() ?? false;

  return (
    <motion.div
      variants={reduce ? variants.stagger.reduced : variants.stagger.full}
      className={className}
    >
      {children}
    </motion.div>
  );
}
