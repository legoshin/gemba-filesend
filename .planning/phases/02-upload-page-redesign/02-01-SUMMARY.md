---
phase: 02-upload-page-redesign
plan: 01
subsystem: ui
tags: [react, tailwind, gemba-design-system, icon-wrapper, dropzone]

# Dependency graph
requires:
  - phase: 01-design-foundation-home-page
    provides: Gemba design tokens (globals.css), Icon wrapper (COMP-04), Button ranks/sizes (COMP-01), Card inset-ring recipe (COMP-05)
provides:
  - Gemba-reskinned file-dropzone.tsx (drop-target + selected-file rows) with zero lucide-react dependency
affects: [02-02 (upload page reskin, imports FileDropzone unchanged), 02-03 (verification/sign-off checkpoint)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dropzone D-03 recipe: idle = dashed border-[var(--border-default)]; active = border-[var(--gemba-accent)] + bg-[var(--gemba-accent-subdued)]"
    - "Selected-file row = Card inset-ring recipe applied to a raw div: shadow-[var(--ring-border)] on bg-[var(--surface-card)], no border class"
    - "Icon-only square Button (size=icon-sm) requires a per-instance aria-label"

key-files:
  created: []
  modified:
    - src/components/file-dropzone.tsx

key-decisions:
  - "Split the single-file plan into two atomic commits (drop-target reskin, then row reskin) by staging an intermediate Task-1-only file state, since both tasks touch the same file — preserves one-commit-per-task even without git add -p"

patterns-established:
  - "file-dropzone.tsx selected-file row recipe: size-9 icon tile at --surface-subdued/--radius-sm + gemba-body-strong/gemba-body-sm text + ghost icon-sm remove button — reusable for any future file-list row"

requirements-completed: [PAGE-02]

# Metrics
duration: ~12min
completed: 2026-07-10
---

# Phase 2 Plan 01: Dropzone Reskin Summary

**Reskinned `file-dropzone.tsx` to Gemba design tokens (D-03 dashed/accent drop target + Card inset-ring file rows), migrating all three icons off lucide-react to the Phase 1 `Icon` wrapper, with zero changes to drag-drop/file-management logic.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-10T16:04:00Z (approx)
- **Completed:** 2026-07-10T16:16:18Z
- **Tasks:** 2 completed
- **Files modified:** 1

## Accomplishments
- Drop-target `<label>` now uses the Gemba dashed-idle / accent-tinted-active recipe (D-03) with `UploadCloud01` via the `Icon` wrapper, replacing `border-primary`/`bg-primary/5`/`bg-muted/50`
- Selected-file rows reskinned to the Card inset-ring recipe (`shadow-[var(--ring-border)]` on `--surface-card`, no CSS `border`), with a `File01` glyph tile and a `ghost`/`icon-sm` remove `Button` carrying a mandatory per-file `aria-label`
- Zero `lucide-react` references remain in `file-dropzone.tsx`; all icons render through the Phase 1 `Icon` wrapper
- All drag-drop, multi-file selection, per-file size-limit rejection, and remove-file behavior preserved byte-for-byte

## Task Commits

Each task was committed atomically:

1. **Task 1: Reskin the drop-target label (D-03 idle/active border + Icon)** - `ff44c36` (feat)
2. **Task 2: Reskin selected-file rows as Card inset-ring rows (D-03 + Icon + aria-label)** - `3ef3c48` (feat)

**Plan metadata:** (pending — final docs commit follows this summary)

## Files Created/Modified
- `src/components/file-dropzone.tsx` - Drop-target label and selected-file rows migrated to Gemba tokens + Icon wrapper; `lucide-react` import removed entirely; all callbacks (`handleDrop`, `handleFileSelect`, `removeFile`, `filterBySize`) unchanged

## Decisions Made
- Committed Task 1 and Task 2 as two separate atomic commits despite both touching the same file, by writing an intermediate Task-1-only file state, running `tsc`/lint against it, committing, then applying Task 2's edit and committing — keeps the one-commit-per-task contract intact for a single-file plan where `git add -p` splitting would be error-prone.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' acceptance criteria (exact class strings, `Icon` names, `aria-label` text) were followed verbatim from 02-PATTERNS.md lines 141-221.

## Issues Encountered
- Running the plan's task-level `npx tsc --noEmit` verify command after only Task 1's edit initially reported errors from the still-unmigrated `File`/`X` lucide icons in the (at-that-point-unedited) rows section — expected, since both tasks share one file and the plan's verify commands assume sequential completion within the same file. Resolved by structuring the two commits so each one lands in a state that independently type-checks (Task 1 commit keeps the original rows-section `lucide-react` import for `File`/`X`; Task 2 commit removes it once those icons are migrated).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `file-dropzone.tsx` is fully Gemba-tokenized and ready for `02-02` (upload page reskin) to import unchanged.
- Manual visual verification (dashed idle / accent active in light + dark) is deferred to the `02-03` checkpoint per the plan's `<verification>` section.
- No blockers.

---
*Phase: 02-upload-page-redesign*
*Completed: 2026-07-10*

## Self-Check: PASSED

- FOUND: src/components/file-dropzone.tsx
- FOUND: .planning/phases/02-upload-page-redesign/02-01-SUMMARY.md
- FOUND commit: ff44c36
- FOUND commit: 3ef3c48
