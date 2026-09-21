---
phase: 09-smoothui-foundation
verified: 2026-09-21T10:59:04Z
status: passed
score: 4/4 must-haves verified
covered_files:
  - .planning/phases/09-smoothui-foundation/09-01-PLAN.md
  - .planning/phases/09-smoothui-foundation/09-01-SUMMARY.md
  - .planning/phases/09-smoothui-foundation/09-02-PLAN.md
  - .planning/phases/09-smoothui-foundation/09-02-SUMMARY.md
  - .planning/phases/09-smoothui-foundation/09-CONTEXT.md
  - .planning/phases/09-smoothui-foundation/09-RESEARCH.md
  - .planning/phases/09-smoothui-foundation/09-REVIEW.md
  - design-system/DESIGN-SYSTEM.md
  - design-system/MOTION.md
  - package-lock.json
  - package.json
  - src/app/layout.tsx
  - src/components/chip.tsx
  - src/components/motion-config.tsx
  - src/lib/motion.test.ts
  - src/lib/motion.ts
  - src/lib/shape.test.ts
  - src/lib/shape.ts
  - src/lib/use-motion-preset.ts
covered_digest: "v1:sha256:bc1783d13c7e2ee9d1213c020637fbe10e1d80410f28b06b43b352ead36710c1"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 9: SmoothUI Foundation Verification Report

**Phase Goal:** Install `motion` + build the shared shape/motion utility layer, reduced-motion handling, and document the new shape + motion language.
**Verified:** 2026-09-21T10:59:04Z
**Status:** passed
**Re-verification:** No — initial verification

## Environment Note (non-blocking, evidence-gathering artifact)

Before running verification commands, the local `node_modules/` in this working
copy was found to be stale relative to `package-lock.json` — `motion` (and 691
other packages) were missing locally. `npm run build` was still reporting a
false-positive "Compiled successfully" because Node's module resolution walked
up the directory tree and silently picked up an unrelated, stray
`/Users/lego/node_modules/motion` from the home directory. This is a local
environment artifact of this verification session, not a phase defect: `git
diff` confirms `package.json`/`package-lock.json` were untouched by the fix,
and running `npm install` (no lockfile changes) restored a correct local
install matching the committed lockfile (`motion@13.4.0`, no postinstall
script). All commands below were re-run against the corrected local install so
the verdicts reflect the project's own declared dependency, not an accidental
resolution.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `motion` npm package installed and imported/used in the web app | ✓ VERIFIED | `package.json` declares `"motion": "^13.4.0"`; installed locally at 13.4.0 with no install-time script; imported in `src/lib/motion.ts` (type-only `Transition`), `src/lib/use-motion-preset.ts` (`useReducedMotion`), `src/components/motion-config.tsx` (`MotionConfig`), and `src/components/chip.tsx` (`motion`). `npm run build` compiles and statically prerenders `/`, `/download`, `/upload` — the three routes that render `Chip` — with no module-resolution errors. |
| 2 | Shared shape/motion utility module exists (radii/border presets + transition/variant presets); no per-component motion magic numbers | ✓ VERIFIED | `src/lib/motion.ts` exports `transitions` (snappy/fill/micro/backdrop) and `variants` (fadeSlideUp/scaleIn/tapPress/hover/stagger/toast/progress/menu, each a full/reduced pair) plus the pure `resolveMotionPreset`. `src/lib/shape.ts` exports `shape` (field/innerCard/card/pillButton/pill/ring/ringFocus) and `clipCorner`, every value derived from existing `--radius-*`/`--ring-*` custom properties confirmed present in `src/app/globals.css` (lines 46-49, 134-135). `chip.tsx` consumes `useMotionPreset(variants.fadeSlideUp, transitions.snappy)` by name — no inline spring/number literal in the component. |
| 3 | Under `prefers-reduced-motion: reduce`, utility-layer motion degrades to instant/opacity-only | ✓ VERIFIED | `resolveMotionPreset` is a pure, unit-tested function: `src/lib/motion.test.ts` asserts (a) `shouldReduceMotion=false` returns the `full` branch with the passed transition, (b) `shouldReduceMotion=true` returns the `reduced` branch with `transition.duration === 0`, and (c) parametrized across every entry of `variants` (`it.each(Object.entries(variants))`), the reduced branch's `initial`/`animate` (and `whileTap`/`whileHover` for press/hover) carry none of `x`/`y`/`scale`/`rotate` — opacity-only for the full inventory (8 variants). `useMotionPreset` wires this to the live `useReducedMotion()` value. Belt-and-suspenders: `src/components/motion-config.tsx` renders `<MotionConfig reducedMotion="user">`, mounted in `src/app/layout.tsx` around the app's client-provider subtree, so any `motion.*` element defaults to honoring OS/browser preference app-wide. |
| 4 | `design-system/` documents the new shape+motion language; colour/type tokens explicitly unchanged | ✓ VERIFIED | `design-system/MOTION.md` exists with an explicit "**Colour tokens and Public Sans type tokens are UNCHANGED**..." statement, a Shape table (preset → Tailwind class → underlying token → usage) matching `shape.ts` exactly, a `clipCorner` constants table, a Motion section with transition and variant tables matching the as-built `motion.ts` values verbatim (including the WR-01 fix — `fill`/`micro` no longer show a dead `duration` field), and a Reduced-motion section covering both the CSS `motion-reduce:` variant and the JS `useMotionPreset()`/`MotionConfig` path. `design-system/DESIGN-SYSTEM.md:40` links to it. |

**Score:** 4/4 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `package.json` / `package-lock.json` | `motion` dependency | ✓ VERIFIED | `^13.4.0`; installed 13.4.0 locally; no `postinstall`/`install` script in the package (only source-repo `build`/`dev`/`test`/`prepack` scripts, none run on consumer install). |
| `src/lib/motion.ts` | Transition/variant preset module, RSC-safe (no `"use client"`) | ✓ VERIFIED | No client directive; exports `transitions`, `variants`, `MotionPreset` type, `resolveMotionPreset`. |
| `src/lib/motion.test.ts` | Node vitest proving reduced-motion contract | ✓ VERIFIED | 5 describe blocks, passes (see Behavioral Spot-Checks). |
| `src/lib/use-motion-preset.ts` | Client-only hook wrapper (WR-03 fix) | ✓ VERIFIED | `"use client"`; imports `useReducedMotion` from `motion/react`, calls `resolveMotionPreset`. |
| `src/lib/shape.ts` | Radii/ring/clip-corner constants | ✓ VERIFIED | All 7 `shape` values + 3 `clipCorner` constants present, derived from existing tokens. |
| `src/lib/shape.test.ts` | Node vitest guarding no-invented-tokens | ✓ VERIFIED | Regex-validates every `shape` value against an allowed existing-token pattern; passes. |
| `src/components/motion-config.tsx` | App-root `MotionConfig reducedMotion="user"` | ✓ VERIFIED | `"use client"`; renders `<MotionConfig reducedMotion="user">{children}</MotionConfig>`. |
| `src/components/chip.tsx` | First real consumer of the preset layer | ✓ VERIFIED | Imports `transitions`/`variants` from `@/lib/motion` and `useMotionPreset` from `@/lib/use-motion-preset`; `motion.span`/`MotionSlot` (module-scope, CR-01 fix) driven by `useMotionPreset(variants.fadeSlideUp, transitions.snappy)`; preserves `cva` styling, `variant`/`asChild`/`icon`/forwarded props. |
| `design-system/MOTION.md` | Recorded shape+motion language doc | ✓ VERIFIED | Present, matches as-built code, states colour/type unchanged. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/components/chip.tsx` | `@/lib/motion` + `@/lib/use-motion-preset` | `useMotionPreset(variants.fadeSlideUp, transitions.snappy)` | ✓ WIRED | Real component consumes the shared layer; build proves SSR-safety through the 3 static routes rendering `Chip`. |
| `resolveMotionPreset` | `useReducedMotion()` | `useMotionPreset` wrapper in `use-motion-preset.ts` | ✓ WIRED | Single place reduced-motion is applied for every consumer; unit-tested for both branches. |
| `src/lib/shape.ts` radii | `src/app/globals.css` `@theme` `--radius-*`/`--ring-*` | String literal reference via `var(--radius-*)`/`var(--ring-*)` | ✓ WIRED | Token names (`--radius-sm/md/lg/xl`, `--ring-border`, `--ring-focus`) confirmed present in `globals.css` lines 46-49, 134-135; no new token introduced. |
| `src/components/motion-config.tsx` | `src/app/layout.tsx` | `<AppMotionConfig>` wraps app content | ✓ WIRED | Imported and mounted at lines 6, 77-82 of `layout.tsx`. |
| `design-system/DESIGN-SYSTEM.md` | `design-system/MOTION.md` | Pointer link | ✓ WIRED | Line 40 links to MOTION.md; colour/type sections of DESIGN-SYSTEM.md unmodified (confirmed via phase diff). |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Reduced-motion contract (unit test) | `npx vitest run` (full suite; single run, see note below) | 10 test files, 123/123 tests passed, incl. `motion.test.ts` + `shape.test.ts` | ✓ PASS |
| Production build compiles + prerenders (SSR-safe) | `rm -rf .next && npm run build` | `✓ Compiled successfully`; all 6 static/dynamic routes generated, incl. `/`, `/upload`, `/download` (Chip consumers) | ✓ PASS |
| Type safety | `npx tsc --noEmit` | Exactly 3 errors, all in `src/lib/crypto.test.ts` (pre-existing, unrelated `Uint8Array`/`BlobPart` typing issue) — matches expected baseline | ✓ PASS |
| `motion` package legitimacy (supply-chain) | Inspected `node_modules/motion/package.json` scripts | No `postinstall`/`install` script; only source-repo `build`/`dev`/`test`/`prepack` | ✓ PASS |

Note: `npx vitest run` was executed once as the full suite (not filtered per-truth); `npx tsc --noEmit` and `npm run build` were each executed once.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| FND-01 | 09-01 | `motion` dependency installed and used | ✓ SATISFIED | Truth 1 |
| FND-02 | 09-01 | Shared shape/motion utility layer, no per-component magic numbers | ✓ SATISFIED | Truth 2 |
| FND-03 | 09-01 | Reduced-motion degrades to instant/opacity-only | ✓ SATISFIED | Truth 3 |
| DOC-01 | 09-02 | `design-system/` documents shape+motion, colour/type unchanged | ✓ SATISFIED | Truth 4 |

No orphaned requirements — `.planning/REQUIREMENTS.md` maps exactly these four IDs to Phase 9, all marked `[x]` and cross-referenced in the roadmap requirements table as Complete.

### Anti-Patterns Found

None. Scanned `src/lib/motion.ts`, `src/lib/shape.ts`, `src/lib/use-motion-preset.ts`, `src/components/motion-config.tsx`, `src/components/chip.tsx`, `design-system/MOTION.md` for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`, empty-return stubs, and hardcoded-empty-data patterns — none found. All prior code-review findings (`09-REVIEW.md`) were fixed atomically on `main` (CR-01, WR-01, WR-02, WR-03); IN-01/IN-02 are explicitly deferred (non-blocking, informational, no magic-number-in-a-component violation — both live inside `motion.ts` itself) to Phase 10 per the review's own disposition.

### Scope Guard Confirmation

`git diff --stat 5d5dd20~1..148c8342` (the correct Phase 9 commit range) touches exactly: `.planning/*` (roadmap/state/requirements/summaries), `design-system/DESIGN-SYSTEM.md` (+1 line), `design-system/MOTION.md` (new), `package.json`/`package-lock.json` (motion dependency), `src/app/layout.tsx`, `src/components/chip.tsx`, `src/components/motion-config.tsx`, `src/lib/motion.ts`/`motion.test.ts`/`shape.ts`/`shape.test.ts`/`use-motion-preset.ts`. No colour token file (`design-system/tokens/colors.css`), no type token file, and no crypto/network/upload/download path file (`src/lib/crypto.ts`, `src/lib/storage.ts`, `src/lib/server-storage.ts`, `src/lib/blob-storage.ts`, `src/lib/redis.ts`, `src/app/api/**`) appears in the diff.

### Human Verification Required

None. This phase has no user-facing visual surface change (deferred to Phase 10); every success criterion is mechanically verifiable via package metadata, static analysis, and passing automated tests, and all four were confirmed against the real codebase and a clean build/test run.

### Gaps Summary

No gaps. All four ROADMAP.md success criteria and all four requirements (FND-01, FND-02, FND-03, DOC-01) are verified against the actual codebase, not just SUMMARY.md claims. The only notable finding was a local-environment `node_modules` staleness (unrelated to the committed code) that was corrected and re-verified before reaching this verdict — see "Environment Note" above.

---

_Verified: 2026-09-21T10:59:04Z_
_Verifier: Claude (gsd-verifier)_
