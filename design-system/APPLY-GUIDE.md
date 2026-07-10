# Applying the Gemba Design System to the app

> **For the coding agent (Claude Code):** this folder is the single source of truth
> for the app's visual style. Apply it to the Next.js app. Do not invent colours, type,
> spacing, radii, or shadows that aren't defined here. When a value isn't covered,
> derive it from the nearest token rather than guessing.

## What's in this folder

```
design-system/
├── APPLY-GUIDE.md        ← you are here (agent instructions)
├── DESIGN-SYSTEM.md      ← full written spec: voice, foundations, iconography
├── styles.css            ← global entry (imports every token file)
├── tokens/
│   ├── fonts.css         ← @import Public Sans + Inter (Google Fonts)
│   ├── colors.css        ← palette + semantic aliases (--text-*, --surface-*, …)
│   ├── typography.css    ← type scale + .gemba-h1…h5 / .gemba-body helper classes
│   ├── spacing.css       ← radii, spacing scale, shadows, ring-border / ring-focus
│   └── base.css          ← minimal reset
├── components/
│   ├── core/             ← Button ranks, Chip, StoreDownloadButton (JSX + .d.ts)
│   ├── forms/            ← Input, Checkbox, Radio, Toggle (JSX + .d.ts)
│   └── icons/            ← Icon.jsx wrapper + icon-data.js (1,167 Untitled UI glyphs)
└── assets/               ← Gemba wordmark (svg/png) + mark PNGs
```

## Step 1 — Wire the tokens globally

The app is Next.js. Copy `tokens/` and `styles.css` somewhere importable (e.g.
`src/styles/gemba/`) and import the global entry **once** at the app root
(`app/layout.tsx` or `pages/_app.tsx`):

```ts
import "@/styles/gemba/styles.css";
```

`styles.css` pulls in fonts → colors → typography → spacing → base in the right
order. After this, every CSS variable below is available app-wide.

## Step 2 — Use the tokens, never raw values

**Colour** — reach for the semantic aliases first; fall back to base ramp tokens.

| Purpose | Token |
|---|---|
| Body / heading text | `var(--text-primary)` = `#283349` |
| Muted text | `var(--text-subdued)` `#697080`, `--text-subtle` `#9499A4` |
| Page background | `var(--surface-page)` `#F9FAFB` |
| Card surface | `var(--surface-card)` `#FFFFFF` |
| Subtle fill / inner card | `var(--surface-subdued)` `#F3F5F6` |
| Hairline border | `var(--border-default)` `#E8EAED` |
| Links / informational | `var(--link-color)` / `--gemba-accent` `#2066E6` |
| Success / warning / critical | `--gemba-success` `#20982E` · `--gemba-warning` `#CD8C00` · `--gemba-critical` `#E95E5E` |
| Primary button | bg `var(--button-primary-bg)` `#283349`, fg white |

Gemba Yellow `#FFDA44` is **brand-mark only** — never a UI fill or accent.

**Type** — Public Sans everywhere. Bold (700) for headings/emphasis, Regular (400)
for body. Scale: H1 40/48 · H2 28/36 · H3 24/32 · H4 20/28 · H5 16/24 · body 14/20 ·
small 12/16 · chip 10/16. Use the `.gemba-h1…h5` / `.gemba-body` helper classes or
the matching `--text-*-size` / `--text-*-lh` tokens.

**Radii** — `--radius-xs 4` (fields) · `sm 8` (inputs, square buttons) · `md 12`
(inner cards) · `lg 16` (cards, chips) · `xl 24` (pill buttons, hero) · `pill 999`.

**Borders & focus** — Gemba draws borders as **inset box-shadow rings**, not CSS
`border`. Use `box-shadow: var(--ring-border)` for the 1px hairline and
`var(--ring-focus)` for the 2px ink focus ring.

**Shadows** — always soft, cool blue-grey, never black:
`--shadow-card` / `--shadow-field` `0 4px 16px rgba(95,105,133,.06)`,
`--shadow-popover` `0 12px 32px rgba(40,51,73,.16)`.

**Card recipe:** white surface, 16px radius, `box-shadow: var(--ring-border), var(--shadow-card)`. Inner sub-cards use `--surface-subdued` at `--radius-md`.

## Step 3 — Components

The `components/` JSX (Button ranks, Chip, Input, Checkbox, Radio, Toggle, Icon) is
the reference implementation — lift its structure and token usage into the app's own
component layer (matching the app's existing component conventions/TypeScript). Key rules:

- **Buttons:** 40px tall default (`--radius-xl` pill), 32px small; square variants
  at `--radius-sm`. Primary = solid ink pill / white label. Secondary & Tertiary =
  grey fills. Ghost = transparent. Verb-first labels ("Send money", "See all").
- **Chips / status:** ALL-CAPS 10px label, coloured text on the 8%-subdued tint of
  the same signal colour (`--gemba-success-subdued`, etc).
- **Icons:** use the `Icon` wrapper + `icon-data.js` (Untitled UI line icons, 24px,
  ~1.5–2px stroke, `currentColor`). Recolour via `color`. **No emoji as UI icons.**

## Step 4 — Layout & voice

- **App shell:** fixed **240px white sidebar** + top bar + scrolling content on
  `--surface-page`. Active nav item gains a `--surface-subdued` fill and bolds.
- **Copy:** confident, plain, benefit-first. Address the user as *you / your*.
  Sentence case for headings/body; Title Case product names; ALL-CAPS micro-labels.
  Calm punctuation. No emoji in UI copy.

## Guardrails

- ✅ Only use tokens from `tokens/`. ✅ Borders as inset rings. ✅ Soft cool-grey
  shadows. ✅ Public Sans. ✅ Untitled UI stroke icons.
- ❌ No new colours. ❌ No black/harsh shadows. ❌ No gradient/rounded-corner +
  left-border-accent "AI-slop" cards. ❌ Yellow anywhere but the logo. ❌ No emoji icons.

## Font note

`PT Root UI VF` (chip labels) and `DT Flow` aren't on Google Fonts — tokens fall
back to Public Sans. Upload those font files only if exact chip fidelity is needed.
Gemba wordmark assets live in `assets/`; the app already ships logos in `public/`
(`gemba-logo.svg`, `gemba-logo-dark.svg`).
