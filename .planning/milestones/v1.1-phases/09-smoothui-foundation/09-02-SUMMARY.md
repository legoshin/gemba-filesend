---
phase: 09-smoothui-foundation
plan: 02
subsystem: ui
tags: [design-system, documentation, motion, shape, reduced-motion]

requires:
  - phase: 09-smoothui-foundation (plan 01)
    provides: "src/lib/motion.ts (transitions/variants/resolveMotionPreset/useMotionPreset) and src/lib/shape.ts (shape/clipCorner) — the as-built exports this doc tabulates"
provides:
  - "design-system/MOTION.md: recorded source of truth for the SmoothUI shape + motion language (shape preset table, clipCorner constants, transition preset table, variant table, reduced-motion mechanisms)"
  - "One-line pointer from design-system/DESIGN-SYSTEM.md (VISUAL FOUNDATIONS) to MOTION.md"
affects: [10-component-reshape, 11-page-motion]

actuals:
  tokens: 1460
  tasks: 1
  commits: 1
  plan_head_before: ad42088599e8fbe1c9423b57c06b787057b4eef0

tech-stack:
  added: []
  patterns:
    - "design-system/ now carries a MOTION.md sibling to DESIGN-SYSTEM.md for the shape/motion language, keeping colour/type tokens' entry doc unchanged"

key-files:
  created:
    - design-system/MOTION.md
  modified:
    - design-system/DESIGN-SYSTEM.md

key-decisions:
  - "Placed the pointer line inside the existing VISUAL FOUNDATIONS bullet list (as its own bullet) rather than adding a new top-level section, per the plan's 'one-line pointer, don't restate colour/type' scope guard."
  - "Tabulated shape/motion/variant tables directly from the as-built src/lib/motion.ts and src/lib/shape.ts exports (not the RESEARCH.md sketch), confirming names/values matched exactly — no drift found between research and implementation."

patterns-established: []

requirements-completed: [DOC-01]

coverage:
  - id: D1
    description: "design-system/MOTION.md exists, documents shape presets/clipCorner constants, transition/variant presets, and both reduced-motion mechanisms, and explicitly states colour + Public Sans type tokens are unchanged"
    requirement: "DOC-01"
    verification:
      - kind: other
        ref: "grep checks from plan <verify><automated>: test -f, grep -qi unchanged, grep -qi reduced, grep MOTION.md in DESIGN-SYSTEM.md, grep snappy|fill|micro|backdrop, grep rounded|radius|ring — all passed"
        status: pass
    human_judgment: false
  - id: D2
    description: "design-system/DESIGN-SYSTEM.md links to MOTION.md and no other section (colour/type/tokens) was changed"
    requirement: "DOC-01"
    verification:
      - kind: other
        ref: "git diff --stat design-system/ showed only design-system/DESIGN-SYSTEM.md (+1 line) and new design-system/MOTION.md"
        status: pass
    human_judgment: false

duration: ~10min
completed: 2026-09-21
status: complete
---

# Phase 9 Plan 2: SmoothUI Foundation Documentation Summary

**Wrote `design-system/MOTION.md` documenting the shape (radii/ring/clip-corner) and motion (transition/variant/reduced-motion) presets exported by `src/lib/motion.ts`/`src/lib/shape.ts`, with an explicit colour/type-unchanged statement, and linked it from `DESIGN-SYSTEM.md`.**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-09-21
- **Tasks:** 1
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- `design-system/MOTION.md` created as the recorded source of truth for the SmoothUI shape + motion language (DOC-01), opening with an explicit "colour tokens and Public Sans type tokens are UNCHANGED" statement
- Shape section: table mapping each `shape.*` preset (field/innerCard/card/pillButton/pill/ring/ringFocus) to its Tailwind class, underlying `--radius-*`/`--ring-*` token, and typical usage, plus the `clipCorner` geometry constants (triangleSizePx/insetPx/hoverMovePx) with a note that the compound component ships in Phase 10
- Motion section: transition preset table (snappy/fill/micro/backdrop → config → usage) and variant table (fadeSlideUp/scaleIn/tapPress/hover/stagger/toast/progress/menu → full/reduced behaviour → usage)
- Reduced-motion section documents both required mechanisms: the Tailwind `motion-reduce:` variant for plain CSS interactions, and `useMotionPreset()`/`useReducedMotion()` plus the app-root `MotionConfig reducedMotion="user"` for `motion/react`-driven animation
- One-line pointer added to `design-system/DESIGN-SYSTEM.md`'s VISUAL FOUNDATIONS section directing readers to MOTION.md; no other section touched

## Task Commits

1. **Task 1: Author design-system/MOTION.md and link it from DESIGN-SYSTEM.md (DOC-01)** - `a53de21` (docs)

**Plan metadata:** (this commit, docs(09-02): complete SmoothUI Foundation documentation plan)

## Files Created/Modified
- `design-system/MOTION.md` - New recorded source of truth for shape + motion language (shape/clipCorner tables, transition/variant tables, reduced-motion mechanisms, colour/type-unchanged statement)
- `design-system/DESIGN-SYSTEM.md` - Added one-line pointer to MOTION.md under VISUAL FOUNDATIONS; no other line changed

## Decisions Made
- Placed the MOTION.md pointer as a new bullet inside the existing VISUAL FOUNDATIONS list rather than a new top-level section, matching the plan's "one-line pointer" scope guard.
- Tabulated all preset tables directly from the as-built `src/lib/motion.ts`/`src/lib/shape.ts` exports; confirmed no drift from the RESEARCH.md sketch (names and values matched).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `design-system/MOTION.md` is the recorded, discoverable source of truth for the shape + motion language; Phase 10 (component re-shape) and Phase 11 (page motion) can reference it directly instead of re-deriving preset semantics from source.
- No blockers for Phase 10/11.
- Phase 9 (SmoothUI Foundation) is now fully complete: both 09-01 (FND-01/02/03) and 09-02 (DOC-01) plans done.

---
*Phase: 09-smoothui-foundation*
*Completed: 2026-09-21*

## Self-Check: PASSED

All created/modified files verified present on disk (`design-system/MOTION.md`, `design-system/DESIGN-SYSTEM.md`). Task commit (`a53de21`) verified present in `git log`.
