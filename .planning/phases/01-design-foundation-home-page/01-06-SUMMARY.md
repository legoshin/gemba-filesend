---
phase: 01-design-foundation-home-page
plan: 06
subsystem: ui
tags: [nextjs, react, tailwind, home-page, icons, card, chip]

# Dependency graph
requires:
  - phase: 01-design-foundation-home-page
    provides: "Icon wrapper (01-02), Button/Card/Chip retrofit (01-03), AppShell content region (01-05)"
provides:
  - "Redesigned src/app/page.tsx: flat Gemba app-landing home page (hero + CTA focal point + tight feature row)"
affects: [01-07-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Home page composed entirely from shared component layer (Button/Card/Chip/Icon) — zero raw JSX styling divergence from the design system"

key-files:
  created: []
  modified:
    - src/app/page.tsx

key-decisions:
  - "Tightened the feature row to 3 cards (End-to-end encryption, Auto-expiring links, Password protection) instead of the original 5-card grid, per D-05's 'tighter feature/trust row' instruction — dropped 'Fast Transfers' and 'Large File Support' as marketing filler not core to the value prop"
  - "Glyph names: Upload01 (primary CTA, matches 01-05's nav Upload01 convention), Download01 (secondary CTA, matches nav), Lock01/Clock/Shield01 (feature icons) — all confirmed present in icon-data.js via grep before use"
  - "Used Tailwind's text-muted-foreground utility (already re-pointed to --text-subdued via globals.css @theme inline in 01-01) for subdued body copy, matching the existing codebase convention rather than an inline var()"

patterns-established:
  - "Home page container: mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20, matching AppShell's unpadded <main> (padding lives in the page, not the shell)"

requirements-completed: [PAGE-01]

# Metrics
duration: ~15min
completed: 2026-07-10
---

# Phase 01 Plan 6: Home Page Redesign Summary

**Rebuilt `src/app/page.tsx` as a flat Gemba app landing — "Send a file" ink Primary CTA as the dominant focal point beneath a flat `.gemba-h1` headline, Chip trust badges, and a tightened 3-card feature row using the Card recipe + Icon wrapper, with the gradient hero and how-it-works/CTA-repeat sections dropped entirely.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-07-10
- **Tasks:** 2/2 completed
- **Files modified:** 1

## Accomplishments

- Hero rebuilt flat: `.gemba-h1` headline ("Share files securely, simply"), `.gemba-body` subcopy, no gradient background div, no gradient text span.
- Primary CTA "Send a file" (`Button` default/Primary rank, ink pill, `<Icon name="Upload01">`) links to `/upload`; Secondary CTA "Receive a file" (`Button variant="secondary"`, `<Icon name="Download01">`) links to `/download` — the two-button pair sits directly beneath the headline as the visual focal point.
- Trust badges replaced: `<Chip variant="neutral">OPEN SOURCE</Chip>` and `<Chip variant="accent">END-TO-END ENCRYPTED</Chip>`, ALL-CAPS, replacing the old gradient `Badge`.
- Feature row tightened to 3 `Card`-recipe cards (End-to-end encryption / Auto-expiring links / Password protection), each with a `--surface-subdued`/`--radius-md` icon tile (`Lock01`/`Clock`/`Shield01` via `Icon`) and `.gemba-h4` title + subdued `.gemba-body` description.
- "How it works" section, the repeated bottom CTA section, the `steps` array, the `Badge` import, and all `lucide-react` imports removed entirely.

## Task Commits

Both plan tasks were implemented as a single atomic file rewrite and committed together (same file, same logical change — hero + feature row are inseparable in a from-scratch page rewrite):

1. **Task 1 + Task 2: Rebuild hero/CTA/chips and feature row, drop legacy sections** - `4a06d23` (feat)

**Plan metadata:** committed separately after this summary (see final commit below)

## Files Created/Modified

- `src/app/page.tsx` - Full rewrite: flat hero with focal "Send a file" CTA, Chip trust badges, 3-card Card-recipe feature row with Icon-wrapper glyphs; no gradients, no lucide, no emoji

## Decisions Made

- **3-card feature row (not 5):** D-05 calls for a "tighter feature/trust row" and explicitly permits dropping the full 5-card grid. Kept the three most core-to-value-prop cards (encryption, auto-expiry, password protection) and dropped "Fast Transfers"/"Large File Support" as secondary marketing copy, consistent with the app-landing goal (focal CTA over feature enumeration).
- **Icon glyph choices:** `Upload01`/`Download01` reused from 01-05's nav icon convention (visual consistency between shell nav and CTA icons); `Lock01`, `Clock`, `Shield01` picked for the 3 retained feature cards (confirmed present in `icon-data.js` via grep before use — no invented glyph names).

## Deviations from Plan

None - plan executed exactly as written. Both tasks' acceptance criteria were satisfied in a single file rewrite since the plan's own two-task split (hero/CTA vs. feature row) operates on the same file with no intermediate state that needed separate verification.

## Known Stubs

None. All content (copy, links, icons) is real and wired — no placeholder data, no TODO markers, no unwired props.

## Threat Flags

None. Per the plan's own threat model, the home page remains a static presentational page with only internal `<Link>`s to `/upload` and `/download` — no new trust boundary, form, data fetch, or network surface introduced.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Home page (PAGE-01) is fully redesigned to the Gemba design system and ready for the 01-07 human-verification checkpoint (visual focal-point hierarchy check, light/dark correctness).
- `npm run build`, `npx tsc --noEmit`, and `npm run lint` all pass clean with zero new warnings/errors introduced by this plan's file.

---
*Phase: 01-design-foundation-home-page*
*Completed: 2026-07-10*

## Self-Check: PASSED

- FOUND: src/app/page.tsx
- FOUND: 4a06d23 (Task commit)
- FOUND: .planning/phases/01-design-foundation-home-page/01-06-SUMMARY.md
