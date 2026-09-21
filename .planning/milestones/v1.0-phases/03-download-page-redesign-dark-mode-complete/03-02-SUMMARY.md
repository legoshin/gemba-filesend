---
phase: 03-download-page-redesign-dark-mode-complete
plan: 02
subsystem: ui
tags: [next-themes, radix, dropdown-menu, dark-mode, theme-toggle]

# Dependency graph
requires:
  - phase: 01-design-foundation-home-page
    provides: Gemba design tokens (--surface-card, --shadow-popover, --ring-border, --radius-sm, --surface-subdued), Icon wrapper, .gemba-body/.gemba-body-strong typography classes
provides:
  - Gemba-reskinned dropdown-menu.tsx popover recipe (DropdownMenuContent + plain DropdownMenuItem) — first real use of this primitive
  - 3-way light/dark/system ThemeToggle reading `theme` (not `resolvedTheme`) from next-themes
affects: [03-04-verification, dark-mode-completeness-bar]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Gemba popover recipe: bg-[var(--surface-card)] shadow-[var(--ring-border),var(--shadow-popover)] rounded-[var(--radius-sm)] (dropdown-menu.tsx DropdownMenuContent, first use)"
    - "3-way theme control: DropdownMenu composed with Icon wrapper glyphs (Sun/Moon01/Monitor01/Check), theme (not resolvedTheme) drives selected-state check + gemba-body-strong label"

key-files:
  created: []
  modified:
    - src/components/ui/dropdown-menu.tsx
    - src/components/theme-toggle.tsx

key-decisions:
  - "Reskinned only DropdownMenuContent + plain DropdownMenuItem (the two primitives the theme menu renders); left DropdownMenuCheckboxItem/RadioItem/SubTrigger/SubContent (and their lucide CheckIcon/ChevronRightIcon/CircleIcon imports) untouched — unused by this feature, correctly scoped as out-of-scope per PATTERNS.md"
  - "ThemeToggle keeps its unchanged Sun/Moon01 CSS crossfade trigger; only the click behavior changes from a 2-way flip to opening a 3-item DropdownMenu"

patterns-established:
  - "Popover token recipe for dropdown-menu.tsx is now the reusable pattern for any future menu/popover surface in this codebase"

requirements-completed: [DARK-02]

# Metrics
duration: 10min
completed: 2026-07-11
---

# Phase 3 Plan 2: 3-Way Theme Control + Dropdown-Menu Reskin Summary

**Replaced the 2-way `resolvedTheme` flip with a 3-way light/dark/system `ThemeToggle` driven by `theme`, and gave `dropdown-menu.tsx` its first Gemba popover reskin (surface-card + ring-border + shadow-popover) on its first real use.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-11T16:22:00Z (approx, context load)
- **Completed:** 2026-07-11T16:32:38Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `DropdownMenuContent` and the plain `DropdownMenuItem` now render with Gemba tokens (`--surface-card`, `--ring-border`, `--shadow-popover`, `--radius-sm`, `--surface-subdued` hover) instead of raw shadcn `bg-popover`/`shadow-md`/`border`/`focus:bg-accent`, which had no Gemba dark-mode resolution.
- `ThemeToggle` is now a genuine 3-way control: Light / Dark / System are all reachable and independently re-selectable, unblocking the "system" column of the DARK-02 completeness bar (the old 2-way flip could never represent "system" as a distinct state since it only ever read `resolvedTheme`).
- Selected item is marked with a trailing `Check` icon and `.gemba-body-strong` label; persistence continues to be handled entirely by `next-themes` (no new persistence code).

## Task Commits

Each task was committed atomically:

1. **Task 1: Gemba-reskin the dropdown-menu primitive (first real use)** - `dda777b` (feat)
2. **Task 2: Rewrite ThemeToggle as a 3-way light/dark/system control (D-02)** - `dbb8cb9` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE + ROADMAP + REQUIREMENTS)

## Files Created/Modified
- `src/components/ui/dropdown-menu.tsx` - `DropdownMenuContent` and plain `DropdownMenuItem` reskinned to the Gemba popover recipe; Checkbox/Radio/SubTrigger/SubContent variants left untouched (out of scope, unused by this feature)
- `src/components/theme-toggle.tsx` - Rewritten from a 2-way `resolvedTheme` flip to a 3-way `DropdownMenu` composing `Icon` glyphs (`Sun`/`Moon01`/`Monitor01`/`Check`), reading `theme` from `useTheme()`

## Decisions Made
- Scoped the dropdown-menu reskin strictly to the two primitives the theme menu actually renders (`DropdownMenuContent`, plain `DropdownMenuItem`), per PATTERNS.md's explicit scope guard — the Checkbox/Radio/SubTrigger/SubContent variants and their lucide icon imports are unused by this feature and were left as-is, avoiding unnecessary lucide-icon migration work outside this plan's scope.
- Kept the existing Sun/Moon01 CSS-driven crossfade trigger icon in `ThemeToggle` unchanged (per UI-SPEC §4) — only the click behavior changed, from a direct `setTheme` flip to opening a `DropdownMenuTrigger`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reverted premature DARK-02 requirement completion**
- **Found during:** state_updates (requirements.mark-complete step)
- **Issue:** `requirements.mark-complete DARK-02` marked the DARK-02 checkbox and traceability row fully "Complete" in `.planning/REQUIREMENTS.md`, but this plan's own frontmatter/success_criteria explicitly label DARK-02 as "(partial)" — DARK-02 is also listed as a requirement on `03-03-PLAN.md` and `03-04-PLAN.md` (the latter is where the DARK-02 completeness-bar sign-off gate actually happens). Marking it fully complete after only this plan misrepresents project state.
- **Fix:** Reverted `- [x] **DARK-02**` back to `- [ ]` and the traceability table row from "Complete" back to "In Progress" in `.planning/REQUIREMENTS.md`.
- **Files modified:** `.planning/REQUIREMENTS.md`
- **Verification:** `git diff .planning/REQUIREMENTS.md` shows only the DARK-02 rows changed; PAGE-03 (already correctly marked complete by 03-01) left untouched.
- **Committed in:** part of the plan metadata commit

---

**Total deviations:** 1 auto-fixed (1 bug — incorrect requirement-tracking state)
**Impact on plan:** No code/behavior impact — this is a planning-artifact correction only. DARK-02 will be re-marked complete once 03-04's completeness-bar sign-off actually verifies all surfaces.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `theme-toggle.tsx` and `dropdown-menu.tsx` are ready for the DARK-02 completeness-bar sign-off in Plan 04 (interactive verification of menu behavior + light/dark/system rendering of the popover is explicitly deferred there per this plan's `<verification>` section).
- `npx tsc --noEmit`, `npm run lint`, and `npm run build` all exit 0 with no new warnings introduced.
- No blockers for Plan 03 or Plan 04.

---
*Phase: 03-download-page-redesign-dark-mode-complete*
*Completed: 2026-07-11*

## Self-Check: PASSED

- FOUND: src/components/theme-toggle.tsx
- FOUND: src/components/ui/dropdown-menu.tsx
- FOUND: .planning/phases/03-download-page-redesign-dark-mode-complete/03-02-SUMMARY.md
- FOUND commit: dda777b (Task 1)
- FOUND commit: dbb8cb9 (Task 2)
- `npx tsc --noEmit`, `npm run lint`, `npm run build` all exit 0
