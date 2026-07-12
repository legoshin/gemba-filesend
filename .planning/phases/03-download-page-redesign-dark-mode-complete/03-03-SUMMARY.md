---
phase: 03-download-page-redesign-dark-mode-complete
plan: 03
subsystem: ui
tags: [nextjs, fonts, public-sans, turbopack, lightning-css, app-router]

# Dependency graph
requires:
  - phase: 01-design-foundation-home-page
    provides: Gemba design tokens including the Public Sans font-family chain and the fonts.css remote @import
provides:
  - Public Sans webfont request that survives npm run build (production), not just next dev
  - Document-head <link rel="stylesheet"> loading pattern for Google Fonts in the App Router root layout, independent of the CSS @import pipeline
affects: [04-hardening-and-launch-readiness]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Google Fonts loaded via document-head <link> (preconnect + stylesheet) in src/app/layout.tsx rather than a CSS @import, to survive Turbopack/Lightning CSS's production @import stripping"

key-files:
  created: []
  modified:
    - src/app/layout.tsx

key-decisions:
  - "Used the <link>-tag approach (not next/font/google) per the plan's stated preference — reuse-first, surgical, and it keeps the existing @theme Public Sans token chain as the sole source of the font-family value"
  - "Suppressed the @next/next/no-page-custom-font ESLint warning with an inline eslint-disable-next-line and comment — the rule is written for the pages-router _app.js case and does not understand that an App Router root layout already applies globally (equivalent to _document.js), so the 'only loads for a single page' warning is a false positive here"

patterns-established:
  - "Pattern 1: When a design-system CSS @import is dropped by the production bundler, load the same remote stylesheet URL via a <link> tag in the App Router root layout <head> instead — the fonts.css @import stays in place unchanged as design-system source of truth for next dev parity, the <link> is the production-safe delivery mechanism"

requirements-completed: [DARK-02]

# Metrics
duration: 6min
completed: 2026-07-11
---

# Phase 3 Plan 3: Public Sans Production Webfont Fix Summary

**Public Sans now loads via a preconnect + `<link rel="stylesheet">` in the App Router root layout `<head>`, bypassing the Turbopack/Lightning CSS production strip of the `fonts.css` remote `@import`.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-11T16:36:00Z
- **Completed:** 2026-07-11T16:39:17Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added `<link rel="preconnect">` (googleapis + gstatic, `crossOrigin="anonymous"` on the gstatic one) and a `<link rel="stylesheet">` pointing at the exact same Google Fonts URL (`family=Public+Sans:ital,wght@0,100..900;1,100..900&family=Inter:...&display=swap`) already present in `design-system/tokens/fonts.css`, placed inside a document-head `<head>` block in `src/app/layout.tsx`.
- Confirmed via `npm run build` that the Public Sans font request now appears in the prerendered HTML for every static page (`index.html`, `download.html`, `upload.html`, `_not-found.html`) in `.next/server/app/` — the font is no longer dropped in production.
- `design-system/tokens/fonts.css` left completely unchanged (its `@import` still serves `next dev` parity and remains design-system source of truth); no raw font-family literal was introduced anywhere — the Gemba `@theme` Public Sans token chain still governs body text.
- `ThemeProvider`, `AppShell`, `Toaster`, `metadata`, `viewport`, and the SW-registration `Script` in `layout.tsx` are byte-for-byte unchanged — the diff is additive-only (25 lines added, 0 removed).

## Task Commits

Each task was committed atomically:

1. **Task 1: Load Public Sans robustly from the document head** - `be74458` (fix)

**Plan metadata:** _(pending — this commit)_

## Files Created/Modified

- `src/app/layout.tsx` - Added a `<head>` block with `preconnect` links and a `stylesheet` `<link>` for Public Sans/Inter, ahead of the existing `<body>`; includes an inline comment explaining why (Lightning CSS `@import` strip) and an ESLint suppression comment for the pages-router-oriented `no-page-custom-font` false positive.

## Decisions Made

- Chose the `<link>`-tag approach over `next/font/google` — it's the plan's stated preferred, more surgical option (no new build-time font pipeline, no risk of disrupting the existing `@theme` Public Sans token chain), and it required touching nothing but `layout.tsx`.
- Suppressed the resulting `@next/next/no-page-custom-font` ESLint warning inline with a documented `eslint-disable-next-line`, rather than leaving a new warning in the codebase or restructuring around it — the rule doesn't have App Router awareness (it assumes `pages/_app.js`, where a custom font `<link>` really would only apply per-page; the App Router root layout already applies to every route).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug/lint hygiene] Suppressed false-positive `no-page-custom-font` ESLint warning**
- **Found during:** Task 1 (verification step, `npm run lint`)
- **Issue:** Adding the font `<link>` to the App Router root layout triggered `@next/next/no-page-custom-font`, a rule designed for the pages-router `_app.js` pattern where a custom-font link genuinely would only apply to a single page. In the App Router, `layout.tsx` already applies globally (it's the `_document.js` equivalent), so the warning text ("will only load for a single page") is factually incorrect here.
- **Fix:** Added a single-line `eslint-disable-next-line @next/next/no-page-custom-font` immediately above the `<link rel="stylesheet">`, with a comment explaining why the rule doesn't apply.
- **Files modified:** `src/app/layout.tsx` (same commit as the main change)
- **Verification:** `npm run lint` dropped from 5 warnings (1 new + 4 pre-existing) back to 4 pre-existing warnings, 0 errors, exit 0.
- **Committed in:** `be74458` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 lint hygiene / Rule 1)
**Impact on plan:** Minor, in-scope cleanup directly caused by the task's own change. No scope creep — no other files touched, no unrelated warnings addressed.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The `<link>` targets the same public Google Fonts CDN URLs (`fonts.googleapis.com`, `fonts.gstatic.com`) already referenced by `fonts.css`; no new npm dependency, no new environment variable.

## Next Phase Readiness

- The "Public Sans webfont in production build" row of the DARK-02 completeness bar (`03-UI-SPEC.md`) now has its code-side fix in place — `npm run build` confirms the font request survives into every prerendered page's HTML.
- Final visual confirmation (Public Sans actually rendering, not falling back to a system font, on the deployed Vercel build across light/dark/system) remains a checklist row for Plan 04's DARK-02 sign-off gate, as scoped in the plan — this plan closes the code-level cause, not the deployed-environment visual verification.
- No blockers for Plan 04.

## TDD Gate Compliance

Not applicable — `tdd_mode` is disabled for this project (`workflow.tdd_mode: false` in `.planning/config.json`) and this plan's frontmatter is `type: execute`, not `type: tdd`.

---
*Phase: 03-download-page-redesign-dark-mode-complete*
*Completed: 2026-07-11*

## Self-Check: PASSED

- FOUND: src/app/layout.tsx
- FOUND: be74458 (git log --oneline --all)
- FOUND: .planning/phases/03-download-page-redesign-dark-mode-complete/03-03-SUMMARY.md
- Re-ran acceptance criteria: `npx tsc --noEmit` exit 0, `npm run lint` exit 0 (0 errors), `npm run build` exit 0, `grep -Eq "Public\+Sans|next/font" src/app/layout.tsx` matched, `git diff design-system/tokens/fonts.css` empty, Public Sans font request confirmed present in `.next/server/app/{index,download,upload,_not-found}.html`.
