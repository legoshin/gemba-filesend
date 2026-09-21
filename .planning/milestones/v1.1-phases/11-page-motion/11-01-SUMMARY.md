---
phase: 11-page-motion
plan: 01
subsystem: ui
tags: [motion, react, nextjs, motion-react, animation]

# Dependency graph
requires:
  - phase: 09-smoothui-foundation
    provides: "src/lib/motion.ts transitions/variants foundation, useMotionPreset, MotionConfig"
  - phase: 10-component-reshape
    provides: "Reshaped shadcn/Radix component layer consuming the motion foundation"
provides:
  - "staggerContainer transition preset in src/lib/motion.ts — the single home for page/section stagger timing"
  - "PageEntrance/PageEntranceItem reusable client wrapper (src/components/page-entrance.tsx)"
  - "ScrollProgress reusable client component (src/components/scroll-progress.tsx), built but not yet mounted"
  - "Home page (src/app/page.tsx) wired with staggered entrance motion end-to-end"
affects: [11-02, 11-03, page-motion]

# Actuals (#2632)
actuals:
  tokens: 3000
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stagger container/item split: container sets initial/animate LABELS + staggerContainer transition; items inherit labels (no explicit initial/animate) and only set `variants` so Motion propagates stagger timing."
    - "Reduced-motion pattern for MotionValue-driven components (ScrollProgress): both useScroll+useSpring always called; only which MotionValue drives scaleX is conditional."

key-files:
  created:
    - src/components/page-entrance.tsx
    - src/components/scroll-progress.tsx
  modified:
    - src/lib/motion.ts
    - src/lib/motion.test.ts
    - design-system/MOTION.md
    - src/app/page.tsx

key-decisions:
  - "staggerChildren=0.08s, delayChildren=0.04s (Claude's discretion within the plan's ~0.06-0.09s/~0.02-0.05s ranges) — subtle, fast, once-on-mount."
  - "ScrollProgress bar colour: bg-primary (existing token, already used by progress.tsx/badge.tsx/button.tsx) — no new colour token."
  - "ScrollProgress built but deliberately left unmounted this plan — Wave 2 mounts it on the long upload/download pages per the plan's scope."

patterns-established:
  - "PageEntrance(children, className?) / PageEntranceItem(children, className?) — the Wave 2 interface for upload/download page entrance motion."
  - "ScrollProgress() — no-props, mount once per scrollable page — the Wave 2 interface for the long pages' scroll indicator."

requirements-completed: [MOT-01, MOT-02]

coverage:
  - id: D1
    description: "Home page hero + feature sections animate in with a staggered entrance on mount via PageEntrance/PageEntranceItem, reusing the staggerContainer + variants.stagger foundation presets."
    requirement: "MOT-01"
    verification:
      - kind: unit
        ref: "src/lib/motion.test.ts#staggerContainer is a spring with a positive staggerChildren"
        status: pass
      - kind: other
        ref: "npm run build (Next.js production build, includes route generation for /)"
        status: pass
    human_judgment: true
    rationale: "Visual staggered entrance and reduced-motion opacity-only degrade are perceptual outcomes deferred to Phase 12 manual verification per this plan's <verification> section; automated checks only prove wiring and build health."
  - id: D2
    description: "Reusable, reduced-motion-aware ScrollProgress component exists (useScroll + useSpring(scrollYProgress, transitions.fill), scaleX bound to spring or raw progress) and builds green, unmounted."
    requirement: "MOT-02"
    verification:
      - kind: other
        ref: "npm run build (Next.js production build)"
        status: pass
    human_judgment: false

# Metrics
duration: 25min
completed: 2026-09-21
status: complete
---

# Phase 11 Plan 01: Page Motion Tracer Summary

**staggerContainer foundation preset + reusable PageEntrance/PageEntranceItem wrapper wired end-to-end on the home page, plus a reusable ScrollProgress top-bar component built and ready for Wave 2.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-21T13:35:00Z
- **Completed:** 2026-09-21T14:00:00Z
- **Tasks:** 2
- **Files modified:** 6 (4 modified, 2 created)

## Accomplishments
- Added `staggerContainer` transition preset to `src/lib/motion.ts` — spreads `transitions.snappy`, adds `staggerChildren: 0.08` + `delayChildren: 0.04` — the single named home for page/section stagger timing.
- Built `<PageEntrance>`/`<PageEntranceItem>` (`src/components/page-entrance.tsx`, `"use client"`): container sets `initial`/`animate` labels and switches its transition between `staggerContainer` (full) and `{ duration: 0 }` (reduced); item reuses `variants.stagger` and deliberately omits its own `initial`/`animate` so it inherits the container's labels for stagger propagation.
- Wired `src/app/page.tsx`: hero and feature `<section>`s each wrapped in `PageEntranceItem` inside a `PageEntrance` container; home stays a Server Component (only the imported wrapper is `"use client"`); every existing class/content preserved byte-for-byte.
- Built `<ScrollProgress>` (`src/components/scroll-progress.tsx`, `"use client"`): `useScroll` + `useSpring(scrollYProgress, transitions.fill)` called unconditionally; `scaleX` bound to the spring under full motion or raw `scrollYProgress` under reduced motion; fixed `h-[2px]` top bar, `z-50`, `origin-left`, `aria-hidden`, `bg-primary` (existing token). Not mounted anywhere yet — ready for Wave 2's long pages.
- Documented `staggerContainer`, `PageEntrance`/`PageEntranceItem`, and `ScrollProgress` in `design-system/MOTION.md`; colour/type framing untouched.
- Added a `staggerContainer` assertion to `motion.test.ts` (spring type + positive `staggerChildren`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Entrance motion end-to-end on home — staggerContainer preset + PageEntrance wrapper + wire src/app/page.tsx** - `d4f7a54` (feat)
2. **Task 2: Build the reusable ScrollProgress component** - `a882ab2` (feat)

_Task 1 is a `type="tracer"` task; the tracer feedback gate (re-running `<verify>` end-to-end) passed before Task 2 began — architecture proven on the home page before Wave 2 touches the two long pages._

## Files Created/Modified
- `src/lib/motion.ts` - Added `staggerContainer` named export (container-level stagger transition)
- `src/lib/motion.test.ts` - Added `staggerContainer` spring/positive-staggerChildren assertion
- `design-system/MOTION.md` - Documented `staggerContainer`, `PageEntrance`/`PageEntranceItem`, and `ScrollProgress`
- `src/components/page-entrance.tsx` - New: `PageEntrance` (stagger container) + `PageEntranceItem` (stagger item)
- `src/app/page.tsx` - Hero + feature sections wired through `PageEntrance`/`PageEntranceItem`
- `src/components/scroll-progress.tsx` - New: `ScrollProgress` reduced-motion-aware top bar (unmounted this plan)

## Decisions Made
- `staggerChildren: 0.08`, `delayChildren: 0.04` chosen at the plan's discretion, within its documented ~0.06-0.09s / ~0.02-0.05s ranges — subtle and fast per the "file-share utility, not marketing site" guidance in 11-CONTEXT.md.
- `bg-primary` chosen for the ScrollProgress bar colour — an existing token already used by `progress.tsx`, `badge.tsx`, and `button.tsx` — over the `Chip variant="accent"` alternative offered in the plan, since `bg-primary` reads as a neutral progress-indicator colour in both themes without borrowing the accent chip's semantic meaning.
- `motion.div` used directly in both new components (not `motion.create(...)`) — no module-scope hoist needed, per the plan's explicit guidance.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Wave 2 plans (11-02, 11-03) can consume `PageEntrance`/`PageEntranceItem` and `ScrollProgress` directly by import from `@/components/page-entrance` and `@/components/scroll-progress` — no re-derivation needed:
- `PageEntrance({ children, className? })` — stagger container, `initial="initial" animate="animate"`.
- `PageEntranceItem({ children, className? })` — stagger item, no explicit initial/animate.
- `ScrollProgress()` — no props, mount once per scrollable page (upload/download).
- `staggerContainer` lives in `src/lib/motion.ts` — no page should declare a raw `staggerChildren` number.

Manual verification (visible stagger, reduced-motion fade collapse, light/dark/system rendering) is deferred to Phase 12 per this plan's `<verification>` section — not a gate on this plan or Wave 2.

---
*Phase: 11-page-motion*
*Completed: 2026-09-21*

## Self-Check: PASSED

All created/modified files confirmed present on disk; both task commits (`d4f7a54`, `a882ab2`) confirmed in git log.
