import type { Transition } from "motion/react";

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
  // Progress bar fill — heavier, more damped, no bounce. Physics-only: no
  // `duration` field — motion-dom ignores `duration` whenever stiffness/
  // damping/mass are present, so a declared duration here would be dead
  // configuration (see 09-REVIEW.md WR-01).
  fill: {
    type: "spring",
    stiffness: 100,
    damping: 10,
    mass: 0.75,
  } as const satisfies Transition,
  // Micro hover/press motion (few px of travel) — clip-corner triangles.
  // Physics-only, see `fill` comment above.
  micro: {
    type: "spring",
    stiffness: 400,
    damping: 24,
  } as const satisfies Transition,
  // Backdrop fade (dialog/sheet scrim) — plain tween, no spring.
  backdrop: { duration: 0.2, ease: "easeOut" } as const satisfies Transition,
} as const;

/**
 * Named variant pairs: `full` motion vs. `reduced` (opacity-only,
 * zero-duration) fallback. Resolved once per consumer via
 * `resolveMotionPreset`/`useMotionPreset` — never re-implemented inline.
 */
export const variants = {
  // Entrance/exit — cards, panels, proof-of-layer consumers (chip.tsx).
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
  // Entrance/exit — dropdown/dialog panels, scale-focused (no lateral travel).
  scaleIn: {
    full: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.9 },
    },
    reduced: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0, transition: { duration: 0 } },
    },
  },
  // Press feedback (`whileTap`). Reduced motion drops the scale entirely.
  tapPress: {
    full: { whileTap: { scale: 0.97 } },
    reduced: { whileTap: {} },
  },
  // Hover feedback (`whileHover`). Reduced motion drops the scale entirely.
  hover: {
    full: { whileHover: { scale: 1.02 } },
    reduced: { whileHover: {} },
  },
  // List item entrance for a staggered container. The container itself sets
  // `transition: { ...transitions.snappy, staggerChildren: N }` on its own
  // `animate` prop (Motion propagates stagger timing to children automatically);
  // this preset covers each item's own entrance/exit.
  stagger: {
    full: {
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0 },
    },
    reduced: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0, transition: { duration: 0 } },
    },
  },
  // Toast enter/exit — lateral slide-in.
  toast: {
    full: {
      initial: { opacity: 0, scale: 0.8, x: 50 },
      animate: { opacity: 1, scale: 1, x: 0 },
      exit: {
        opacity: 0,
        scale: 0.8,
        x: 50,
        transition: { duration: 0.15 },
      },
    },
    reduced: {
      initial: { opacity: 1 },
      animate: { opacity: 1 },
      exit: { opacity: 0, transition: { duration: 0 } },
    },
  },
  // Progress bar container reveal — paired with `transitions.fill`. The fill
  // amount itself is driven by the Phase 10/11 consumer (a MotionValue/style),
  // not by this variant pair.
  progress: {
    full: {
      initial: { opacity: 0, scale: 0.98 },
      animate: { opacity: 1, scale: 1 },
    },
    reduced: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
    },
  },
  // Dropdown/dialog open-close.
  menu: {
    full: {
      initial: { opacity: 0, scale: 0.96, y: -4 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: {
        opacity: 0,
        scale: 0.96,
        y: -4,
        transition: { duration: 0.15 },
      },
    },
    reduced: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0, transition: { duration: 0 } },
    },
  },
} as const;

/** A `{ full, reduced }` variant pair, generic over each branch's actual shape. */
export type MotionPreset<F extends object = object, R extends object = object> = {
  full: F;
  reduced: R;
};

/**
 * Pure resolver: given a variants pair, a transition, and whether the user
 * prefers reduced motion, returns the props to spread onto a `motion.*`
 * element. No hook call inside — safe to unit test without a React render.
 *
 * Generic over the preset's branch shapes so the returned object keeps its
 * spread properties (e.g. `initial`/`animate`/`exit`) under `tsc --strict`
 * instead of widening to `object` (see 09-REVIEW.md WR-02).
 */
export function resolveMotionPreset<F extends object, R extends object>(
  preset: MotionPreset<F, R>,
  transition: Transition,
  shouldReduceMotion: boolean
) {
  return {
    ...(shouldReduceMotion ? preset.reduced : preset.full),
    transition: shouldReduceMotion ? { duration: 0 } : transition,
  };
}
