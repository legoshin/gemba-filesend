---
phase: 11-page-motion
reviewed: 2026-09-21T12:50:35Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/lib/motion.ts
  - src/lib/motion.test.ts
  - src/components/page-entrance.tsx
  - src/components/scroll-progress.tsx
  - src/app/page.tsx
  - src/app/upload/page.tsx
  - src/app/download/page.tsx
findings:
  critical: 1
  warning: 3
  info: 1
  total: 5
status: fixed
fixed_at: 2026-09-21T14:03:00Z
fix_worktree_branch: worktree-agent-ade3d4fa2a1c46080
fix_commits:
  CR-01: 2924ca31
  WR-01: 496c4e3d
  WR-02: c1f88e91
  WR-03: c1f88e91 (documentation only — no code change, see Fix Summary)
  IN-01: skipped (see Fix Summary)
---

# Phase 11: Code Review Report

**Reviewed:** 2026-09-21T12:50:35Z
**Depth:** standard
**Files Reviewed:** 7 (+ design-system/MOTION.md, read for cross-reference)
**Status:** fixed (see Fix Summary below)

## Summary

Reviewed the Phase 11 (Page Motion) diff: `staggerContainer` in `src/lib/motion.ts`, the new `PageEntrance`/`PageEntranceItem` client wrapper, the new `ScrollProgress` component, and their wiring into `src/app/page.tsx`, `src/app/upload/page.tsx`, and `src/app/download/page.tsx`.

The foundation pieces are solid: `useScroll`/`useSpring`/`useReducedMotion` are all called unconditionally (no Rules-of-Hooks violation), `scaleX` uses `origin-left` correctly, reduced-motion degrades as designed (entrance → instant opacity-only, scroll bar → raw `scrollYProgress` binding, no new spring numbers introduced), stagger timing lives in one place (`staggerContainer`), the home page stays a Server Component, and the upload/download edits are presentational-only — no crypto/upload/download logic was touched and the 8 download state cards still render/function correctly.

However, tracing the **download page's actual state machine** (not just the diff) surfaces a real, provable UX regression: because each state card is wrapped in its own `PageEntranceItem` behind a `state === X &&` conditional (no `AnimatePresence`), the entrance animation is not "once per page load" as documented and required by MOT-01 — it replays on every state transition, including the repeating `downloading → preview` loop that happens once per file in a multi-file share. This is the CRITICAL finding below. A few lower-severity consistency/documentation issues round out the findings.

## Critical Issues

### CR-01: Download page's entrance animation replays on every state transition, not once-on-mount (and has no exit transition)

**File:** `src/app/download/page.tsx:616-1013` (all 8 `state === "..." && <PageEntranceItem>...` blocks), `src/components/page-entrance.tsx:21-36`

**Issue:**
The Phase 11 context/decisions explicitly scope entrance motion to be "once-on-mount," "subtle" (`.planning/phases/11-page-motion/11-CONTEXT.md`), and `design-system/MOTION.md` (this phase's own doc addition) states `PageEntrance`/`PageEntranceItem` "Renders once on mount."

That is not what happens on the download page. Each of the 8 state cards is individually gated by `state === "..." &&` and wrapped in its own `<PageEntranceItem>` (e.g. `download/page.tsx:616-663` for the two `input` variants, `666-880` for `preview`, `883-906` for `downloading`, `909-1013` for the terminal/error states). Since only one branch is ever truthy at a time and there is no `AnimatePresence` around this switch, every state transition unmounts the previous `PageEntranceItem` subtree and mounts a brand-new one. `PageEntranceItem` has no `initial`/`animate` of its own — it inherits the parent `PageEntrance`'s `"initial"`/`"animate"` variant labels (`page-entrance.tsx:53-56`), so each freshly-mounted item independently replays the full `variants.stagger.full` entrance (`opacity 0→1, y 8→0`, `transitions.snappy`).

Tracing the actual state machine in `startDownload` (`download/page.tsx:528-581`):
- Single-file share: `input → preview → downloading → done` — the entrance plays 4 times in one continuous user session, not once.
- Multi-file share: `input → preview → downloading → preview → downloading → preview → ...` (one `downloading ⇄ preview` round-trip per file, per lines 539/548/570) — the entrance replays on **every single file download**, i.e. it is a recurring, per-interaction animation, not a page-load affordance. This is the exact "jarring on every state transition" failure mode this review was asked to specifically confirm or rule out.

Compounding this: since there is no `AnimatePresence` wrapping the state switch, the *outgoing* card never plays its `exit` variant (`variants.stagger.full.exit = { opacity: 0 }` is dead code in this context) — React removes it from the DOM instantly. So each transition is an instant pop-out of the old card immediately followed by a ~250ms fade/slide-in of the new one, which reads as a flash/flicker rather than a smooth crossfade, and will fire repeatedly during ordinary use of a multi-file share (the most common "long session" path on this page).

This is a functional violation of the phase's own MOT-01 requirement ("once-on-mount," "subtle... this is a file-share utility, not a marketing site") and of the shipped documentation, not a matter of taste.

**Fix:** Pick one of:
1. Don't gate the entrance wrapper on per-request state. Keep a single, stable `PageEntranceItem` (or plain `motion.div`) around the state-card region that mounts once, and drive state-to-state content swaps with their own (separate, likely undocumented/no-op) transition — or none at all — rather than reusing the mount-entrance preset for every swap.
2. If a crossfade between states is actually wanted, make it explicit: wrap the state switch in `<AnimatePresence mode="wait">` and give each card its own `initial`/`animate`/`exit` (e.g. via `useMotionPreset(variants.stagger, transitions.snappy)`, the same helper already used for `DownloadFileRow`), so the transition is a deliberate, symmetric crossfade instead of an accidental side effect of `PageEntranceItem`'s mount-only propagation.
3. At minimum, gate the animation so it fires only on the page's true initial mount (e.g. track a `hasAnimatedRef` and pass `initial={false}` on subsequent state swaps), preserving "once-on-mount" as documented.

**FIXED** (commit `2924ca31`): Applied fix option 1. The 8 `state === "..." && <PageEntranceItem>...` branches were consolidated so a single, stable `<PageEntranceItem>` wraps the whole state-card region (still nested inside `<PageEntrance>`); only its *children* swap as `state` changes. The wrapper itself now mounts once with the page, so the entrance plays exactly once regardless of state transitions — verified for both the single-file (`input → preview → downloading → done`) and multi-file (repeating `downloading ⇄ preview`) paths by tracing the same state machine cited above. No `AnimatePresence`/crossfade was added (explicitly out of scope per the fix task). A library-level "mount-once" primitive in `page-entrance.tsx` (fix option 3, context/ref-based) was prototyped first but reverted: it required either reading a ref during render or calling `setState` synchronously in an effect, both of which this project's `eslint-config-next` / `react-hooks` rule set flags as errors (`react-hooks/refs`, `react-hooks/set-state-in-effect`); the structural fix (option 1) achieves the same result with zero lint friction and, for this page specifically, zero UX regression (only one state card is ever visible at a time, so there was no cross-card stagger to preserve).

## Warnings

### WR-01: `ScrollProgress` bar height uses a raw pixel arbitrary value instead of the matching spacing token

**File:** `src/components/scroll-progress.tsx:27`
**Issue:** `className="fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-primary"` hardcodes `h-[2px]`. `design-system/tokens/spacing.css:16` defines `--space-1: 2px` — the exact value being duplicated — and every other Phase 9-11 component in this codebase references spacing via the token (`grep` confirms `scroll-progress.tsx` is the only file under `src/` using a raw `[Npx]` arbitrary value; `src/app/page.tsx:62` shows the established pattern: `mt-[var(--space-8)]`). This is a literal instance of the constraint in the project's own CLAUDE.md ("Only use tokens defined in `design-system/tokens/`... do not invent colours/type/spacing/radii/shadows").
**Fix:** Use the token: `h-[var(--space-1)]` instead of `h-[2px]`.

**FIXED** (commit `496c4e3d`): Replaced `h-[2px]` with `h-[var(--space-1)]` exactly as suggested. `--space-1` isn't mapped into Tailwind's `@theme` spacing scale in this project (only colors/radii are — see `src/app/globals.css`'s `@theme inline` block), so there's no `h-1`-style utility class that resolves to it; the arbitrary-value-with-CSS-var syntax is the established pattern (matches `src/app/page.tsx:62`'s `mt-[var(--space-8)]`).

### WR-02: MOTION.md's "renders once on mount" claim is inaccurate for the shipped upload/download integrations

**File:** `design-system/MOTION.md:75-82` (new "Page/section entrance" section)
**Issue:** The doc states plainly: "Renders once on mount." As shown in CR-01, this is true only for the home page's static two-section layout. On the upload page, the Upload-Complete card is a separate, later `PageEntranceItem` mount (deliberate per `11-02-SUMMARY.md` decisions, so the entrance plays a second time on that page too), and on the download page it replays on every state transition. The doc doesn't caveat this, so a future page migrated onto `PageEntrance`/`PageEntranceItem` with conditionally-swapped children will silently inherit the same repeat-animation behavior, believing it "renders once."
**Fix:** Add a caveat to the doc, e.g.: "`PageEntranceItem` plays its entrance transition on its own mount, not the page's — if children are conditionally swapped (e.g. a multi-branch state machine), each newly-mounted branch will independently replay the entrance. Keep motion-wrapped content structurally stable across state changes if a single once-per-page-load animation is intended."

**FIXED** (commit `c1f88e91`): Replaced the "Renders once on mount" claim with an accurate caveat (matching the suggested wording) plus concrete per-page guidance: how the download page now achieves once-per-page via the CR-01 restructuring, and why the upload page's Upload-Complete card and `isBusy` card are intentionally left as-is (see WR-03 below). Added closing guidance for anyone reusing `PageEntrance`/`PageEntranceItem` on a new page.

### WR-03: Upload page's `isBusy` progress card is inconsistently excluded from the stagger group

**File:** `src/app/upload/page.tsx:808-826` (approx., the `isBusy && <Card>...</Card>` block sitting between two `PageEntranceItem`-wrapped siblings)
**Issue:** This is a documented, deliberate decision (`11-02-SUMMARY.md`: "the conditional isBusy progress Card... was left unwrapped... isn't present at initial mount"), and it doesn't break anything — an un-wrapped sibling of a `motion.div` with `variants` just renders without entrance/stagger. But it's the same class of bug as CR-01 in miniature and worth naming explicitly: this card *also* isn't present at initial mount, appears via the same kind of conditional-render mechanism, and by design gets **no** entrance treatment at all, while structurally-identical siblings (Select Files/Options cards) get a stagger-in. That's an intentional inconsistency in how "presence at mount" is defined per-card, which is fine as a static choice but underscores that the wrapper's mount-based semantics don't actually track "the page's initial load" — they track each element's own individual mount point, which is exactly the root cause of CR-01 one level down (download page just has more such conditional branches, and reuses the wrapper instead of omitting it).
**Fix:** No code change required here specifically; call this out alongside CR-01/WR-02 so the semantics are documented in one place, and audit any future re-use of `PageEntranceItem` on a conditionally-branching UI (not just always-present-at-mount content) before assuming "once."

**DOCUMENTED, NO CODE CHANGE** (commit `c1f88e91`, same as WR-02): Per the review's own Fix guidance, no code change was applied here. A structural fix analogous to CR-01 was evaluated (consolidating the Select Files/Options/Button region into one stable `PageEntranceItem` around the `uploadState === "done"` ternary) and rejected: unlike the download page's mutually-exclusive state cards, the upload page's Select Files/Options/Button cards are deliberately staggered *against each other* on true initial load (separate `PageEntranceItem`s, per `11-02-SUMMARY.md`); consolidating them into one wrapper would collapse that intentional per-card stagger into a single simultaneous fade, trading one cosmetic inconsistency for a real design regression. `design-system/MOTION.md` now documents this tradeoff explicitly (see WR-02) so it's a recorded decision, not a silent gap.

## Info

### IN-01: No unit/smoke tests added for the two new client components

**File:** `src/components/page-entrance.tsx`, `src/components/scroll-progress.tsx`
**Issue:** `src/lib/motion.test.ts` covers the new `staggerContainer` data constant thoroughly, but neither new component (`PageEntrance`/`PageEntranceItem`/`ScrollProgress`) has any test — e.g. a render smoke test confirming `useReducedMotion() === true` swaps to the reduced variant/transition, or that `ScrollProgress` renders without throwing outside a browser scroll context. Given the project's stated 80% coverage bar, a cheap `@testing-library/react` render test for the reduced-motion branch of each component would catch regressions like CR-01/WR-01 in CI rather than deferring entirely to the "human_judgment: true" manual Phase 12 pass noted in all three SUMMARY.md files.
**Fix:** Add a minimal render test per component asserting the reduced-motion prop path (mock `useReducedMotion` to return `true`) resolves to the expected `transition`/`variants` shape, consistent with how `resolveMotionPreset` is already unit-tested in isolation.

**SKIPPED** — out of scope for this fix pass: this repo's `vitest` config runs in a Node environment only (no `jsdom`/`@testing-library/react` set up), so a real component render test needs new test infrastructure (environment + library + config wiring) rather than a same-shaped test file next to the existing `motion.test.ts`. Left for a follow-up task rather than added ad hoc as part of a code-review fix pass.

---

_Reviewed: 2026-09-21T12:50:35Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

---

## Fix Summary

**Fixed at:** 2026-09-21T14:03:00Z
**Worktree branch:** `worktree-agent-ade3d4fa2a1c46080`
**Commits:**
- `2924ca31` — fix(11): CR-01 stop download page entrance from replaying on every state transition
- `496c4e3d` — fix(11): WR-01 use spacing token for ScrollProgress bar height
- `c1f88e91` — docs(11): WR-02/WR-03 correct MOTION.md once-on-mount claim, document per-page handling

**Outcome:** 1 fixed (CR-01), 1 fixed (WR-01), 2 documented/no-code-change (WR-02, WR-03 — matches the review's own Fix guidance for WR-03), 1 skipped (IN-01 — needs new jsdom/testing-library test infra, out of scope).

**Verification:** `npm run build` succeeds; `npx vitest run` — 128/128 tests pass (baseline unchanged); `npx tsc --noEmit` — only the 3 pre-existing `src/lib/crypto.test.ts` `SharedArrayBuffer`/`BlobPart` errors remain, no new errors; `npx eslint` clean on all touched files. Scope guards confirmed: no color/type token changes, `git diff` empty for `src/lib/crypto.ts`, `src/lib/storage.ts`, `src/lib/multi-file.ts`, `src/lib/blob-storage.ts`, `src/lib/server-storage.ts`, and `src/app/api/**`; download page's 8 states and the upload flow are unchanged behaviorally (only the entrance-replay bug was fixed).
