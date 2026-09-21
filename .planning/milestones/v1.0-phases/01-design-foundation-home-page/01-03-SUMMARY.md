---
phase: 01-design-foundation-home-page
plan: 3
subsystem: ui
tags: [components, button, card, chip, cva, design-tokens]

# Dependency graph
requires:
  - "Gemba token wiring in globals.css (01-01) — bg-primary/text-primary/rounded-lg/--ring-border/--shadow-card/--button-*-bg all resolve through Gemba semantic aliases"
provides:
  - "Button: four Gemba ranks (default=Primary/secondary/tertiary/ghost) at default(40px)/sm(32px)/icon(40px sq)/icon-sm(32px sq) sizes, all token-backed"
  - "Card: inset-ring + soft-shadow recipe (COMP-05), no CSS border, 16px radius"
  - "Chip: new cva component (COMP-03) with 5 signal variants (neutral/accent/success/warning/critical) + optional icon prefix slot"
affects: [01-05, 01-06, 01-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Button variant map extended with a new 'tertiary' cva key (--button-subdued-bg) alongside default/secondary/ghost — all four Gemba ranks now live on the existing shadcn Button API, no new component"
    - "Button shape (pill vs square) now lives on the *size* key, not the variant key — rounded-[var(--radius-xl)] on default/sm, rounded-[var(--radius-sm)] on icon/icon-sm, so it composes with any variant"
    - "Card border replaced with a two-layer arbitrary box-shadow: shadow-[var(--ring-border),var(--shadow-card)] — stacks the inset hairline ring and the soft elevation shadow in one utility, avoiding a real CSS border"
    - "Chip follows the badge.tsx cva + Slot/asChild convention but swaps Badge's pill-outline styling for the Gemba Chip recipe (.gemba-chip-label + uppercase + 8%-tint signal backgrounds)"

key-files:
  created:
    - src/components/chip.tsx
  modified:
    - src/components/ui/button.tsx
    - src/components/ui/card.tsx

key-decisions:
  - "Button focus ring swapped from shadcn's ring-based focus-visible:border-ring/ring-ring/50/ring-[3px] to a single focus-visible:shadow-[var(--ring-focus)] (inset ink ring), per plan's 'ink focus ring intent' instruction — destructive/outline/link variants' own focus-visible ring classes were left untouched since they're out of scope this phase"
  - "Dropped has-[>svg]:px-* padding compensation on the retrofitted default/sm sizes (present in the pre-existing default/sm classes) in favour of the UI-SPEC's literal fixed padding (px-6/px-4) — simpler, matches the spec table exactly, and only affects the two sizes this task touches; xs/lg/icon-xs/icon-lg keep their pre-existing has-[>svg] behavior unchanged"
  - "lg/xs/icon-xs/icon-lg sizes (not in the plan's Sizes table) kept alive verbatim except each now carries its own explicit rounded-md, since rounded-md was removed from the shared base class (radius is now a per-size concern) — preserves their prior visual shape with no behavior change"
  - "Chip's icon slot renders a caller-supplied ReactNode in a plain 16px (size-4) flex box, not a hardcoded glyph — matches the plan's explicit 'call sites pass <Icon name=... size={16} /> ... do NOT hardcode a glyph' instruction"

patterns-established:
  - "COMP-01 Button ranks: variant=default|secondary|tertiary|ghost (kept destructive/outline/link for later phases), size=default|sm|icon|icon-sm for the Gemba shape/size grid; buttonVariants still exported"
  - "COMP-03 Chip: variant=neutral|accent|success|warning|critical (default neutral), optional icon prop, Chip + chipVariants exported — home page call sites should use variant=\"neutral\" / variant=\"accent\" per UI-SPEC"

requirements-completed: [COMP-01, COMP-03, COMP-05]

# Metrics
duration: ~20min
completed: 2026-07-10
---

# Phase 01 Plan 3: Button/Card Retrofit + New Chip Component Summary

**Retrofitted the existing shadcn `Button` to the four Gemba ranks (Primary/Secondary/Tertiary/Ghost) and the `Card` to the inset-ring recipe, and authored a new `cva`-based `Chip` component with five signal variants — all painted exclusively from Gemba CSS variables, zero hardcoded hex.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-07-10
- **Tasks:** 3/3 completed
- **Files modified:** 3 (2 modified, 1 created)

## Accomplishments

- `Button` (`src/components/ui/button.tsx`) now exposes all four Gemba ranks via its existing `variant` cva key — `default` (Primary ink pill, unchanged mapping, now resolves through `--button-primary-bg`), `secondary` (unchanged mapping, `--button-emphasized-bg`), a new `tertiary` key (`--button-subdued-bg`), and `ghost` (explicit `text-primary` + `hover:bg-[var(--surface-subdued)]`). `destructive`/`outline`/`link` kept intact for later phases.
- Button shape now lives on the `size` key: `default`/`sm` are pills at `rounded-[var(--radius-xl)]` (24px); `icon`/`icon-sm` are squares at `rounded-[var(--radius-sm)]` (8px). `default` = 40px tall (`h-10`, `px-6`, `gap-2`, 20px/`size-5` icons); `sm` = 32px tall (`h-8`, `px-4`, `gap-2`); `icon`/`icon-sm` = 40px/32px squares. `data-slot`/`data-variant`/`data-size`, `asChild`/`Slot`, and `buttonVariants` export all preserved.
- Focus-visible state swapped from shadcn's ring-based classes to `focus-visible:shadow-[var(--ring-focus)]` (inset 2px ink ring), matching the Gemba "ink focus, not blue" guardrail.
- `Card` (`src/components/ui/card.tsx`) base class no longer has a `border` utility — replaced with `shadow-[var(--ring-border),var(--shadow-card)]` (inset hairline ring + soft cool-grey elevation stacked in one arbitrary box-shadow), and `rounded-xl` → `rounded-lg` (16px = `--radius-lg`). `bg-card` and all Card sub-components (`CardHeader`/`CardContent`/etc.) untouched.
- New `src/components/chip.tsx`: `cva`-based `Chip` + `chipVariants` following the `badge.tsx` `Comp`/`asChild`/`data-slot` convention. Base layout matches the reference `Chip.jsx` exactly — 20px tall (`h-5`), 16px radius (`rounded-[var(--radius-lg)]`), `px-2.5 py-[3px]` padding, `gap-[var(--space-2)]` (4px) icon↔label gap, `.gemba-chip-label` typography (10px/16px/700) + explicit `uppercase`. Five variants (`neutral`/`accent`/`success`/`warning`/`critical`, default `neutral`) map 8%-tint `--gemba-{signal}-subdued` backgrounds to full-strength `--gemba-{signal}` text. Optional `icon?: React.ReactNode` prop renders in a 16px (`size-4`) prefix slot — no glyph hardcoded, call sites pass `<Icon name="..." size={16} />`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Retrofit Button to Gemba ranks + sizes (COMP-01)** - `cecb2d3` (feat)
2. **Task 2: Retrofit Card to the inset-ring recipe (COMP-05)** - `ba1f922` (feat)
3. **Task 3: Create Chip component (COMP-03)** - `224ec07` (feat)

**Plan metadata:** committed separately after this summary (see final commit below)

_Note: no TDD tasks in this plan (`tdd` not set / defaults false); single `feat` commit per task._

## Files Created/Modified

- `src/components/ui/button.tsx` - `variant` map extended with `tertiary`; `default`/`secondary`/`ghost` re-pointed to explicit Gemba tokens; `size` map carries pill/square radius + 40px/32px height/icon-size pairs; focus ring swapped to `--ring-focus`
- `src/components/ui/card.tsx` - base class: `border` removed, `shadow-sm` → `shadow-[var(--ring-border),var(--shadow-card)]`, `rounded-xl` → `rounded-lg`
- `src/components/chip.tsx` (new) - `Chip` + `chipVariants`, 5 signal variants, optional icon prefix slot, `.gemba-chip-label` typography

## Decisions Made

- **Focus ring token swap (Rule 2 - adjacent correctness):** Replaced the shadcn `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]` triad with a single `focus-visible:shadow-[var(--ring-focus)]` on the shared base class, per the plan's explicit "use `--ring-focus` where the current ring-based focus is applied" instruction. This is the one base-class change that affects every variant including `destructive`/`outline`/`link`, which is intended — the ink focus ring is a global a11y/brand requirement, not rank-specific.
- **Dropped `has-[>svg]:px-*` on `default`/`sm`:** the pre-existing sizes compensated icon-button padding automatically; the plan's literal spec gives fixed padding values (`px-6`/`px-4`) with no `has-[>svg]` mention, so it was omitted for the two retrofitted sizes to match the spec exactly and avoid inventing unspecified behavior. `xs`/`lg`/`icon-xs`/`icon-lg` (untouched, out-of-plan sizes) keep their original `has-[>svg]` behavior.
- **`rounded-md` re-added per-size on untouched sizes:** removing `rounded-md` from the shared base class (now that radius is size-driven for `default`/`sm`/`icon`/`icon-sm`) would have silently un-rounded `lg`/`xs`/`icon-xs`/`icon-lg`, so each of those four now carries its own explicit `rounded-md` to preserve prior visual behavior with zero functional change.

## Deviations from Plan

None — plan executed exactly as written. No auto-fixes were needed; all tokens referenced by the plan (`--button-subdued-bg`, `--ring-border`, `--shadow-card`, `--radius-xl`, `--radius-sm`, `--radius-lg`, `--gemba-{signal}[-subdued]`, `--space-2`, `.gemba-chip-label`) already existed from 01-01's token wiring and were confirmed present in both `src/app/globals.css` and `design-system/tokens/*.css` before implementation.

## Known Stubs

None. All three components are fully wired to real Gemba tokens; no placeholder values, hardcoded hex, or unwired data sources.

## Threat Flags

None. Per the plan's own threat model, `Chip`'s `icon` prop renders as a normal React child (never `dangerouslySetInnerHTML`), and no new network/auth/data-access surface was introduced — pure presentational `cva` variant work.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Downstream call sites (`01-05` app shell, `01-06` home page) can now use:
  - `<Button variant="default|secondary|tertiary|ghost" size="default|sm|icon|icon-sm">` for all Gemba button ranks
  - `<Card>` (and existing sub-components) for the inset-ring card recipe with no further styling needed
  - `<Chip variant="neutral|accent|success|warning|critical" icon={<Icon name="..." size={16} />}>LABEL</Chip>` for status/signal badges — home page needs only `neutral`/`accent` per UI-SPEC (e.g. "OPEN SOURCE" / "END-TO-END ENCRYPTED"), replacing the current gradient `Badge` usage
- `Badge` (`src/components/ui/badge.tsx`) is still present and unmodified — per `01-PATTERNS.md`, its gradient/pill usage on the home page is superseded by `Chip` in a later plan; `Badge` itself was not touched or deprecated by this plan.

---
*Phase: 01-design-foundation-home-page*
*Completed: 2026-07-10*

## Self-Check: PASSED

- FOUND: src/components/ui/button.tsx
- FOUND: src/components/ui/card.tsx
- FOUND: src/components/chip.tsx
- FOUND: .planning/phases/01-design-foundation-home-page/01-03-SUMMARY.md
- FOUND: cecb2d3 (Task 1 commit)
- FOUND: ba1f922 (Task 2 commit)
- FOUND: 224ec07 (Task 3 commit)
