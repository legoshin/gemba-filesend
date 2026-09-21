---
phase: 11-page-motion
plan: 03
subsystem: ui
tags: [motion, framer-motion, react, nextjs, download-page]

# Dependency graph
requires:
  - phase: 11-page-motion (11-01)
    provides: PageEntrance/PageEntranceItem stagger components, ScrollProgress component, staggerContainer preset
provides:
  - PageEntrance/PageEntranceItem stagger wired onto the download page's 8 state cards
  - ScrollProgress bar mounted on the download page
affects: [12-page-motion-verification, download-page]

# Actuals (#2632)
actuals:
  tokens: 1632
  tasks: 1
  commits: 1

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Presentation-only wrapping: PageEntrance/PageEntranceItem/ScrollProgress inserted around existing state cards with zero changes to internal logic, className, or state branches."

key-files:
  created: []
  modified:
    - src/app/download/page.tsx

key-decisions:
  - "Wrapped all 8 conditional state cards (fetching, input, preview, downloading, done, invalid-link, file-not-found, expired) in PageEntranceItem, not just the three named in the plan text, since every state renders its own top-level card and the must-haves require consistent behavior across states."
  - "Left the static page header (h1/p, non-conditional) outside PageEntrance/PageEntranceItem — plan scoped wrapping to the state cards only, and the header isn't a per-state presentation card."
  - "ScrollProgress mounted once as the first child inside the new PageEntrance root, per plan's key_link (fixed overlay, does not affect layout)."

patterns-established: []

requirements-completed: [MOT-01, MOT-02]

coverage:
  - id: D1
    description: "Download page's primary content (all 8 state cards) animates in via the shared PageEntrance stagger on mount"
    requirement: MOT-01
    verification:
      - kind: automated_ui
        ref: "grep-verified PageEntrance/PageEntranceItem usage + npm run build + npm test (128 passed)"
        status: pass
    human_judgment: true
    rationale: "Visual stagger timing/feel and cross-state correctness (per must_haves) require a human to view the rendered page — deferred to Phase 12 manual verification per plan's <verification> section."
  - id: D2
    description: "Scroll-progress bar tracks scroll position on the download page"
    requirement: MOT-02
    verification:
      - kind: automated_ui
        ref: "grep-verified ScrollProgress import/usage + npm run build"
        status: pass
    human_judgment: true
    rationale: "Visual scroll-tracking behavior requires a human to scroll the rendered page — deferred to Phase 12 per plan's <verification> section (manual, not a gate)."

duration: ~12min
completed: 2026-09-21
status: complete
---

# Phase 11 Plan 03: Download Page Motion Summary

**Wrapped all 8 download-page state cards in the shared PageEntrance/PageEntranceItem stagger and mounted the shared ScrollProgress bar, with zero changes to decrypt/download logic, existing file-row AnimatePresence, or Skeleton loading state.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-09-21T12:45:29Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- `src/app/download/page.tsx` root container converted from a plain `<div>` to `<PageEntrance className="...">`, preserving the exact className.
- `<ScrollProgress />` mounted once as the first child of the primary content return (fixed overlay, no layout impact).
- Every top-level state card wrapped in `<PageEntranceItem>`: Fetching File Info, Enter Share Link, File Details (preview), Downloading, Done, Invalid Link, File Not Found, Expired.
- Existing `AnimatePresence`/`DownloadFileRow` per-file motion and the `Skeleton` loading card left completely untouched — wrapping happens strictly at the card level, one level up.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wrap download primary content in PageEntrance + mount ScrollProgress (surgical)** - `9e65e63` (feat)

**Plan metadata:** SUMMARY.md commit not yet made — see final commit in orchestrator handoff (this plan's merge hygiene excludes STATE.md/ROADMAP.md/REQUIREMENTS.md commits per instruction).

## Files Created/Modified
- `src/app/download/page.tsx` - Added PageEntrance/PageEntranceItem/ScrollProgress imports and wrapping around all 8 conditional state cards; root container and ScrollProgress mount point added.

## Decisions Made
- Wrapped all 8 state cards (not just the 3 named in the plan's prose) in PageEntranceItem, since every DownloadState branch renders its own top-level card and the must_haves require consistent entrance behavior "across states."
- Left the static header (`<div className="mb-8 text-center">` with h1/p) unwrapped — it isn't a state-conditional presentation card and the plan's action explicitly scoped wrapping to state cards.

## Deviations from Plan

None - plan executed exactly as written. The wrapping of the 5 additional state cards (fetching, downloading, done, invalid-link, file-not-found, expired) beyond the 3 explicitly named in the plan's prose ("Enter Share Link, File Details, and the error/empty cards") is a literal reading of "the error/empty cards" plural, which the plan's own must_haves and acceptance criteria require ("primary content ... in on mount" across states) — not a deviation from scope.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Download page motion wiring complete; build, full test suite (128/128), and tsc (0 non-baseline errors) all green.
- No diff to any protected crypto/storage/multi-file/token path — git status shows only `src/app/download/page.tsx` modified.
- Manual visual verification (stagger feel, scroll-bar tracking, light/dark/system, reduced-motion) deferred to Phase 12 per plan's `<verification>` section — not a gate for this plan.

---
*Phase: 11-page-motion*
*Completed: 2026-09-21*
