# Gemba Design System

Design system for **Gemba** — a UK-licensed neo-bank offering business banking, multi-currency accounts, cards, international payments, an embedded/Payments API, and a white-label banking platform. Reconstructed from the "Gemba.fig" Figma file (the sole source of truth) plus the uploaded Gemba logo.

Two products are represented:
- **Gemba App** — the corporate banking web app (dashboard, accounts, cards, payments, currency exchange, messages, tasks, accounting).
- **Gemba Website** — the business-banking marketing site.

## Sources
- **Figma:** `Gemba.fig` (mounted). Pages: Gemba-UI (app, 77 frames), Website (64), Design-System (13, the foundations page), Icons (~1,167-glyph library), L39, Drafts.
- **Uploads:** `uploads/Gemba logo full-black.{svg,png,pdf}`, `gemba512.png`, `gemba.png` — all the **black full wordmark** (mark + "GEMBA"). No isolated mark, no colour/reversed variant, no favicon-only asset was provided.
- No published brand guidelines were provided; all values below are read directly from the Figma file.

---

## CONTENT FUNDAMENTALS
How Gemba writes.

- **Voice:** confident, plain, benefit-first. Marketing leads with outcomes ("Streamlining business payments!", "Send and receive money internationally, issue payouts and cut transfer costs.").
- **Person:** addresses the customer as **you / your** ("Manage your finances…", "Keep your money in GBP, EUR…"). Company refers to itself as **we / our** ("We are excited to announce…").
- **Casing:** Sentence case for body and most headings. Product names are Title Case ("Gemba Business Account", "White-Label"). Status chips and micro-labels are ALL-CAPS (`RECEIVED`, `PENDING`, `ACTION REQUIRED`).
- **Punctuation:** occasional exclamation in hero headlines; otherwise calm. Em-dashes for asides. Amounts carry currency symbols (£, €, $) and use minus signs for debits (`−$4,200`).
- **App copy** is terse and functional: nav is single words ("Dashboard", "Cards"), buttons are verb-first ("Send money", "Open account", "Manage cards", "See all transactions").
- **Emoji:** not part of the brand voice. (Currency flag emoji appear only as lightweight stand-ins in the app kit — replace with real flag assets in production.)
- **Numbers/data:** real-feeling but restrained — IBANs are masked (`DE42 12 **** 1669`), limits shown as `£ 10,000 / £ 100,000`.

## VISUAL FOUNDATIONS
- **Palette:** a cool **ink-and-grey** system. Primary ink `#283349` carries text, buttons and icons. Greys ramp `#697080 → #9499A4 → #E8EAED (border) → #F3F5F6 → #F9FAFB (app bg)`. One warm accent — **Gemba Yellow `#FFDA44`** — lives only in the mark. **Accent blue `#2066E6`** is informational in-app and the primary CTA colour on the marketing site.
- **Signal colours:** success `#20982E`, warning `#CD8C00`, critical `#E95E5E`, accent `#2066E6`, each paired with an 8%-opacity subdued tint for chip/alert fills.
- **Type:** **Public Sans** everywhere (Bold for headings & emphasis, Regular for body). Scale: H1 40/48, H2 28/36, H3 24/32, H4 20/28, H5 16/24; body 14/20, small 12/16; chip labels 10/16. Marketing hero scales up to ~68px. Chips use **PT Root UI VF** in the source (not on Google Fonts — see Font substitutions).
- **Radii:** 4 (subtle fields), 8 (inputs, square buttons), 12 (inner cards), 16 (cards, pills-on-short), 24 (pill buttons, hero blocks), full pill for badges & CTAs.
- **Cards:** white surface, 16px radius, a **1px `#E8EAED` inset hairline ring** plus a soft cool-grey shadow `0 4px 16px rgba(95,105,133,.06)`. Inner sub-cards use `#F3F5F6` at 12px radius. Popovers use a stronger `0 12px 32px rgba(40,51,73,.16)`.
- **Borders:** rendered as **inset box-shadow rings**, not CSS borders (`inset 0 0 0 1px #E8EAED`); focus is a 2px ink ring `inset 0 0 0 2px #283349`.
- **Shadows:** always soft, low-opacity, cool blue-grey (`95,105,133`) — never black, never harsh.
- **Backgrounds:** flat. App = `#F9FAFB`. Marketing uses gentle vertical light-blue-grey gradients (`#EEF1F6 → #FFF`) and a dark slate band (`#3B4350 → #5A6472`) for the product highlight. No textures, no noise.
- **Buttons:** Primary = solid ink pill, white label (app); solid **blue** pill (marketing). Secondary/Tertiary = grey fills; Ghost = transparent. 40px tall default (24px radius), 32px small; square variants at 8px.
- **Hover/press:** subtle — nav items gain a `#F3F5F6` fill and bolden when active. (The source is static; keep interaction restrained — a slight darken or fill, no bounce.)
- **Imagery:** cool, professional photography (people at laptops) and premium 3D renders (metal/blue cards, silver coins) for marketing. B2B and understated.
- **Layout:** app is a fixed 240px white sidebar + top bar + scrolling content on `#F9FAFB`; marketing is a centered ~1200px column with generous vertical rhythm.

## ICONOGRAPHY
- **Icon set:** the **Untitled UI** line-icon library — **1,167 glyphs** materialized into `components/icons/icon-data.js` and rendered via the `<Icon name size />` wrapper. Consistent 24px artboard, ~1.5–2px stroke, rounded joins, single-colour (`currentColor`).
- **Usage:** stroke icons throughout nav, tables, inputs, chips. Recolour by setting `color` on the element (e.g. success/critical/accent for status). Full name index in `components/icons/Icon.d.ts`.
- **Flags:** small circular country flags in account rows (real flag assets in source; emoji stand-in in the app kit).
- **No emoji or unicode glyphs** are used as UI icons in the brand. The brand mark is a distinct tri-fold shape (see `assets/`).

---

## Components
Built from the Figma component families (`GembaDesignSystem_26dc89` namespace):

- **PrimaryButton**, **SecondaryButton**, **TertiaryButton**, **GhostButton** — the four button ranks (`style2`: default / square / small / small square).
- **Chip** — status pill (`neutral / accent / success / warning / critical`).
- **StoreDownloadButton** — App Store / Google Play badges (store × type × language variants).
- **Icon** — the 1,167-glyph icon wrapper.
- **Asterisk01**, **IconsArrowCircleBrokenRight** — glyphs used as button/chip defaults in the source.

### Intentional additions (documented in the Figma Design-System page, not formal component sets)
- **Input**, **Checkbox**, **Radio**, **Toggle** (`components/forms/`) — the form primitives specified on the Design-System "Input fields" and "Checkboxes, Radio, Toggle" frames. Added so product screens have real controls to compose; values transcribed from those frames.

## UI kits
- **`ui_kits/app/`** — the Gemba banking app (Dashboard, Accounts, Cards, Payments), working sidebar navigation.
- **`ui_kits/website/`** — the business-banking marketing landing page.

## Font substitutions
- **PT Root UI VF** (chip labels) and **DT Flow** (a raw token default) are **not on Google Fonts**. Tokens keep pointing at the real family names with a Public-Sans fallback stack. **Please upload these font files** if exact fidelity is needed. Public Sans and Inter load from Google Fonts.

---

## Index (manifest)
- `styles.css` — global entry (imports only).
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `base.css`.
- `components/core/` — buttons, chip, store button, fig-tokens.css, fig-typography.css.
- `components/forms/` — Input, Checkbox, Radio, Toggle.
- `components/icons/` — `icon-data.js`, `Icon.jsx`, `Icon.d.ts`.
- `components/*.card.html` — foundation specimen cards (Colors, Type, Spacing, Brand).
- `ui_kits/app/`, `ui_kits/website/` — full-screen product recreations.
- `assets/` — Gemba wordmark (svg/png) + mark PNGs.
- `SKILL.md` — Agent-Skills manifest.
