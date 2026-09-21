---
phase: 09-smoothui-foundation
plan: 01
subsystem: ui
tags: [motion, framer-motion, tailwind, design-system, reduced-motion, nextjs]

requires:
  - phase: 08-native-macos-app
    provides: stable web app baseline (Next.js 16 / React 19 / Tailwind 4) this phase builds motion/shape presets on top of
provides:
  - "motion npm dependency (v13.4.0), vetted and installed with no install-time scripts"
  - "src/lib/motion.ts: named transition presets (snappy/fill/micro/backdrop) + full/reduced variant inventory (fadeSlideUp/scaleIn/tapPress/hover/stagger/toast/progress/menu) + resolveMotionPreset()/useMotionPreset()"
  - "src/lib/shape.ts: radii/ring/clip-corner constants derived from existing Gemba --radius-*/--ring-* tokens"
  - "src/components/motion-config.tsx: app-root MotionConfig reducedMotion=\"user\" default"
  - "chip.tsx as the first real motion.span consumer, proving the layer is SSR-safe end-to-end"
affects: [10-component-reshape, 11-page-motion]

actuals:
  tokens: 4556
  tasks: 3
  commits: 4
  plan_head_before: 9e315bde87131e3755e676655cf186c6a0380861

tech-stack:
  added: ["motion@13.4.0 (motion/react)"]
  patterns:
    - "Named motion vocabulary: components import transitions.{snappy,fill,micro,backdrop} and variants.{name} by name, never inline spring/number literals"
    - "Reduced-motion resolved once per consumer via useMotionPreset() (hook, calls useReducedMotion() internally) or the pure resolveMotionPreset() (unit-testable without React render)"
    - "Shape presets as Tailwind bracket-syntax class-string constants (rounded-[var(--radius-*)]) reusing the app's existing @theme-aliased radii — no new tokens"
    - "motion.create(Component) used to make an asChild/Slot.Root consumer (Radix Slot pattern) animatable while preserving the non-asChild plain-element path"

key-files:
  created:
    - src/lib/motion.ts
    - src/lib/motion.test.ts
    - src/lib/shape.ts
    - src/lib/shape.test.ts
    - src/components/motion-config.tsx
  modified:
    - src/components/chip.tsx
    - src/app/layout.tsx
    - package.json
    - package-lock.json

key-decisions:
  - "Installed `motion` (not `framer-motion`) per CONTEXT.md locked decision; SUS-flagged 'too-new' npm-legitimacy verdict was a false positive (15.4M weekly downloads, official motiondivision/motion repo, no postinstall script) already vetted and recorded in 09-CONTEXT.md's security_approval block — cited as install authorization, no further blocking checkpoint inserted."
  - "chip.tsx's asChild/Slot.Root path uses `motion.create(Slot.Root)` (Motion's arbitrary-component wrapper) instead of a parallel non-animated Slot.Root branch, so both the plain-span and asChild paths are equally animatable and behaviourally identical to before except for the added motion."
  - "Narrowed ChipProps' native `React.ComponentProps<\"span\">` to omit onDrag/onDragStart/onDragEnd/onAnimationStart/onAnimationEnd/onAnimationIteration — these native DOM handler signatures conflict with Motion's own onDrag/onAnimationStart overloads (TS2322); Chip does not use these callbacks itself, so omitting them is a type-only fix with no behavior change."
  - "`stagger` list-item variant covers only the per-item entrance/exit pair; the container's own `transition: { ...transitions.snappy, staggerChildren }` orchestration is left as a documented usage pattern for the Phase 10/11 consumer rather than a separate exported preset, keeping every `variants` entry a uniform {full, reduced} pair testable by the same generic FND-03 contract."
  - "`progress`'s variant pair governs the progress bar container's reveal-in (opacity/scale) via transitions.fill; the live fill amount itself is deferred to the Phase 10/11 consumer (a MotionValue/inline style), since Phase 9 exports static presets only, not stateful animated values."

patterns-established:
  - "Pattern 1: Named transition presets, named by feel (snappy/fill/micro/backdrop) not by number — every animated interaction in Phase 10/11 imports a name."
  - "Pattern 2: Reduced-motion-safe variant pairs (full/reduced), resolved once via resolveMotionPreset()/useMotionPreset() — no per-component reduced-motion ternary."
  - "Pattern 3: Shape presets as Tailwind class-string constants derived from existing @theme radii/ring tokens, never new CSS custom properties."

requirements-completed: [FND-01, FND-02, FND-03]

coverage:
  - id: D1
    description: "motion is a package.json dependency and is imported/used in a real component (chip.tsx builds green)"
    requirement: "FND-01"
    verification:
      - kind: unit
        ref: "node -e check for motion in package.json dependencies"
        status: pass
      - kind: integration
        ref: "npm run build (full production build, SSR/RSC prerender)"
        status: pass
    human_judgment: false
  - id: D2
    description: "src/lib/motion.ts + src/lib/shape.ts export reusable transition/variant presets and radii/ring/shape constants; chip.tsx references presets by name with no inline spring/number"
    requirement: "FND-02"
    verification:
      - kind: unit
        ref: "src/lib/motion.test.ts (13 tests) — transitions inventory + variants inventory"
        status: pass
      - kind: unit
        ref: "src/lib/shape.test.ts (9 tests) — allowed-token pattern + clipCorner constants"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every variant's reduced branch degrades to opacity-only/zero-duration, and MotionConfig reducedMotion=\"user\" defaults it app-wide"
    requirement: "FND-03"
    verification:
      - kind: unit
        ref: "src/lib/motion.test.ts — 'variants reduced-motion contract' parametrised across all 8 variant pairs + tapPress/hover reduced-state check"
        status: pass
      - kind: integration
        ref: "grep confirmation: motion-config.tsx sets reducedMotion=\"user\", layout.tsx mounts AppMotionConfig"
        status: pass
    human_judgment: false

duration: ~25min
completed: 2026-09-21
status: complete
---

# Phase 9 Plan 1: SmoothUI Foundation Summary

**Installed `motion` (Framer Motion successor) and built the shared shape + motion preset layer — named transitions (snappy/fill/micro/backdrop), a full/reduced variant inventory across 8 interaction types, a pure/hook resolver pair, radii/ring shape constants, and an app-root `MotionConfig` — proven end-to-end through a real `chip.tsx` consumer.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-09-21
- **Tasks:** 3 (Task 1 tracer, Task 2 TDD, Task 3 auto)
- **Files modified:** 9 (5 created, 4 modified)

## Accomplishments
- `motion` v13.4.0 installed, vetted per the locked security approval in 09-CONTEXT.md — confirmed no install-time scripts
- `src/lib/motion.ts`: `transitions` (snappy/fill/micro/backdrop, exact RESEARCH.md Pattern 1 values) and `variants` (fadeSlideUp/scaleIn/tapPress/hover/stagger/toast/progress/menu, each a full/reduced pair) plus `resolveMotionPreset()` (pure) and `useMotionPreset()` (hook)
- `src/lib/motion.test.ts`: 13 passing tests proving the reduced-motion contract (opacity-only, zero-duration) holds across the entire variant inventory, not just one preset
- `src/lib/shape.ts` + `shape.test.ts`: radii/ring/clip-corner constants derived only from existing `--radius-*`/`--ring-*` tokens, with a test guarding against any invented token
- `src/components/motion-config.tsx` mounted in `src/app/layout.tsx`: app-root `<MotionConfig reducedMotion="user">` belt-and-suspenders default
- `chip.tsx` converted to a real `motion.span`/`motion.create(Slot.Root)` consumer driven by `useMotionPreset()`, proving the whole layer is SSR-safe through `npm run build`
- Full test suite (`npm test`) green: 123/123 tests passing across 10 files
- `npm run build` green after every task; colour and type tokens verified untouched (no diff in `design-system/tokens/colors.css`/typography across any commit)

## Task Commits

1. **Task 1 (tracer): Install motion and prove the layer end-to-end through chip.tsx** - `5d5dd20` (feat)
2. **Task 2 (TDD RED): Add failing test for full motion inventory** - `8d6dbef` (test)
2. **Task 2 (TDD GREEN): Complete motion inventory + app-root MotionConfig** - `eb719e7` (feat)
3. **Task 3: Shape preset module derived from existing Gemba tokens** - `fe1fab1` (feat)

_Task 2 was `tdd="true"`: RED (`8d6dbef`, 3/6 tests intentionally failing on missing exports — not import/syntax errors) → GREEN (`eb719e7`, 13/13 passing). No REFACTOR commit — the GREEN implementation was already minimal/clean._

## Files Created/Modified
- `src/lib/motion.ts` - Named transition presets + full/reduced variant inventory + resolver/hook
- `src/lib/motion.test.ts` - Reduced-motion contract tests (13 tests)
- `src/lib/shape.ts` - Radii/ring/clip-corner constants from existing tokens
- `src/lib/shape.test.ts` - Allowed-token pattern + clipCorner constant tests (9 tests)
- `src/components/motion-config.tsx` - App-root `MotionConfig reducedMotion="user"`
- `src/components/chip.tsx` - Converted to `motion.span`/`motion.create(Slot.Root)`, driven by `useMotionPreset()`; native span props narrowed to exclude Motion-conflicting drag/animation handlers
- `src/app/layout.tsx` - Mounts `AppMotionConfig` inside the existing `ThemeProvider` client subtree
- `package.json` / `package-lock.json` - `motion` dependency added

## Decisions Made
- Installed `motion`, citing the already-recorded 09-CONTEXT.md `security_approval` vetting as authorization (no further blocking checkpoint) — see key-decisions in frontmatter.
- Used `motion.create(Slot.Root)` for the `asChild` path so both render paths (`motion.span` and the Slot-forwarded path) are equally animatable.
- Kept `stagger` and `progress` as static full/reduced presets only; deferred the stateful/live parts (container orchestration timing, live fill amount) to the Phase 10/11 consumer, per RESEARCH.md's "Claude's discretion on exact preset inventory shape."

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript overload conflict between native DOM `onDrag` and Motion's `onDrag`**
- **Found during:** Task 1 (`npm run build` TypeScript compilation)
- **Issue:** `ChipProps extends React.ComponentProps<"span">` pulled in the native `DragEventHandler`-typed `onDrag`/`onDragStart`/`onDragEnd`/`onAnimationStart`/`onAnimationEnd`/`onAnimationIteration`, which are incompatible with Motion's own same-named event props (`(event, info) => void` signature) once `Comp` became `motion.span`/`motion.create(Slot.Root)`. `npm run build` failed with a `No overload matches this call` TS2322 error.
- **Fix:** Narrowed the native span props type via `Omit<React.ComponentProps<"span">, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration">` — Chip does not use these callbacks itself, so this is a type-only fix with no behavior change.
- **Files modified:** `src/components/chip.tsx`
- **Verification:** `npm run build` passes cleanly; `npx tsc --noEmit` shows no errors in `chip.tsx`.
- **Committed in:** `5d5dd20` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix, Rule 1)
**Impact on plan:** Necessary for `npm run build` to pass at all with a motion-driven `asChild`-capable component; no scope creep — narrowly scoped to the exact conflicting prop names.

## Issues Encountered
- **Worktree branch was stale.** At session start, this worktree's branch (`worktree-agent-a25ce38cc55d1f66a`) was based on a commit prior to the phase 09 planning commits (`09-CONTEXT.md`, `09-RESEARCH.md`, `09-01-PLAN.md` did not exist on disk). Diagnosed via `git log` divergence between the worktree branch and local `main`; resolved with `git merge main --ff-only` (safe fast-forward — the worktree branch had zero divergent commits of its own, verified via `git status --short` returning clean before the merge). This pulled in 09 planning docs plus unrelated already-committed macOS release artifacts (`public/download/*`) that were part of the same upstream commits — no conflict, no code from this plan touched those files.
- **Pre-existing `crypto.test.ts` TypeScript errors** (`Uint8Array<ArrayBufferLike>` not assignable to `BlobPart`, 3 occurrences) exist on the baseline before this plan's changes (confirmed via a temporary `git stash apply`/`drop` round-trip to isolate baseline `tsc` output) — unrelated to `src/lib/crypto.ts` itself, out of scope per the plan's hard scope guard (no crypto path touched), left unfixed and not itemized further here.

## Next Phase Readiness
- The motion + shape vocabulary is complete and tested; Phase 10 (component re-shape) and Phase 11 (page motion) can import `transitions`/`variants`/`useMotionPreset` from `@/lib/motion` and `shape`/`clipCorner` from `@/lib/shape` without re-deriving any spring/radius values.
- `design-system/MOTION.md` (DOC-01) is intentionally NOT written by this plan — it is scoped to `09-02-PLAN.md` per this plan's `requirements: [FND-01, FND-02, FND-03]` frontmatter.
- No blockers for Phase 10/11.

---
*Phase: 09-smoothui-foundation*
*Completed: 2026-09-21*

## Self-Check: PASSED

All created files verified present on disk (`src/lib/motion.ts`, `src/lib/motion.test.ts`, `src/lib/shape.ts`, `src/lib/shape.test.ts`, `src/components/motion-config.tsx`, this SUMMARY.md). All 4 task commits (`5d5dd20`, `8d6dbef`, `eb719e7`, `fe1fab1`) verified present in `git log`.
