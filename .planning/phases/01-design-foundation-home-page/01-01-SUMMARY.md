---
phase: 01-design-foundation-home-page
plan: 1
subsystem: ui
tags: [css, tailwind-v4, design-tokens, dark-mode, globals-css]

# Dependency graph
requires: []
provides:
  - Gemba design tokens (fonts/colors/typography/spacing) imported at the app root via globals.css
  - Tailwind @theme inline + :root re-pointed onto Gemba semantic aliases (bg-card/text-primary/rounded-lg now paint Gemba values)
  - Public Sans wired as --font-sans; .gemba-h1..h5 / .gemba-body* helper classes available app-wide
  - .dark near-black token layer authored on Gemba aliases (single authoring point), WCAG AA verified
affects: [01-02, 01-03, 01-04, 01-05, 01-06, 01-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tailwind @theme inline forwards shadcn variable names onto Gemba semantic aliases via var() indirection, so .dark only needs to override the Gemba alias layer once"
    - "Gemba token files imported in place from design-system/tokens/ via relative @import (not copied into src/)"

key-files:
  created: []
  modified:
    - src/app/globals.css

key-decisions:
  - "Gemba @import chain placed before @import \"tailwindcss\" (not after shadcn/tailwind.css as literally written in the plan) to fix a build warning about @import ordering — see Deviations"
  - "--chart-*/--sidebar-* re-pointed onto Gemba aliases (accent/success/warning/critical/text-subdued/surface-card/etc.) rather than left as raw oklch, to satisfy the 'zero oklch remaining' acceptance criterion; unused by any component today but kept token-correct"
  - "--radius: 0.625rem left untouched on :root (out of this plan's semantic scope) because src/components/ui/sonner.tsx still reads var(--radius) directly"

patterns-established:
  - "Dark mode is authored once, on the Gemba alias layer (--surface-*, --text-*, --gemba-accent, etc.) under .dark — never re-declare shadcn names under .dark directly"

requirements-completed: [DESIGN-01, DESIGN-02, DESIGN-03, DARK-01]

# Metrics
duration: 12min
completed: 2026-07-10
---

# Phase 1 Plan 1: Gemba Token Wiring + Dark Mode Summary

**Re-pointed Tailwind's `@theme inline`/`:root`/`.dark` layer in `globals.css` onto Gemba semantic aliases (colors.css/typography.css/spacing.css/fonts.css), replacing the shadcn oklch grayscale palette with Gemba light values and a newly-authored true near-black `.dark` layer.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-10T12:56:00+01:00
- **Completed:** 2026-07-10T13:07:00+01:00
- **Tasks:** 3 / 3
- **Files modified:** 1 (`src/app/globals.css`)

## Accomplishments
- Gemba token files (`fonts.css`, `colors.css`, `typography.css`, `spacing.css`) now load app-wide from `design-system/tokens/` via `globals.css` (DESIGN-01)
- Every shadcn-named CSS variable (`--background`, `--card`, `--primary`, `--border`, `--muted-foreground`, `--sidebar-*`, `--chart-*`, etc.) now resolves through a Gemba semantic alias instead of a hardcoded oklch value — zero `oklch(...)` remains anywhere in the file (DESIGN-02)
- `--font-sans` forwards to Public Sans (via `typography.css`); `.gemba-h1..h5` / `.gemba-body*` / `.gemba-chip-label` helper classes are available app-wide (DESIGN-03)
- Tailwind's `@theme inline` radius scale is aligned to Gemba's literal px scale (`sm 8 / md 12 / lg 16 / xl 24`), so `rounded-lg` and `var(--radius-lg)` both resolve to 16px with no divergence (COMP-05 card recipe dependency)
- A net-new `.dark` block authors true near-black surfaces + lightened accent/signal colours directly on the Gemba alias layer (single authoring point) — every shadcn utility flips to dark automatically since `:root` already forwards through the same aliases (DARK-01, D-08, D-09)

## Task Commits

Each task was committed atomically:

1. **Task 1: Import Gemba token files into globals.css** - `88d998a` (feat)
2. **Task 2: Re-point @theme inline + :root light layer onto Gemba aliases (D-02)** - `f814c49` (feat)
3. **Task 3: Author the .dark near-black token layer (DARK-01, D-08, D-09)** - `966091a` (feat)

**Plan metadata:** committed separately after this summary (see final commit below)

## Files Created/Modified
- `src/app/globals.css` - Gemba token `@import` chain; `@theme inline` re-pointed (font-sans, radius scale); `:root` light layer + `.dark` near-black layer both re-pointed onto Gemba semantic aliases instead of raw oklch

## Decisions Made
- **Import order fix (Rule 1):** the plan specified inserting the four Gemba `@import` lines immediately after `@import "shadcn/tailwind.css"`. Building with that placement produced a Lightning CSS warning — "`@import rules must precede all rules aside from @charset and @layer statements`" — for the remote Google Fonts `@import` nested inside `fonts.css`, and the import was silently stripped from the compiled output (verified: 0 occurrences of `@import`/`googleapis`/`gstatic`/`@font-face` in `.next` build artifacts either way). Moving the four Gemba imports to the very top of the file, before `@import "tailwindcss"`, eliminates the warning. See "Deviations" and "Known Issue" below — the remote webfont is still not literally fetched by this specific Turbopack/Lightning CSS pipeline regardless of ordering; this is a pre-existing toolchain limitation, not something fixable from within `globals.css` alone.
- **`--chart-*`/`--sidebar-*` re-pointed onto Gemba aliases:** not explicitly called out in the plan's task instructions, but required to satisfy "no oklch(...) value remains anywhere in globals.css" (Task 2/3 acceptance criteria, and the plan's own top-level `<verification>` block). Chose the nearest Gemba tokens (`--gemba-accent/-success/-warning/-critical/--text-subdued`) per the PROJECT.md design-fidelity constraint ("derive from the nearest token when a value isn't covered") rather than inventing new colours. No component in `src/` currently reads `--chart-*`, so this is inert but token-correct.
- **`--radius: 0.625rem` left as-is on `:root`:** out of scope for this plan (not a Gemba semantic alias), and still consumed directly by `src/components/ui/sonner.tsx`'s `var(--radius)` usage — removing it would have broken an unrelated component outside this plan's file scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Gemba `@import` chain moved before `@import "tailwindcss"` to prevent the remote Google Fonts import from being stripped**
- **Found during:** Task 1 (Import Gemba token files into globals.css)
- **Issue:** Per the plan's literal instruction, the four new `@import` lines were placed immediately after `@import "shadcn/tailwind.css"` (before `@custom-variant dark`). Building with that order produced a Lightning CSS warning that the remote `@import url(https://fonts.googleapis.com/...)` nested inside `fonts.css` was not the first rule in the compiled stylesheet, and the import was silently dropped from every build artifact (confirmed via `grep` across `.next/` for `@import`, `googleapis`, `gstatic`, `@font-face` — zero matches in both orderings).
- **Fix:** Reordered so all four Gemba imports (`fonts.css` → `colors.css` → `typography.css` → `spacing.css`, same relative order as `design-system/styles.css`) appear as the very first lines of `globals.css`, before `@import "tailwindcss"`. This removes the build warning (confirmed clean build with only the pre-existing, unrelated Next.js workspace-root warning).
- **Files modified:** `src/app/globals.css`
- **Verification:** `npm run build` exits 0 with no CSS-related warnings; task's automated `grep` check for exactly 4 Gemba `@import` lines still passes.
- **Committed in:** `88d998a` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix, import ordering)
**Impact on plan:** Necessary to keep the build warning-free; does not change which files load or in what final order relative to each other (all four Gemba imports still land ahead of `@custom-variant dark` and `@theme inline`, satisfying the task's acceptance criteria literally). No scope creep — only `src/app/globals.css` was touched.

## Known Issue (not auto-fixable within this plan's file scope)

**The remote Google Fonts `@import` for Public Sans does not survive this app's production build pipeline regardless of ordering.** Empirically verified: even a single, first-line, top-level `@import url('https://fonts.googleapis.com/...')` in `globals.css` (isolated test, not committed) is silently dropped from every `.next/` build artifact by Turbopack/Lightning CSS's CSS bundler in Next.js 16 — no `@import`, no inlined `@font-face`, and no `<link>` tag appears anywhere in the compiled output or server-rendered HTML. This means `--font-sans` (`"Public Sans", -apple-system, ...`) is correctly *defined* as a CSS custom property (satisfying this plan's literal Task 1 `<done>` criterion and DESIGN-03's variable-availability requirement), but the actual Public Sans **webfont bytes are never fetched** by the browser — text will render in the next available fallback (`-apple-system`/`BlinkMacSystemFont`/system UI) rather than true Public Sans, for any user who doesn't have the font installed locally.

This is a pre-existing toolchain limitation (Turbopack/Lightning CSS does not preserve remote/unresolvable `@import` rules when bundled alongside `@import "tailwindcss"`), not something introduced by or fixable from within `globals.css` alone — the standard fix is a `<link rel="preconnect">` + `<link rel="stylesheet">` pair (or `next/font/google` self-hosting) in `src/app/layout.tsx`'s `<head>`, which is out of this plan's `files_modified` scope (`src/app/globals.css` only) and belongs to a layout-touching plan. **Flagging for the next plan that touches `src/app/layout.tsx`** (per `01-PATTERNS.md`, that's where the app-shell/layout work happens) to add real webfont delivery.

## Issues Encountered
None beyond the font-loading deviation documented above.

## Threat Flags

None. This plan only edits CSS token wiring; no new network, data-handling, or user-input surface was introduced beyond what the plan's own threat model already flagged and accepted (T-01-01-01, the Google Fonts remote reference itself — which, per the Known Issue above, doesn't even reach the network in the current build).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `globals.css` is now the single, fully Gemba-token-backed source of visual truth for both light and dark — every downstream plan (button/card/chip retrofits, app shell, home page) can rely on `bg-card`, `text-primary`, `rounded-lg`, `.gemba-h1..h5`, etc. resolving correctly in both themes with zero additional token wiring.
- **Blocker/concern for a later plan:** Public Sans webfont delivery needs a `<link>`-tag (or `next/font`) fix in `src/app/layout.tsx` — see "Known Issue" above. Does not block this plan's completion (its stated acceptance criteria are met), but should be picked up before Phase 1 sign-off / visual QA of DESIGN-03, since font fidelity is currently silently degraded to the system-font fallback.

---
*Phase: 01-design-foundation-home-page*
*Completed: 2026-07-10*

## Self-Check: PASSED

- FOUND: src/app/globals.css
- FOUND: .planning/phases/01-design-foundation-home-page/01-01-SUMMARY.md
- FOUND: 88d998a (Task 1 commit)
- FOUND: f814c49 (Task 2 commit)
- FOUND: 966091a (Task 3 commit)
- FOUND: 5735d59 (Summary commit)
