# Phase 1: Design Foundation & Home Page - Context

**Gathered:** 2026-07-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the Gemba design system into the Next.js app as the single source of visual
truth, build the shared component layer (button ranks, form controls, chip, icon
wrapper, card recipe), author the dark-mode token layer, and redesign the **home
page** — themed in both light and dark.

Covers requirements: DESIGN-01, DESIGN-02, DESIGN-03, COMP-01, COMP-02, COMP-03,
COMP-04, COMP-05, PAGE-01, DARK-01, DARK-03.

**Not this phase:** upload page (Phase 2), download page + full-app light/dark/system
verification (Phase 3), security/reliability/testing hardening (Phase 4).

**Locked by PROJECT.md constraints (not re-litigated):**
- Reuse the existing shadcn/Radix component layer — no parallel UI kit.
- Only use tokens defined in `design-system/tokens/`; derive from the nearest token
  when a value isn't covered — never invent colours/type/spacing/radii/shadows.
- Encryption model untouched (this is a visual phase); platform parity across web,
  PWA, and Android TWA.
</domain>

<decisions>
## Implementation Decisions

### Token wiring
- **D-01:** Gemba semantic aliases are the **source of truth** for the app's visual
  vocabulary. Import the design-system tokens globally (per APPLY-GUIDE Step 1) and
  make `--surface-*`, `--text-*`, `--border-*`, `--button-*`, radii, shadows, and
  rings the real tokens the app resolves against.
- **D-02:** **Re-point Tailwind's theme** (`@theme inline` in `src/app/globals.css`)
  onto the Gemba tokens so existing Tailwind utilities (`text-primary`, `bg-card`,
  `rounded-lg`, etc.) keep working but resolve to Gemba values. Pages stay in the
  familiar Tailwind utility style (least page-markup churn). Gemba type helper
  classes (`.gemba-h1…h5`, `.gemba-body`) are available and used for headings/body
  where they give better fidelity than utilities.
- **Implication:** shadcn's current oklch grayscale layer in `globals.css` (`:root`
  + `.dark`) is replaced/re-pointed to Gemba values rather than kept alongside.

### Page layout paradigm
- **D-03:** _(REVISED post-Phase-1, per user feedback — was: 240px left sidebar app
  shell.)_ Desktop nav is a **sticky top nav bar** on `--surface-card` (brand lockup
  left, Home/Upload/Download links, theme toggle right), scrolling content on
  `--surface-page`, active-nav items gaining a `--surface-subdued` fill and bolding.
  **No left sidebar.** Replaces the current sticky top-header-only layout with a
  reskinned top bar (`src/components/app-shell.tsx`).
- **D-04:** On mobile, nav is a **fixed bottom tab bar** (Home / Upload / Download)
  for a native-app feel in the installable PWA/TWA — not a hamburger drawer
  (`src/components/mobile-tab-bar.tsx`). Desktop uses the top nav bar (D-03); mobile
  uses the bottom tab bar. _(Originally the desktop layout was a fixed sidebar;
  revised to top nav post-Phase-1.)_
- **D-05:** Home page is **streamlined toward an app landing**, not a marketing page:
  a prominent primary "send a file" action up top, a tighter feature/trust row, and
  the how-it-works / CTA repetition dropped or shortened. Re-skin to Gemba: flat
  surfaces, ink type scale, card recipe (inset-ring border + soft cool-grey shadow).
  **Remove** the current gradient hero text and radial-gradient background (Gemba
  guardrails: flat backgrounds, no gradients, no AI-slop gradient/left-border cards).

### Icon system
- **D-06:** Port the **full Untitled UI `Icon` wrapper** — `Icon.jsx` + the
  1,167-glyph `icon-data.js` (+ `Icon.d.ts`) from `design-system/components/icons/`
  into the app's component layer. UI icons render through this single wrapper
  (24px, ~1.5–2px stroke, `currentColor`); **no emoji as UI icons** (COMP-04).
- **D-07:** Replace `lucide-react` icons on redesigned surfaces (home page + shell).
  lucide will still appear on the not-yet-redesigned upload/download pages until
  Phases 2–3; full removal is a natural consequence there, not this phase.
- **Known cost (flagged, accepted):** the full `icon-data.js` is a large bundle
  (~1MB of glyph data). Acceptable for now; the planner may later tree-shake / lazy
  the glyph set without changing the wrapper API.

### Dark mode
- **D-08:** Author a **true near-black** dark surface layer (DARK-01) — neutral
  near-black page + a step-lighter card surface (OLED-friendly, high contrast),
  rather than a slate/ink-derived dark. Values derived to sit under `.dark`
  (next-themes class strategy already wired via `theme-provider.tsx`).
- **D-09:** **Author dark-mode variants of the accent + signal colours** (accent
  blue `#2066E6`, success/warning/critical and their 8% subdued tints) — slightly
  lighter/desaturated so links and status read clearly on near-black and meet WCAG
  contrast. Do not reuse the light hex values verbatim in dark.
- **D-10:** Logo / brand mark swaps to the correct asset per theme (DARK-03),
  verified on web, PWA, and Android TWA. (Header currently references `/logo.svg`
  + `/logo-dark.svg`; PROJECT.md notes `gemba-logo.svg` / `gemba-logo-dark.svg` in
  `public/` — planner/researcher should confirm the actual asset filenames.)

### Claude's Discretion
Defaults were accepted (not discussed) on these; the planner/researcher may choose
the design-system-faithful option:
- Button-rank mapping: Primary / Secondary / Tertiary / Ghost (default / small /
  square) → the app's shadcn `Button` variant + size API (per APPLY-GUIDE Step 3).
- Card recipe realization: inset box-shadow ring (`--ring-border`) + `--shadow-card`
  vs. CSS `border` — design system specifies **inset rings, not CSS borders**.
- Form controls (Input / Checkbox / Radio / Toggle): retrofit the existing shadcn
  primitives to Gemba tokens vs. lift structure from `design-system/components/forms/`.
- Brand lockup detail: how the "Gemba" wordmark composes with the "Filesend" label
  in the sidebar/top bar.
- Whether the ported `Icon` wrapper is converted to `.tsx` or kept as `.jsx` + the
  provided `.d.ts` (app is strict TS).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design system (single source of visual truth)
- `design-system/APPLY-GUIDE.md` — agent-facing application instructions: token
  wiring (Step 1), token usage table + card recipe (Step 2), components (Step 3),
  app shell + voice (Step 4), and the guardrails (no new colours, inset-ring borders,
  soft cool-grey shadows, Public Sans, Untitled UI icons, yellow = mark-only).
- `design-system/DESIGN-SYSTEM.md` — full spec: voice, visual foundations (palette,
  type scale, radii, cards, borders-as-rings, shadows, layout), iconography.
- `design-system/styles.css` — global entry; imports fonts → colors → typography →
  spacing → base in order.
- `design-system/tokens/` — `fonts.css`, `colors.css` (palette + semantic aliases),
  `typography.css` (`.gemba-h1…h5` helpers), `spacing.css` (radii/shadows/rings),
  `base.css`. **colors.css is light-only `:root` — dark values must be authored.**
- `design-system/components/core/`, `components/forms/`, `components/icons/` —
  reference JSX for button ranks, Chip, Input/Checkbox/Radio/Toggle, and the
  `Icon` wrapper + `icon-data.js` to lift into the app.
- `design-system/assets/` — Gemba wordmark (svg/png) + mark PNGs.

### App integration points
- `src/app/globals.css` — current shadcn oklch token layer (`:root` + `.dark`) and
  `@theme inline` map that must be re-pointed onto Gemba tokens.
- `src/app/layout.tsx` — root layout; where the global Gemba `styles.css` import and
  the app shell (sidebar + top bar / bottom tab bar) are wired.
- `src/app/page.tsx` — home page to redesign.
- `src/components/header.tsx`, `src/components/theme-provider.tsx`,
  `src/components/theme-toggle.tsx`, `src/components/ui/` — existing shadcn/Radix
  layer to retrofit; `theme-provider` already wires next-themes (class strategy).

### Planning docs
- `.planning/REQUIREMENTS.md` — Phase 1 requirements (DESIGN-*, COMP-*, PAGE-01,
  DARK-01, DARK-03) and acceptance criteria.
- `.planning/ROADMAP.md` §"Phase 1" — goal + success criteria.
- `.planning/codebase/CONVENTIONS.md`, `STRUCTURE.md`, `STACK.md` — app conventions,
  file locations, and stack for the redesign.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/*` (shadcn/Radix: button, card, input, badge, sheet, …):
  retrofit to Gemba tokens rather than replacing — satisfies the "reuse shadcn"
  constraint. `Button` already has a `cva` variant/size API to map button ranks onto.
- `src/components/theme-provider.tsx` + `theme-toggle.tsx`: next-themes already wired
  with a `.dark` class strategy — the authored dark token layer plugs straight in.
- `src/components/ui/sheet.tsx` (Radix Sheet): available if a slide-in is ever needed,
  though mobile nav is now a bottom tab bar (D-04).
- `design-system/` reference JSX/tokens: lift structure + token usage into the app.

### Established Patterns
- Styling is **Tailwind-utility-first** with shadcn semantic vars mapped through
  `@theme inline` in `globals.css`. D-02 keeps this pattern but re-points it at Gemba.
- Dark mode via `next-themes` `.dark` class (light/dark/system).
- Path alias `@/*` → `src/*`; components PascalCase; no default exports in lib.
- Icons currently `lucide-react` (stroke, currentColor) — to be replaced by the
  Untitled UI `Icon` wrapper on redesigned surfaces.

### Integration Points
- Global CSS + font wiring: `src/app/layout.tsx` (single `styles.css` import) and
  `src/app/globals.css` (`@theme inline` re-point).
- App shell (sidebar + top bar, bottom tab bar on mobile): new component(s) rendered
  in `src/app/layout.tsx`, replacing the top-only `header.tsx`.
- Home surface: `src/app/page.tsx`.
</code_context>

<specifics>
## Specific Ideas

- **App-shell nav chrome over marketing layout** — deliberately chose app-style nav
  chrome despite the product being an anonymous public utility; responsive behavior is
  the thing to get right (bottom tab bar on mobile for a native TWA feel). _(Post-Phase-1
  revision: desktop nav moved from a 240px left sidebar to a sticky top nav bar per user
  feedback — see D-03/D-04.)_
- **Home = app landing, not a marketing page** — lead with the primary "send a file"
  action; drop the gradient hero and the how-it-works/CTA repetition.
- **True near-black dark mode** — explicitly preferred OLED-friendly near-black over a
  brand-ink slate, with accent/signal colours lightened for legibility.
- **Full Untitled UI icon wrapper** — preferred maximum fidelity/flexibility over the
  lighter "keep lucide" path, accepting the bundle cost.
</specifics>

<deferred>
## Deferred Ideas

- **Icon bundle optimization** (tree-shake / lazy-load the 1,167-glyph `icon-data.js`)
  — accepted as a later optimization; not required to ship Phase 1.
- **Full lucide removal** across upload/download — happens naturally in Phases 2–3 as
  those pages are redesigned.
- Everything already in PROJECT.md "Out of Scope" / REQUIREMENTS v2 (accounts,
  AES-256/PBKDF2 migration, admin dashboard, marketing-website redesign, streaming
  encryption) stays out.

None raised during discussion that need a new phase — discussion stayed within scope.
</deferred>

---

*Phase: 1-design-foundation-home-page*
*Context gathered: 2026-07-10*
