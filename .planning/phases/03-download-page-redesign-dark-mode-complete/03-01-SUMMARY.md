---
phase: 03-download-page-redesign-dark-mode-complete
plan: 01
subsystem: ui
tags: [nextjs, react, tailwind, design-system, icon-wrapper, chip, download-page]

# Dependency graph
requires:
  - phase: 02-upload-page-redesign
    provides: Icon wrapper, Chip component, inset-ring Card recipe, calm-success recipe, outline-to-secondary button mapping — all precedented and reused verbatim here
provides:
  - Reskinned src/app/download/page.tsx (input/preview/downloading/done states in Gemba tokens)
  - D-01 "handled, not thrown" terminal error states (invalid-link, file-not-found, expired) as in-page state cards
  - D-01 inline wrong-password error under the password field
  - D-03 secure-reassurance row inside the File Details card
affects: [03-02, 03-03, 03-04 (DARK-02 visual sign-off)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-01 terminal error state card: Card > CardContent centered mx-auto max-w-sm space-y-4 text-center, icon tile + gemba-h4 headline + gemba-body subdued copy + primary full-width action"
    - "Inline field error: aria-invalid + inset-ring critical shadow substitution on Input, gemba-body-sm critical message below, cleared on next onChange"

key-files:
  created: []
  modified:
    - src/app/download/page.tsx

key-decisions:
  - "DownloadState extended with three new literal values (invalid-link, file-not-found, expired) rather than a discriminated error field — simplest option given the existing four-state union pattern already in the file"
  - "isPasswordError local boolean in handleDownload's try block (not error-message string matching) distinguishes the 401/403 case from other download failures in the shared catch block, keeping the single try/catch structure intact"
  - "Loading03 kept (not the Loading01 fallback) — glyph reads correctly under CSS rotation, no fallback needed"

requirements-completed: [PAGE-03]

# Metrics
duration: 6min
completed: 2026-07-11
---

# Phase 3 Plan 1: Download Page Redesign Summary

**Download page reskinned to Gemba tokens (Icon wrapper, Chip, inset-ring row, calm success) with D-01 in-page error states replacing toast-only failure handling, and D-03's secure-reassurance row added — download/decrypt logic untouched.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-11T16:21:15Z
- **Completed:** 2026-07-11T16:26:57Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- All four existing download states (input, preview, downloading, done) migrated to Gemba tokens: `Icon` wrapper replaces all 7 `lucide-react` icons, `Chip` replaces all 4 `Badge`s (3 neutral + 1 success E2E), inset-ring file-details row, calm success tile, `.gemba-h2`/`.gemba-h4` typography
- D-03 secure-reassurance row added inside the File Details card (locked copy, `ShieldTick` icon, success-subdued background, ink body text)
- D-01 terminal error states implemented: invalid-link, file-not-found, and expired/exhausted links now render dedicated in-page Gemba state cards with a primary "Try another link" action, replacing the prior toast-and-silently-return behavior
- D-01 inline wrong-password error implemented: 401/403 on download now returns the user to `preview` with an inline critical message and critical field ring, instead of a toast
- Copy normalized to sentence case per the Copywriting Contract ("Fetch file info", "Download and decrypt", "Download another file")

## Task Commits

Each task was committed atomically:

1. **Task 1: Reskin the four existing download states** - `acd19b8` (feat)
2. **Task 2: Add D-01 handled error states** - `530552b` (feat)

**Plan metadata:** (pending — commit hash recorded after this SUMMARY commit)

## Files Created/Modified
- `src/app/download/page.tsx` - Reskinned download-flow page: four existing states migrated to Gemba tokens/components, three new D-01 terminal error-state cards, inline wrong-password error, D-03 secure-reassurance row. `fetchFileInfo`, `handleDownload`, `handleReset`, `decryptPacked`, `importKeyBase64`, and the streaming-download reader loop are unchanged.

## Decisions Made
- `DownloadState` union extended with three literal values (`invalid-link`, `file-not-found`, `expired`) rather than introducing a discriminated error field, matching the file's existing state-union style.
- A local `isPasswordError` boolean set immediately before the 401/403 `throw` lets the single existing `catch` block branch on password-vs-other failures without string-matching the thrown `Error`'s message.
- Kept `Loading03` (not the `Loading01` fallback) for the downloading-state spinner — the glyph reads correctly when spun; no fallback needed. Final visual confirmation deferred to the DARK-02 sign-off gate in a later plan of this phase, per the plan's own instruction.

## Deviations from Plan

None - plan executed exactly as written. Both tasks followed the PATTERNS.md recipes and UI-SPEC contract verbatim; no Rule 1-4 triggers encountered.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `src/app/download/page.tsx` is fully reskinned and functionally unchanged (crypto/streaming path preserved verbatim, verified by source inspection and successful `npx tsc --noEmit` / `npm run lint` / `npm run build`).
- PAGE-03 requirement closed by this plan.
- Visual/theme correctness (light/dark/system) for this page is explicitly deferred to the DARK-02 completeness-bar sign-off gate later in this phase (per UI-SPEC) — not yet verified visually.
- Ready for the next plan in Phase 3 (theme-toggle 3-way control / DARK-02 verification, per the phase's remaining plans).

---
*Phase: 03-download-page-redesign-dark-mode-complete*
*Completed: 2026-07-11*

## Self-Check: PASSED

- `src/app/download/page.tsx` exists on disk: FOUND
- Task 1 commit `acd19b8` present in git log: FOUND
- Task 2 commit `530552b` present in git log: FOUND
- `npx tsc --noEmit`: exit 0
- `npm run lint`: 0 errors (4 pre-existing warnings, unrelated files)
- `npm run build`: succeeded, `/download` route compiled
