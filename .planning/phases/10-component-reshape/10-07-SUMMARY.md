---
phase: 10-component-reshape
plan: 07
subsystem: ui
tags: [motion, motion-react, smoothui, animatepresence, skeleton, file-upload]

requires:
  - phase: 10-component-reshape (10-01)
    provides: src/lib/motion.ts (transitions, variants), src/lib/use-motion-preset.ts, src/lib/shape.ts foundation
provides:
  - FileDropzone reshaped onto SmoothUI motion (drag-state scale + AnimatePresence file rows via a FileRow subcomponent)
  - ShareResultRow (upload) and DownloadFileRow (download) animated-list row subcomponents
  - New src/components/ui/skeleton.tsx (pure-CSS animate-pulse treatment)
  - Skeleton wired into a new download metadata-fetch loading state
affects: [component-reshape-remaining-plans, future-file-list-ui-work]

actuals:
  tokens: 4000
  tasks: 3
  commits: 3
plan_head_before: ca0dcbdb7d35a0601808a48cd841f00b18cd2c1a

tech-stack:
  added: []
  patterns:
    - "Row-list subcomponent extraction (FileRow / ShareResultRow / DownloadFileRow) so useMotionPreset is called once per row instance, never inside .map() (Rules of Hooks)"
    - "Busy-flag-gated loading render (isFetchingInfo, matching the existing verifyBusy convention) used to host a Skeleton where no loading state previously existed"

key-files:
  created:
    - src/components/ui/skeleton.tsx
  modified:
    - src/components/file-dropzone.tsx
    - src/app/upload/page.tsx
    - src/app/download/page.tsx

key-decisions:
  - "No metadata-fetch loading state existed in download/page.tsx before this plan (state stayed \"input\" with zero visual feedback while fetchFileInfo() ran) — added a minimal isFetchingInfo busy flag, matching the file's own existing verifyBusy pattern, purely to give FDBK-03's Skeleton somewhere correct to render. fetchFileInfo's body is untouched."
  - "Used useMotionPreset (not raw useReducedMotion) for the dropzone's drag-scale, matching RESEARCH Pattern 3's exact example and the established chip.tsx convention."

patterns-established:
  - "Skeleton component: React.ComponentProps<\"div\">, data-slot=\"skeleton\", cn()-merged className, animate-pulse + shape.innerCard + motion-reduce:animate-none, no motion/react import"

requirements-completed: [FILE-01, FILE-02, FDBK-03]

coverage:
  - id: D1
    description: "File-dropzone drag reacts with SmoothUI motion off the existing isDragging state; selected-file rows animate add/remove via AnimatePresence + a FileRow subcomponent"
    requirement: "FILE-01"
    verification:
      - kind: unit
        ref: "npm test (127 passing, unregressed) + npm run build exit 0"
        status: pass
    human_judgment: true
    rationale: "Visual drag/motion feel and add/remove animation timing need a human to confirm it looks and feels right in the browser; automated tests cover encryption/logic regression only, not the motion itself."
  - id: D2
    description: "Share-result rows (upload) and download file rows use SmoothUI animated-list add/remove motion via ShareResultRow/DownloadFileRow subcomponents"
    requirement: "FILE-02"
    verification:
      - kind: unit
        ref: "npm test (127 passing, unregressed) + npm run build exit 0"
        status: pass
    human_judgment: true
    rationale: "Same as D1 — animated-list visual behavior needs human confirmation, not just build/test green."
  - id: D3
    description: "A SmoothUI-style Skeleton exists (pure CSS, motion-reduce:animate-none) and is applied to a new download metadata-fetch loading state"
    requirement: "FDBK-03"
    verification:
      - kind: unit
        ref: "npm test (127 passing, unregressed) + npm run build exit 0"
        status: pass
    human_judgment: true
    rationale: "No prior loading state existed for this flow; a human should confirm the new isFetchingInfo-gated Skeleton renders correctly and reduced-motion degrades it as expected."

duration: 25min
completed: 2026-09-21
status: complete
---

# Phase 10 Plan 07: File dropzone + list rows + Skeleton Summary

**File-dropzone drag + selected-file rows, upload share-result rows, and download file rows reshaped onto SmoothUI AnimatePresence/stagger motion via per-row subcomponents; new pure-CSS Skeleton created and wired into a newly added download metadata-fetch loading state — encryption/storage/multi-file logic untouched (127/127 tests green throughout).**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3/3 completed
- **Files modified:** 4 (3 modified, 1 created)
- **Commits:** 3 (measured via `git rev-list --count ca0dcbdb7d..HEAD`)

## Accomplishments
- `FileDropzone` reshaped: hoisted `MotionLabel`, drag-state scale via `useMotionPreset`, and an extracted `FileRow` subcomponent wrapped in `AnimatePresence` for add/remove motion — all existing handlers/state left byte-for-byte unchanged.
- Upload's share-result rows and download's file rows both reshaped via extracted `ShareResultRow`/`DownloadFileRow` subcomponents wrapped in `AnimatePresence`, avoiding the Rules-of-Hooks violation of calling `useMotionPreset` inside `.map()`.
- New `src/components/ui/skeleton.tsx`: pure-CSS `animate-pulse` + `shape.innerCard` + `motion-reduce:animate-none`, matching SmoothUI's own CSS-only skeleton-loader.
- Skeleton applied to a newly added download-page metadata-fetch loading state (none existed before).

## Task Commits

Each task was committed atomically:

1. **Task 1: Reshape file-dropzone drag + selected-file rows, logic untouched (FILE-01)** - `38eeeba2` (feat)
2. **Task 2: Animated-list share-result + download file rows, surgical (FILE-02)** - `2df109f6` (feat)
3. **Task 3: Create the Skeleton treatment + apply to the download loading state (FDBK-03)** - `8e473d38` (feat)

**Plan metadata:** SUMMARY.md itself committed separately per this plan's merge-hygiene instructions (no STATE.md/ROADMAP.md/REQUIREMENTS.md touched by this plan).

## Files Created/Modified
- `src/components/file-dropzone.tsx` - Hoisted `MotionLabel`, drag-state motion, `FileRow` subcomponent + `AnimatePresence` for file rows
- `src/app/upload/page.tsx` - `ShareResultRow` subcomponent + `AnimatePresence` for the share-result list
- `src/app/download/page.tsx` - `DownloadFileRow` subcomponent + `AnimatePresence` for the file list; new `isFetchingInfo`-gated Skeleton loading state
- `src/components/ui/skeleton.tsx` - New pure-CSS Skeleton component (created)

## Decisions Made
- No metadata-fetch loading UI existed in `download/page.tsx` prior to this plan — `fetchFileInfo()` ran with `state` staying `"input"` and zero visual feedback. Since FDBK-03 explicitly requires the Skeleton to be "applied to the download loading state," a minimal `isFetchingInfo` boolean was added (mirroring the file's own pre-existing `verifyBusy` busy-flag convention) purely to host the Skeleton render. `fetchFileInfo`'s body and all other download/decrypt logic are untouched — this is a UI-only busy-flag wrapper around the existing call site, in the same category as the codebase's existing `verifyBusy` pattern.
- Used `useMotionPreset` (not a raw `useReducedMotion()` call) for the dropzone's drag-state scale, matching RESEARCH Pattern 3's example verbatim and the `chip.tsx`-established convention of resolving reduced motion through the shared hook rather than a bespoke check.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added a metadata-fetch loading state to download/page.tsx**
- **Found during:** Task 3 (Skeleton treatment)
- **Issue:** The plan's Task 3 `<read_first>` assumed an existing "metadata-loading / fetching state that currently renders a spinner/placeholder" to locate and augment. On inspection, no such state exists — `download/page.tsx`'s `state` stays `"input"` with no loading indicator while `fetchFileInfo()` is in flight; the only spinner state (`"downloading"`) is the live file-download/decrypt progress UI, which is off-limits per the encryption-boundary hard guard.
- **Fix:** Added a new `isFetchingInfo` boolean (matching the file's existing `verifyBusy` busy-flag convention), wired only around the `handleFetchInfo` call site (`fetchFileInfo(link).finally(...)`), and added a `state === "input" && isFetchingInfo` render branch showing `<Skeleton>` rows sized to match the metadata row layout. `fetchFileInfo`'s internal logic is unchanged.
- **Files modified:** src/app/download/page.tsx
- **Verification:** `npm run build` exit 0, `npm test` 127/127, crypto/storage/multi-file/token diff guard shows zero changes.
- **Committed in:** `8e473d38` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical functionality)
**Impact on plan:** Required to satisfy FDBK-03's explicit "applied to the download loading state" deliverable, since no such state pre-existed. No encryption/download/decrypt logic touched — the addition is a UI-only busy flag in the same pattern as the file's own `verifyBusy`. No scope creep beyond what Task 3 required.

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Wave 2 page-level edits for Phase 10 are consolidated in this one plan, as required by the plan's objective ("the one plan that owns all Phase-10 page edits").
- Encryption boundary provably unweakened: `git diff` shows zero changes to `src/lib/crypto.ts`, `storage.ts`, `server-storage.ts`, `blob-storage.ts`, `multi-file.ts`, or `design-system/tokens/` across all 3 commits; 127/127 tests pass throughout (baseline unchanged); `tsc --noEmit` output is byte-identical to the pre-existing baseline (15 lines, all in `crypto.test.ts`, unrelated to this plan).
- Human verification recommended for the visual/motion feel (drag scale, row add/remove animation, reduced-motion degrade) per the `human_judgment: true` coverage entries above — automated checks only prove non-regression, not the motion UX itself.

---
*Phase: 10-component-reshape*
*Completed: 2026-09-21*

## Self-Check: PASSED

All created/modified files verified present on disk; all 3 task commit hashes (`38eeeba2`, `2df109f6`, `8e473d38`) verified present in `git log --oneline --all`.
