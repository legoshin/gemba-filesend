---
phase: 01-design-foundation-home-page
plan: 2
subsystem: ui
tags: [icons, untitled-ui, react, strict-ts, theme-toggle, dark-mode]

# Dependency graph
requires: []
provides:
  - "src/components/icon.tsx — strict-TS Icon wrapper (named + default export), renders any Untitled UI glyph by name at a given size in currentColor"
  - "src/components/icon-data.js — 1,167-glyph Untitled UI icon data map (verbatim port)"
  - "src/components/Icon.d.ts — glyph-name / prop type declarations (verbatim port, unwired reference artifact)"
  - "theme-toggle.tsx reskinned onto the Icon wrapper — first proof-of-consumer, zero lucide-react imports"
  - "Confirmed glyph names for downstream reuse: Sun (exact match), Moon01 (nearest Untitled UI equivalent — no plain 'Moon' key exists)"
affects: [01-03, 01-04, 01-05, 01-06, 01-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Icon wrapper: <Icon name=\"PascalCaseGlyphName\" size={20|24} className=\"...\" /> — every redesigned-surface icon renders through this single component, no per-glyph imports"
    - "icon-data.js is untyped JS with no matching .d.ts; TS infers a narrow literal-key object type from the module, so icon.tsx widens it via an explicit `const icons: Record<string, {viewBox, body}> = iconData` before indexing by a `name: string` prop"

key-files:
  created:
    - src/components/icon.tsx
    - src/components/icon-data.js
    - src/components/Icon.d.ts
  modified:
    - src/components/theme-toggle.tsx

key-decisions:
  - "Sun/Moon glyph names: used exact key \"Sun\" and nearest equivalent \"Moon01\" (icon-data.js has no plain \"Moon\" key — options were Moon01/Moon02/MoonEclipse/MoonStar; Moon01 is the standard crescent moon, closest match for a dark-mode toggle). Downstream plans reusing sun/moon icons should use these exact names."
  - "Widened the imported icon-data.js type to Record<string, {viewBox: string; body: string}> in icon.tsx (not in the plan's literal text) because TS strict mode inferred a closed literal-key object type from the untyped JS module, which failed to index by a generic `name: string` prop under `npx tsc --noEmit`. Minimal, isolated fix — Rule 1 (blocking type error), no behavior change."

patterns-established:
  - "COMP-04 Icon wrapper: single src/components/icon.tsx consumed via `<Icon name=\"...\" size={n} />`; color always inherited from the wrapping element's text color via currentColor, never a stroke/fill prop on the call site"

requirements-completed: [COMP-04]

# Metrics
duration: ~15min
completed: 2026-07-10
---

# Phase 01 Plan 2: Icon Wrapper Port + Theme Toggle Reskin Summary

**Ported the 1,167-glyph Untitled UI Icon wrapper into strict TS and proved it by swapping the theme toggle's lucide-react Sun/Moon icons for `<Icon name="Sun" />` / `<Icon name="Moon01" />` with zero lucide dependency remaining in that file.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-07-10
- **Tasks:** 2/2 completed
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments
- `src/components/icon.tsx` renders any of the 1,167 Untitled UI glyphs by `name` at a configurable `size` (default 24px), painting via `currentColor`, with the missing-glyph guard (`return null`) preserved from the source `Icon.jsx`.
- `icon-data.js` and `Icon.d.ts` copied byte-for-byte from `design-system/components/icons/` into `src/components/`.
- `theme-toggle.tsx` is the first real consumer of the wrapper: sun/moon render through `<Icon>`, the existing rotate/scale dark-mode transition classes are preserved unchanged, and the icon-only `Button` now carries an explicit `aria-label="Toggle theme"` in addition to the pre-existing `sr-only` span (UI-SPEC accessibility MANDATORY rule).
- `npx tsc --noEmit` and `npm run build` both pass clean; `npm run lint` shows 0 new errors (only a pre-existing `import/no-anonymous-default-export` warning inherited verbatim from the untouched `design-system` source).

## Task Commits

Each task was committed atomically:

1. **Task 1: Port Icon.jsx to src/components/icon.tsx and copy the glyph data** - `c12f6a7` (feat)
2. **Task 2: Reskin theme-toggle.tsx onto the Icon wrapper (D-07 proof-of-consumer)** - `c337cab` (feat)

**Plan metadata:** committed separately below

_Note: no TDD tasks in this plan (tdd="false"); single feat commit per task._

## Files Created/Modified
- `src/components/icon.tsx` - Strict-TS Icon wrapper; `{ name: string; size?: number } & React.SVGProps<SVGSVGElement>` props, size defaults to 24, named + default export
- `src/components/icon-data.js` - Verbatim copy of the 1,167-glyph Untitled UI data map (~4.6 MB, not tree-shaken per plan's accepted cost)
- `src/components/Icon.d.ts` - Verbatim copy of the glyph-name union / prop type declarations (present as a documented reference artifact; not wired into icon.tsx's own type-checking chain, since icon.tsx defines its own inline prop types per the plan's literal spec)
- `src/components/theme-toggle.tsx` - Lucide `Sun`/`Moon` swapped for `<Icon name="Sun" size={20} />` / `<Icon name="Moon01" size={20} />`; added `aria-label="Toggle theme"` on the `Button`

## Decisions Made
- **Sun/Moon glyph names:** `"Sun"` matched exactly; no plain `"Moon"` key exists in `icon-data.js` (options: `Moon01`, `Moon02`, `MoonEclipse`, `MoonStar`) — chose `"Moon01"` as the standard crescent-moon glyph, the closest Untitled UI equivalent for a dark-mode toggle. **Downstream plans should reuse these exact names** (`Sun` / `Moon01`) for any other sun/moon iconography on redesigned surfaces.
- **Icon.d.ts left unwired:** the plan's acceptance criteria explicitly type `icon.tsx`'s own props as `{ name: string; size?: number } & React.SVGProps<SVGSVGElement>` rather than the `IconName` union from `Icon.d.ts`, so the copied `.d.ts` is a reference artifact (documents the full glyph-name list for humans / future strict-narrowing) rather than an active type dependency this phase.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Widened icon-data.js's inferred type so strict TS indexing type-checks**
- **Found during:** Task 1 verification (`npx tsc --noEmit`)
- **Issue:** `icon-data.js` has no matching `.d.ts`, so TypeScript infers a closed literal-key object type directly from the untyped JS module (e.g. `{ Activity: {...}; ActivityHeart: {...}; ... }`). Indexing that object with a generic `name: string` prop (as the plan's literal acceptance criteria require) failed under strict mode: `TS7053: Element implicitly has an 'any' type ... No index signature with a parameter of type 'string' was found`.
- **Fix:** Imported the module under an internal name (`iconData`) and declared `const icons: Record<string, { viewBox: string; body: string }> = iconData;` before use — a one-line type-widening assignment, no runtime behavior change, no change to the plan's public API (`Icon` still exported named + default, props unchanged).
- **Files modified:** `src/components/icon.tsx`
- **Verification:** `npx tsc --noEmit` exits 0; `npm run build` succeeds; missing-glyph guard (`<Icon name="unknown-glyph" />` → `null`) unaffected.
- **Committed in:** `c12f6a7` (part of Task 1 commit)

## Known Stubs

None.

## Threat Flags

None — this plan's only trust-boundary-relevant code (`dangerouslySetInnerHTML` in `icon.tsx`) was pre-declared and dispositioned `accept` in the plan's own threat model (T-01-02-01); no new surface introduced beyond what the plan specified.

## Self-Check: PASSED
