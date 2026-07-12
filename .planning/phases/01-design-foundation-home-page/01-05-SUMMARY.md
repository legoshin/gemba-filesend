---
phase: 01-design-foundation-home-page
plan: 05
subsystem: ui
tags: [nextjs, react, tailwind, app-shell, navigation, dark-mode, icon-wrapper]

# Dependency graph
requires:
  - phase: 01-design-foundation-home-page
    provides: "Icon wrapper (01-02), Button/token retrofit (01-03) consumed by the shell"
provides:
  - "AppShell: desktop 240px sidebar + top bar with active-route nav highlighting"
  - "MobileTabBar: fixed bottom tab bar (Home/Upload/Download) replacing the Sheet drawer"
  - "layout.tsx rewired to AppShell; Header no longer mounted anywhere"
affects: [01-06-home-page, 01-07-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "usePathname()-based active-nav detection (bg-[var(--surface-subdued)] fill + gemba-body-strong)"
    - "Fixed-position app shell: aside (md:flex, w-60) + md:pl-60 content offset + fixed bottom nav on mobile"

key-files:
  created:
    - src/components/app-shell.tsx
    - src/components/mobile-tab-bar.tsx
  modified:
    - src/app/layout.tsx

key-decisions:
  - "Chose Home01/Upload01/Download01 Untitled UI glyphs (numbered variant, consistent with Sun/Moon01 naming already used in theme-toggle.tsx)"
  - "Kept ThemeToggle in the sidebar footer for desktop; added a slim top bar (visible at all breakpoints) that shows ThemeToggle only on mobile (wrapped in a plain md:hidden div, since theme-toggle.tsx takes no className prop and was not to be modified)"
  - "header.tsx left in place, now fully unused (zero remaining imports) — flagged for deletion in a later plan per plan instructions (do not delete pre-existing files unless plan says to)"

patterns-established:
  - "Icon glyph naming convention for nav/tab icons: Home01, Upload01, Download01 from src/components/icon-data.js"

requirements-completed: [PAGE-01, DARK-03]

# Metrics
duration: 12min
completed: 2026-07-10
---

# Phase 1 Plan 5: Gemba App Shell Summary

**Fixed 240px sidebar + top bar (desktop) and bottom tab bar (mobile) replace the sticky Header, with usePathname-driven active-nav highlighting and the theme-aware logo swap preserved verbatim.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-10T13:28:00+01:00 (approx.)
- **Completed:** 2026-07-10T13:40:34+01:00
- **Tasks:** 3
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- `AppShell` renders the Gemba desktop layout paradigm: `w-60` `bg-card` sidebar with brand lockup, nav (active state via `usePathname`), and `ThemeToggle` in the footer; a slim top bar; scrolling `bg-[var(--surface-page)]` content region offset by `md:pl-60`.
- `MobileTabBar` replaces the old `Sheet`-based hamburger drawer with a fixed bottom nav (Home/Upload/Download), each tab carrying an `aria-label` and active-state highlighting via `usePathname`.
- `layout.tsx` now mounts `AppShell` instead of `Header`; `ThemeProvider`, `Toaster`, metadata/viewport, and the service-worker `<Script>` block are untouched.
- Every shell icon renders through the `@/components/icon` wrapper — zero `lucide-react` in either new file.
- The dual-`<Image>` logo swap (`/logo.svg` `dark:hidden` / `/logo-dark.svg` `dark:block`) is preserved verbatim from `header.tsx`, satisfying DARK-03.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the desktop app shell** - `0492beb` (feat)
2. **Task 2: Build the mobile bottom tab bar** - `0bde5e1` (feat, committed first since app-shell.tsx imports it)
3. **Task 3: Wire layout.tsx to the shell** - `4d217af` (feat)

**Plan metadata:** (pending — final docs commit follows this SUMMARY)

## Files Created/Modified
- `src/components/app-shell.tsx` - `AppShell` client component: fixed sidebar, brand lockup, active nav, top bar, content region, mounts `MobileTabBar`
- `src/components/mobile-tab-bar.tsx` - `MobileTabBar` client component: fixed bottom 3-tab nav, Icon + label, active state
- `src/app/layout.tsx` - `Header` import/usage replaced with `AppShell`; rest of the file unchanged

## Untitled UI Glyphs Used

| Nav item | Glyph name | Size |
|----------|-----------|------|
| Home | `Home01` | 20px |
| Upload | `Upload01` | 20px |
| Download | `Download01` | 20px |

Confirmed present in `src/components/icon-data.js` (grep-verified against the full 1,167-glyph set before use). Numbered-variant convention (`Home01` not `HomeLine`/`HomeSmile`) chosen to match the existing `Sun`/`Moon01` precedent in `theme-toggle.tsx`.

## Decisions Made
- **Top bar visibility:** kept the "slim top bar" visible at all breakpoints (per plan's literal instruction to "add a slim top bar"), but its only content — `ThemeToggle` — is wrapped in a `md:hidden` div so it only renders on mobile, since the desktop `ThemeToggle` already lives in the sidebar footer. This avoids a duplicate theme toggle on desktop while still giving mobile users theme control (sidebar with the toggle is hidden below `md`).
- **ThemeToggle not modified:** `theme-toggle.tsx` doesn't accept a `className` prop and was explicitly out of scope for this plan (no file overlap per plan's own note). Wrapped it in a plain `<div className="md:hidden">` instead of adding a prop to the component.
- **Commit order (Task 2 before Task 1):** `mobile-tab-bar.tsx` was implemented and committed before `app-shell.tsx` because `AppShell` imports `MobileTabBar`; commit order follows implementation dependency, not plan task numbering. Content and file ownership match the plan exactly.

## Deviations from Plan

None - plan executed exactly as written. All acceptance criteria met: `usePathname` active-nav detection in both components, `w-60` sidebar, verbatim `dark:hidden`/`dark:block` logo swap, zero `lucide-react`, every icon via `@/components/icon`, `aria-label` on every icon-only/tab control, `Header` import fully removed from `layout.tsx`.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - no stubs introduced; all data (nav links, active state) is derived from `usePathname()` at render time, no hardcoded empty/placeholder values.

## Threat Flags
None - no new trust-boundary surface introduced. Per the plan's threat model, the logo swap uses the pre-existing verified mechanism (static in-repo assets, `next-themes` `.dark` class), and no network/data-handling/user-input surface was added.

## Next Phase Readiness
- `AppShell` is ready for 01-06 (home page) to render inside as `{children}`.
- `header.tsx` is now dead code (zero remaining imports across `src/`) — left in place per plan instructions; flag for deletion in a later cleanup plan.
- Deferred to 01-07 (human verification): visual check that sidebar/top bar/tab bar render correctly across breakpoints and the logo swaps correctly in light/dark.

---
*Phase: 01-design-foundation-home-page*
*Completed: 2026-07-10*

## Self-Check: PASSED

All created files and commit hashes verified present on disk / in git log.
