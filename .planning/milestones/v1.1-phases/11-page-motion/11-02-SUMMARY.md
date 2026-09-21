---
phase: 11-page-motion
plan: 02
subsystem: ui
tags: [motion, react, nextjs, motion-react, animation, upload]

# Dependency graph
requires:
  - phase: 11-page-motion (11-01)
    provides: "PageEntrance/PageEntranceItem wrapper, ScrollProgress component, staggerContainer preset"
provides:
  - "Upload page (src/app/upload/page.tsx) wired with staggered entrance motion (Select Files, Options, action button, Upload-Complete card)"
  - "ScrollProgress mounted on the upload page (the first long page to get it)"
affects: [11-03, page-motion]

# Actuals (#2632)
actuals:
  tokens: 750
  tasks: 1
  commits: 1

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reused wave-1 PageEntrance/PageEntranceItem + ScrollProgress components verbatim — no new stagger/spring numbers introduced on this page."

key-files:
  created: []
  modified:
    - src/app/upload/page.tsx

key-decisions:
  - "Wrapped only the plan-enumerated top-level cards (Select Files, Options, action/submit button, Upload-Complete success card) in PageEntranceItem — the conditional isBusy progress Card (not present at initial mount) was left unwrapped, matching the plan's explicit scope and the fact that stagger-on-mount only applies to content present at mount."
  - "ScrollProgress mounted once, as the first child of the primary content return (inside the new PageEntrance root) — it is `fixed`, so its DOM position does not affect layout; not duplicated in the Upload-Complete branch since it is one continuous page-level overlay, not per-branch."
  - "Preserved every existing className/prop/handler/child byte-for-byte per the plan's instruction — only inserted wrapper `<PageEntrance>`/`<PageEntranceItem>`/`<ScrollProgress />` elements; did not re-indent the wrapped content, keeping the diff to the minimal insertion set."

patterns-established: []

requirements-completed: [MOT-01, MOT-02]

coverage:
  - id: D1
    description: "Upload page's primary content (Select Files, Options, action/submit cards, and the Upload-Complete card) animates in with the shared PageEntrance stagger on mount."
    requirement: "MOT-01"
    verification:
      - kind: other
        ref: "npm run build (Next.js production build, includes /upload route generation)"
        status: pass
    human_judgment: true
    rationale: "Visual staggered entrance and reduced-motion opacity-only degrade are perceptual outcomes deferred to Phase 12 manual verification per this plan's <verification> section; automated checks only prove wiring and build health."
  - id: D2
    description: "A thin scroll-progress bar (shared ScrollProgress component) is mounted once on the upload page and tracks scroll position."
    requirement: "MOT-02"
    verification:
      - kind: other
        ref: "npm run build (Next.js production build)"
        status: pass
    human_judgment: true
    rationale: "Visual scroll-tracking behavior is a perceptual outcome deferred to Phase 12 manual verification; automated checks only prove the component is mounted and the build is green."

# Metrics
duration: 20min
completed: 2026-09-21
status: complete
---

# Phase 11 Plan 02: Upload Page Entrance Motion + Scroll Progress Summary

**Upload page's Select Files / Options / action cards and the Upload-Complete card now stagger in via the shared PageEntrance/PageEntranceItem wrapper, and a ScrollProgress bar tracks scroll on the page — reusing the wave-1 components verbatim.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Imported `PageEntrance`, `PageEntranceItem` from `@/components/page-entrance` and `ScrollProgress` from `@/components/scroll-progress` into `src/app/upload/page.tsx`.
- Replaced the primary content return's root `<div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">` with `<PageEntrance className="...">`, mounting `<ScrollProgress />` as its first child.
- Wrapped the Upload-Complete success `<Card>` in `<PageEntranceItem>`.
- Wrapped the Select Files `<Card>`, the Options `<Card>`, and the action/submit `<Button>` (in the pre-upload branch) each in their own `<PageEntranceItem>`.
- Left the conditionally-rendered `isBusy` upload-progress `<Card>` and the `<Dialog>` untouched — they are not part of the initial-mount stagger scope per the plan.
- Verified zero diff to `src/lib/crypto.ts`, `storage.ts`, `server-storage.ts`, `blob-storage.ts`, `multi-file.ts`, and `design-system/tokens/`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wrap upload primary content in PageEntrance + mount ScrollProgress (surgical)** - `4551fdd` (feat)

## Files Created/Modified
- `src/app/upload/page.tsx` - Wrapped primary content cards in PageEntrance/PageEntranceItem; mounted ScrollProgress once; no other logic touched.

## Decisions Made
- Only the plan-enumerated cards (Select Files, Options, action button, Upload-Complete card) were wrapped in PageEntranceItem; the conditional isBusy progress card was intentionally left out, since it isn't present at initial mount and the plan didn't list it.
- ScrollProgress mounted exactly once (not duplicated for the Upload-Complete branch) since it's a single fixed-position overlay for the whole page.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Upload page entrance + scroll-progress wiring complete and build/test green (128 tests, baseline maintained).
- 11-03 (download page) can follow the identical pattern established here and in 11-01.
- Manual verification (visible stagger, reduced-motion collapse, light/dark/system rendering, encryption/upload flow parity) deferred to Phase 12 per this plan's `<verification>` section — not a gate on this plan.

---
*Phase: 11-page-motion*
*Completed: 2026-09-21*

## Self-Check: PASSED

`src/app/upload/page.tsx` confirmed present with PageEntrance/PageEntranceItem/ScrollProgress wiring; commit `4551fdd` confirmed in git log.
