# Phase 1: Design Foundation & Home Page - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-10
**Phase:** 1-design-foundation-home-page
**Areas discussed:** Token wiring strategy, Page layout paradigm, Icon system, Dark-mode palette

---

## Token wiring strategy

### Q1 — How should Gemba tokens connect to the app's existing shadcn CSS variables?

| Option | Description | Selected |
|--------|-------------|----------|
| Remap shadcn vars → Gemba | Redefine shadcn's semantic vars to Gemba values; existing components inherit for free; fastest but ring/hex model mismatches need per-component tweaks | |
| Gemba aliases as source of truth | Make `--surface-page/--text-primary/etc.` the app vocabulary, bridge shadcn to them; cleaner fidelity, more upfront wiring | ✓ |
| You decide | Claude picks | |

**User's choice:** Gemba aliases as source of truth

### Q2 — How should styling be expressed going forward?

| Option | Description | Selected |
|--------|-------------|----------|
| Re-point Tailwind theme | Map `@theme inline` onto Gemba tokens so utilities resolve to Gemba; least page-markup churn | ✓ |
| Semantic tokens + helpers | Write surfaces with Gemba helper classes + `var(--…)` directly; highest fidelity, larger rewrite | |
| Hybrid | Re-point Tailwind AND use type helpers | |

**User's choice:** Re-point Tailwind theme (type helpers available for headings/body)
**Notes:** Combined result — Gemba aliases are the truth, Tailwind utilities resolve to them.

---

## Page layout paradigm

### Q1 — Which shell should the redesign adopt?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep top-header site | Retain sticky top Header over centered content; fits anonymous utility, least churn | |
| Adopt sidebar app shell | Gemba's 240px white sidebar + top bar with active-nav fills; highest fidelity, heavy | ✓ |
| You decide | Claude picks | |

**User's choice:** Adopt sidebar app shell
**Notes:** Claude flagged the tension (sidebar reads as an authenticated dashboard for an anonymous 3-page utility); user confirmed the choice.

### Q2 — How should the sidebar behave on mobile?

| Option | Description | Selected |
|--------|-------------|----------|
| Collapse to drawer | Fixed on desktop; hamburger slide-in (Radix Sheet) on mobile | |
| Bottom tab bar on mobile | Desktop sidebar; mobile fixed bottom tab bar (native TWA feel); second nav component | ✓ |
| You decide | Claude picks | |

**User's choice:** Bottom tab bar on mobile

### Q3 — How should the home page be redesigned?

| Option | Description | Selected |
|--------|-------------|----------|
| Restyle, keep structure | Same sections/copy re-skinned to Gemba; lowest risk | |
| Streamline to app landing | Prominent 'send a file' action, tighter feature row, drop how-it-works/CTA repetition | ✓ |
| You decide | Claude picks | |

**User's choice:** Streamline to app landing
**Notes:** Remove current gradient hero text + radial-gradient background per Gemba flat-surface guardrails.

---

## Icon system

### Q1 — What's the icon strategy?

| Option | Description | Selected |
|--------|-------------|----------|
| Port Icon wrapper, tree-shakeable | Untitled UI wrapper, per-icon imports only; meets COMP-04, avoids ~1MB blob | |
| Keep lucide-react | Standardize lucide behind a thin wrapper; light but diverges from COMP-04 letter | |
| Full Untitled UI wrapper | Port complete `Icon.jsx` + `icon-data.js` (all 1,167 glyphs); max fidelity, large bundle | ✓ |

**User's choice:** Full Untitled UI wrapper
**Notes:** Bundle cost accepted; optimization deferred. lucide lingers on upload/download until Phases 2–3.

---

## Dark-mode palette

### Q1 — What should the dark surfaces be?

| Option | Description | Selected |
|--------|-------------|----------|
| Dark slate/ink | Derived from Gemba ink family (#283349); on-brand, premium | |
| True near-black | Neutral near-black (page ~#0B0E14, cards ~#161A22); OLED-friendly, high contrast | ✓ |
| You decide | Claude picks | |

**User's choice:** True near-black

### Q2 — How should accent + signal colors behave in dark?

| Option | Description | Selected |
|--------|-------------|----------|
| Lighten for dark | Author lighter/desaturated accent + signal variants; best legibility/WCAG | ✓ |
| Reuse light values | Same hex in dark; simplest but risks poor contrast on near-black | |
| You decide | Claude picks | |

**User's choice:** Lighten for dark

---

## Claude's Discretion

Defaults accepted (not explicitly discussed) — planner/researcher chooses the design-system-faithful option:
- Button-rank → shadcn `Button` variant/size mapping
- Card recipe: inset box-shadow ring vs CSS border (design system mandates inset rings)
- Form controls: retrofit shadcn primitives vs lift from `design-system/components/forms/`
- Brand lockup: "Gemba" wordmark + "Filesend" composition in the shell
- Icon wrapper: convert to `.tsx` vs keep `.jsx` + provided `.d.ts`

## Deferred Ideas

- Icon bundle optimization (tree-shake / lazy-load `icon-data.js`) — later
- Full lucide removal — happens naturally in Phases 2–3
- No new capabilities raised; discussion stayed within phase scope
