---
phase: 10-component-reshape
plan: 03
subsystem: ui
tags: [motion, sonner, radix, tailwind, smoothui]

# Dependency graph
requires:
  - phase: 10-component-reshape (10-01)
    provides: src/lib/motion.ts (transitions, variants), src/lib/shape.ts, src/lib/use-motion-preset.ts, module-scope motion.create() pattern (button.tsx/chip.tsx)
provides:
  - Progress bar indicator animated via transitions.fill, container reveal via variants.progress
  - Sonner Toaster re-skinned to SmoothUI geometry via toastOptions.classNames (shape.card/shape.ring)
affects: [10-07 (skeleton/loading treatment consumes the same feedback family)]

# Actuals (#2632)
actuals:
  tokens: 939
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "motion.create(ProgressPrimitive.Root/Indicator) hoisted at module scope, same as button.tsx/chip.tsx"
    - "sonner re-skinned via toastOptions.classNames with `!`-prefixed shape tokens instead of a motion.* wrap (CSS-driven library)"

key-files:
  created: []
  modified:
    - src/components/ui/progress.tsx
    - src/components/ui/sonner.tsx

key-decisions:
  - "Kept transitions.fill (no new stiffer preset) after a headless physics simulation of the spring against a fast-updating value showed only ~2-4 percentage points of max lag over a 4s ramp, fully settling — visually negligible. No live browser was available in this sandboxed worktree, so the sanity check was numerical rather than a manual devtools-throttled observation; documented as a limitation below."
  - "Progress Root became motion.create(ProgressPrimitive.Root) (not left as plain ProgressPrimitive.Root) to carry the variants.progress mount reveal, since the plan's must_haves/key_links required both transitions.fill AND variants.progress to be present."
  - "value prop is still NOT forwarded to Root (matches pre-existing behavior byte-for-byte) — only used to compute the indicator's animate.x target, exactly as the original translateX(...) did."
  - "sonner.tsx classNames use `!${shape.card}` / `!${shape.ring}` (template-literal `!` prefix) rather than inlining new important-marked classes, to keep reusing the existing shape.ts tokens per Reuse-First while still satisfying sonner's cascade-override requirement."

patterns-established:
  - "Live-value-driven motion components (Progress) still spread useMotionPreset(...) mount-reveal props onto a hoisted motion.create(Root) while animating the fast-updating child imperatively via animate={{...}} + transition={...}, not useMotionPreset."

requirements-completed: [FDBK-01, FDBK-02]

coverage:
  - id: D1
    description: "Progress bar indicator fills using SmoothUI motion (transitions.fill) off the existing live upload/download value; encryption/transfer state untouched"
    requirement: "FDBK-02"
    verification:
      - kind: unit
        ref: "npm run build (tsc + Next.js build) — pass"
        status: pass
      - kind: other
        ref: "git status --porcelain -- design-system/tokens/ src/lib/crypto.ts src/lib/storage.ts src/lib/server-storage.ts src/lib/blob-storage.ts — empty (no crypto/storage/token file touched)"
        status: pass
    human_judgment: true
    rationale: "Spring-lag-vs-live-value visual smoothness (Pitfall 5) is a subjective UX judgment; this SUMMARY's sanity check was a headless physics simulation (no browser available in this worktree), not a human-observed devtools-throttled transfer. A human should do one real fast-transfer visual pass on /upload or /download before this is fully trusted."
  - id: D2
    description: "Sonner toasts re-skinned to SmoothUI geometry via toastOptions.classNames using shape tokens; no motion/react import; sonner's own reduced-motion behavior preserved"
    requirement: "FDBK-01"
    verification:
      - kind: unit
        ref: "npm run build (tsc + Next.js build) — pass"
        status: pass
      - kind: other
        ref: 'grep -c ''from "motion/react"'' src/components/ui/sonner.tsx == 0 — pass'
        status: pass
      - kind: unit
        ref: "npm test — 127/127 passing (baseline maintained)"
        status: pass
    human_judgment: true
    rationale: "Visual toast geometry (rounded corners, ring, shadow actually rendering with the `!` override winning sonner's own injected styles) needs a human eyeball pass in a running app; not exercised by the unit test suite."

duration: ~15min
completed: 2026-09-21
status: complete
---

# Phase 10 Plan 03: Feedback — Progress + Toasts Summary

**Progress bar reshaped onto `transitions.fill` motion (module-scope `motion.create()` on both Root and Indicator), sonner toasts re-skinned via `toastOptions.classNames` with `!`-prefixed shape tokens — no `motion/react` import into sonner.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2/2 complete
- **Files modified:** 2

## Accomplishments
- Progress indicator now animates its fill via a hoisted `motion.create(ProgressPrimitive.Indicator)` using `transitions.fill`, with the Root wrapped in `motion.create(ProgressPrimitive.Root)` for a `variants.progress` mount reveal — the `value` prop's wiring to the live upload/download encryption-progress state is byte-for-byte unchanged (still not forwarded to Root, exactly as before).
- Verified the spring-lag risk from 10-RESEARCH.md Pitfall 5 via a headless physics simulation of `transitions.fill` (stiffness 100, damping 10, mass 0.75) against a value updating every 150ms and every 16ms over a 4s ramp: max lag ~2-4 percentage points, fully settling — no stiffer named preset was needed.
- Sonner `Toaster` re-skinned entirely at the CSS surface: `toastOptions={{ classNames: { toast: cn(\`!${shape.card}\`, \`!${shape.ring}\`, "!shadow-[var(--shadow-popover)]") } }}`, no `motion/react` import, sonner's own `@media (prefers-reduced-motion)` block relied on as-is.

## Task Commits

Each task was committed atomically:

1. **Task 1: Reshape the Progress bar with motion fill (FDBK-02)** - `a66b145a` (feat)
2. **Task 2: Re-skin sonner toasts to SmoothUI geometry (FDBK-01)** - `4c59aba6` (feat)

_Plan metadata commit intentionally omitted — merge hygiene instructions for this run restrict the commit set to progress.tsx, sonner.tsx, and this SUMMARY only; STATE.md/ROADMAP.md/REQUIREMENTS.md are not touched by this executor run._

## Files Created/Modified
- `src/components/ui/progress.tsx` - Indicator + Root hoisted to `motion.create()`, indicator animates via `transitions.fill`, Root reveals via `variants.progress`
- `src/components/ui/sonner.tsx` - `toastOptions.classNames` applies `shape.card`/`shape.ring` with `!` override; no motion import

## Decisions Made
- Kept `transitions.fill` unmodified after the physics-simulation sanity check showed negligible max lag (~2-4 pts) over a 4s ramp at both realistic (150ms) and worst-case (16ms) update cadences — no new stiffer preset added to `src/lib/motion.ts`.
- Wrapped `ProgressPrimitive.Root` in `motion.create()` (not left as a plain Radix element) specifically to carry the `variants.progress` container reveal, since the plan's `must_haves.key_links` required both `transitions.fill` and `variants.progress` to be present in the file, not just the fill.
- Used template-literal `!`-prefixing (`` `!${shape.card}` ``) on the reused shape tokens rather than writing new inline important-marked classes, keeping the single source of truth in `src/lib/shape.ts` per the project's Reuse-First rule while still satisfying sonner's documented cascade-override requirement.

## Deviations from Plan

None - plan executed as written. The only judgment call was making `ProgressPrimitive.Root` itself a `motion.create()`-wrapped component (via the plan's explicitly "optional" reveal instruction) to satisfy the `must_haves.key_links` requirement that both `transitions.fill` and `variants.progress` appear in the file — this is a plan-consistent execution of an option the plan already offered, not a deviation from it.

## Issues Encountered
- No headless browser (Playwright or similar) is available in this project/worktree to visually observe the fast-transfer spring-lag check the plan calls for (Pitfall 5) or the toast geometry rendering. Both were substituted with the strongest available automated proxy: a headless physics simulation for the spring lag (documented above, with numeric results), and `npm run build` + `npm test` (127/127 passing) for the toast change. Both `coverage[].human_judgment: true` entries above flag that a human should do one live visual pass (fast transfer on `/upload` or `/download`, and a toast in a running app) before fully trusting the FDBK-01/FDBK-02 visual outcome.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Progress and Toaster are reshaped and building/testing green; ready for 10-07's skeleton/loading treatment which shares this feedback family.
- Recommend a human do one live fast-transfer visual check (network-throttled upload/download) and one toast visual check before final phase sign-off, per the `human_judgment: true` coverage entries above.

---
*Phase: 10-component-reshape*
*Plan: 03*
*Completed: 2026-09-21*
