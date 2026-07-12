# Phase 1: Design Foundation & Home Page - Pattern Map

**Mapped:** 2026-07-10
**Files analyzed:** 10
**Analogs found:** 10 / 10 (all are retrofits of existing files — brownfield re-skin)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/app/globals.css` | config (theme tokens) | transform | itself (`src/app/globals.css`, current oklch layer) + `design-system/styles.css`/`tokens/*.css` | exact (re-point in place) |
| `src/app/layout.tsx` | provider/layout | request-response | itself (`src/app/layout.tsx`) | exact (add stylesheet import + shell) |
| `src/app/page.tsx` | component (page) | request-response | itself (`src/app/page.tsx`) | exact (full content rewrite, same file) |
| `src/components/app-shell.tsx` (new) | component/provider | request-response | `src/components/header.tsx` | role-match (nav/link/logo pattern reused, new layout) |
| `src/components/mobile-tab-bar.tsx` (new) | component | request-response | `src/components/header.tsx` (mobile `Sheet` nav block) | role-match |
| `src/components/ui/button.tsx` | component | request-response | itself (cva variant pattern already present) | exact (retrofit variants/tokens) |
| `src/components/ui/card.tsx` | component | request-response | itself | exact (retrofit — drop `border`, add ring+shadow) |
| `src/components/ui/badge.tsx` → superseded by Chip | component | request-response | `design-system/components/core/Chip.jsx` + existing `badge.tsx` | role-match |
| `src/components/chip.tsx` (new) | component | request-response | `design-system/components/core/Chip.jsx` | exact (port/adapt) |
| `src/components/icon.tsx` (new, ported) | utility/component | transform | `design-system/components/icons/Icon.jsx` + `Icon.d.ts` | exact (port to `.tsx`) |
| `src/components/theme-toggle.tsx` | component | request-response | itself | role-match (icon swap lucide→Icon wrapper, aria-label already present) |

## Pattern Assignments

### `src/app/globals.css` (config, transform)

**Analog:** itself — current shadcn oklch `:root`/`.dark` block + `@theme inline` map, plus `design-system/tokens/colors.css`, `spacing.css`, `typography.css` as the value source.

**Current `@theme inline` re-point target** (`src/app/globals.css` lines 7-48):
```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
  ...
  --radius-sm: calc(var(--radius) - 4px);
  --radius-lg: var(--radius);
  ...
}
```
Pattern to follow: keep the **same `@theme inline` variable names** (`--color-background`, `--color-card`, `--radius-lg`, etc.) so existing Tailwind utility classes (`bg-card`, `text-primary`, `rounded-lg`) keep resolving — only change **what they point to**, per D-02. Map them onto Gemba semantic aliases instead of oklch:
```css
:root {
  --background: var(--surface-page);      /* was oklch(1 0 0) */
  --foreground: var(--text-primary);
  --card: var(--surface-card);
  --card-foreground: var(--text-primary);
  --primary: var(--button-primary-bg);
  --primary-foreground: var(--button-primary-fg);
  --border: var(--border-default);
  --muted-foreground: var(--text-subdued);
  --radius: 1rem; /* base so radius-lg → 16px per COMP-05 card recipe */
}
```

**Gemba token source** (`design-system/tokens/colors.css` lines 9-62): semantic aliases (`--text-primary`, `--surface-page`, `--surface-card`, `--border-default`, `--button-primary-bg`, `--gemba-accent`, `--gemba-critical`, `-subdued` 8%-tint variants) — these become the values `:root` resolves to. `colors.css` is **light-only**; `.dark` block must be **authored net-new** with near-black surfaces + lightened accent/signal colors (no existing analog in repo — first true dark-mode authoring, see D-08/D-09 in CONTEXT.md).

**Font import pattern** — `design-system/tokens/fonts.css` (Google Fonts `@import` for Public Sans) must be pulled in ahead of `--font-sans` reassignment; replaces the current hardcoded `"Inter", ui-sans-serif...` stack.

**Import order** — follow `design-system/styles.css`'s own order (fonts → colors → typography → spacing → base) when wiring `@import` statements into `globals.css`, per CONTEXT.md D-01.

---

### `src/app/layout.tsx` (provider/layout, request-response)

**Analog:** itself (`src/app/layout.tsx`, full file, 74 lines).

**Structure to preserve** (lines 41-73): `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>` wraps a `flex min-h-screen flex-col` div containing `<Header />` + `<main>`, followed by `<Toaster />` and the SW-registration `<Script>`. Metadata/viewport block (lines 8-34) stays as-is — no icon/manifest changes this phase.

**Change required:** swap `<Header />` for the new app-shell component(s) (sidebar+topbar on desktop, bottom tab bar on mobile per D-03/D-04), and add the Gemba `design-system/styles.css` import alongside `./globals.css` (D-01 — "Import the design-system tokens globally"). Keep the `ThemeProvider` wiring completely untouched — it already does what D-08 dark mode needs (class strategy).

---

### `src/app/page.tsx` (component/page, request-response)

**Analog:** itself (`src/app/page.tsx`, full file, 193 lines) — being substantially rewritten in place, not built from a different analog.

**Patterns to keep from current file:**
- Section-based composition (`<section>` blocks) — lines 70-190.
- `Card`/`CardHeader`/`CardContent`/`CardTitle` composition for feature cards (lines 120-137) — reuse the same shadcn `Card` primitives, just restyle per Card recipe (COMP-05: inset-ring, `--radius-lg`, no `border` utility).
- `Link` + `Button` composition for CTAs (lines 90-101) — keep `<Link href="/upload"><Button>...</Button></Link>` pattern, swap copy to "Send a file" / "Receive a file" (Copywriting Contract) and swap `lucide-react` icons (`Upload`, `ArrowRight`) for the ported `Icon` wrapper.

**Patterns to remove:**
- Gradient hero background (line 72: `bg-[radial-gradient(...)]`) — hard guardrail violation, delete entirely (D-05).
- Gradient hero text (lines 79-83: `bg-gradient-to-r ... bg-clip-text text-transparent`) — replace with flat `.gemba-h1` text.
- `Badge` gradient/pill usage (lines 75-77) — replace with new `Chip` component (`neutral`/`accent` variant, ALL-CAPS labels e.g. "OPEN SOURCE" / "END-TO-END ENCRYPTED").
- "How it works" + repeated CTA section (lines 142-189) — drop or shorten per D-05.

---

### `src/components/header.tsx` → split into app shell (desktop sidebar+topbar) and mobile tab bar (mobile)

**Analog:** `src/components/header.tsx` (full file, 83 lines) — this is the only existing nav component; both new files derive from it.

**Imports pattern** (lines 1-9):
```tsx
"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
```
Replace `lucide-react` icon imports with the ported `Icon` wrapper on redesigned surfaces (D-07); keep `next/image`, `next/link`, `Button`, `ThemeToggle` imports.

**Nav data + logo-swap pattern to reuse verbatim** (lines 11-15, 23-45):
```tsx
const navLinks = [
  { href: "/", label: "Home" },
  { href: "/upload", label: "Upload" },
  { href: "/download", label: "Download" },
];
...
<Image src="/logo.svg" alt="Gemba" width={153} height={36} priority className="h-7 w-auto dark:hidden" />
<Image src="/logo-dark.svg" alt="Gemba" width={153} height={36} priority className="hidden h-7 w-auto dark:block" />
<span className="text-lg font-medium tracking-tight text-muted-foreground">Filesend</span>
```
Per UI-SPEC "Brand lockup": keep this exact logo-swap mechanism (already correct — do not rename files to `gemba-logo-*`), just restyle the "Filesend" label to `.gemba-body-sm` + `--text-subdued` instead of `text-muted-foreground`.

**Desktop nav → active-state pattern (net-new, no exact analog):** current `header.tsx` has no active-route styling (lines 47-56 render all links identically via `Button variant="ghost" size="sm"`). New sidebar must add active-item detection (e.g. `usePathname()` from `next/navigation`) and apply `--surface-subdued` fill + bold label — this is new logic, not a copy.

**Mobile nav pattern to replace, not reuse:** current `Sheet`-based hamburger drawer (lines 60-78) is explicitly superseded by a fixed bottom tab bar per D-04. Do **not** carry the `Sheet` pattern into the new mobile component — build a fixed `<nav className="fixed bottom-0 inset-x-0 md:hidden ...">` with the same three `navLinks` array, rendering icon+label tab items instead of a drawer.

---

### `src/components/ui/button.tsx` (component, request-response)

**Analog:** itself — `cva` variant/size API already present (COMP-01 discretion resolved: retrofit in place).

**Structure to preserve** (full file, 65 lines): `cva(base, { variants: { variant, size }, defaultVariants })` + `Button` function using `Slot` for `asChild`. Retrofit target — map cva `variant` keys onto Gemba button ranks:
```tsx
variant: {
  default:   "bg-primary text-primary-foreground hover:bg-primary/90", // → ink pill, Primary rank
  secondary: "bg-secondary text-secondary-foreground ...",              // → Secondary rank (#E8EAED)
  ghost:     "hover:bg-accent ...",                                      // → Tertiary/Ghost ranks
}
```
Sizes (`default`, `sm`, `icon`, `icon-sm`) map onto default/small/square per UI-SPEC (40px/32px tall, `--radius-xl` pill default/small, `--radius-sm` square). Keep `data-slot`, `data-variant`, `data-size` attributes — used for CSS targeting elsewhere.

---

### `src/components/ui/card.tsx` (component, request-response)

**Analog:** itself — `Card`/`CardHeader`/`CardContent`/etc. composition (full file, 93 lines).

**Retrofit target** (line 10):
```tsx
"bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm"
```
Per COMP-05 card recipe (UI-SPEC line 84): remove the `border` utility class entirely and replace `shadow-sm` with the inset-ring recipe — `box-shadow: var(--ring-border), var(--shadow-card)`, `rounded-xl` → `rounded-lg` (16px = `--radius-lg`). This is the one shadcn primitive with an explicit "do NOT use Tailwind `border`" guardrail — flag prominently for planner/implementer.

---

### `src/components/chip.tsx` (new — COMP-03)

**Analog:** `design-system/components/core/Chip.jsx` (full file, 223 lines) — reference JSX to port/adapt into a `cva`-based shadcn-style component (consistent with `badge.tsx` pattern) rather than lifted 1:1 (the reference uses inline `style` objects and a per-variant switch, not Tailwind).

**Structural facts to carry over exactly** (lines 10-46, repeated per variant 0-4):
```
height: 20, borderRadius: 16, padding: "3px 10px",
display: flex, gap: 4 (--space-2), alignItems: center,
backgroundColor: var(--signal-{variant}-subdued) (8% tint),
label: fontWeight 700, fontSize 10, lineHeight 16px, ALL-CAPS text,
color: var(--signal-{variant}) (full-strength)
```
Variant → color mapping (lines 14, 43, 54, 83 etc.): `neutral` → `--gemba-neutral-subdued`/`--gemba-neutral-signal`; `accent` → `rgba(32,102,230,0.08)`/`--gemba-accent`; `success`/`warning`/`critical` follow the same 8%-tint pattern. Home page only needs `neutral`/`accent` per UI-SPEC. Recommended implementation pattern: follow the existing `badge.tsx` `cva` structure (variant map + `Comp`/`asChild` support) but swap in Chip's exact dimensions/colors/typography instead of Badge's pill-outline styling — this satisfies "reuse shadcn primitive conventions" while matching the Gemba Chip spec.

**Icon slot pattern** (lines 26-35): optional 16px prefix icon rendered via `props.icon ?? <Asterisk01 />` — in the ported app version this becomes `<Icon name="..." size={16} />` from the new Icon wrapper, not the reference's per-glyph `.jsx` files.

---

### `src/components/icon.tsx` (new, ported — COMP-04)

**Analog:** `design-system/components/icons/Icon.jsx` (full file, 19 lines) + `Icon.d.ts` (already typed, 20.4K — keep as-is per UI-SPEC).

**Full source to port, converting to `.tsx`:**
```jsx
import icons from './icon-data.js';

export function Icon({ name, size, ...rest }) {
  const d = icons[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox={d.viewBox}
      fill="none"
      dangerouslySetInnerHTML={{ __html: d.body }}
      {...rest}
    />
  );
}
export default Icon;
```
Port target: `src/components/icon.tsx` (or subfolder per UI-SPEC "exact subfolder is an execution detail") + copy `icon-data.js` (~1MB, 1,167 glyphs) + `Icon.d.ts` alongside it, unmodified. Update the relative import (`./icon-data.js`) to match new location. No existing analog in `src/` — this is a net-new utility/wrapper component; `Icon.d.ts` already provides prop types for strict TS (`name: string`, `size?: number`, plus `SVGProps` passthrough — confirm exact shape when porting).

**Consumers to update:** every `lucide-react` icon import on redesigned surfaces (`page.tsx`: `ArrowRight`, `Lock`, `Shield`, `Timer`, `Upload`, `Zap`; `header.tsx`/app-shell: `Menu`; `theme-toggle.tsx`: `Sun`, `Moon`) swaps to `<Icon name="..." size={20|24} />` calls against the Untitled UI glyph names in `icon-data.js`.

---

### `src/components/theme-toggle.tsx` (component, request-response)

**Analog:** itself (full file, 22 lines).

**Pattern to preserve exactly:**
```tsx
"use client";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
      {/* icon swap */}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```
Already has the `sr-only` label pattern (functions as the icon-only aria-label requirement from UI-SPEC's Accessibility note — verify `sr-only` span satisfies it or add explicit `aria-label="Toggle theme"` to the `Button` to be safe). Only change: swap `Sun`/`Moon` from `lucide-react` to two `Icon name="sun"` / `Icon name="moon"` calls with the same rotate/scale dark-mode transition classes.

---

## Shared Patterns

### Icon rendering (COMP-04)
**Source:** `design-system/components/icons/Icon.jsx`
**Apply to:** `page.tsx`, app-shell/header components, `theme-toggle.tsx`, `chip.tsx` prefix icon slot — every UI icon on redesigned surfaces.
```tsx
<Icon name="upload-01" size={20} />
```
24px default, ~1.5–2px stroke, inherits `currentColor` — no separate `stroke`/`fill` props needed on call sites; color comes from the wrapping element's text color (matches how `lucide-react` icons currently inherit `text-primary`/`text-muted-foreground` via className).

### Card recipe (COMP-05, DESIGN-SYSTEM.md guardrail)
**Source:** `design-system/tokens/spacing.css` (`--ring-border`, `--shadow-card`, `--radius-lg`) applied through `src/components/ui/card.tsx`
**Apply to:** `card.tsx` base component, all feature/trust cards on `page.tsx`.
```css
background: var(--surface-card);
border-radius: var(--radius-lg); /* 16px */
box-shadow: var(--ring-border), var(--shadow-card);
/* never Tailwind `border` utility on card surfaces */
```

### Token re-point (D-01/D-02)
**Source:** `design-system/tokens/colors.css`, `spacing.css`, `typography.css` → `src/app/globals.css` `@theme inline` map.
**Apply to:** every component using Tailwind semantic utilities (`bg-card`, `text-primary`, `border-border`, `rounded-lg`) — no call-site changes needed once `globals.css` is re-pointed; this is the single highest-leverage file in the phase.

### Dark mode class strategy (already wired, D-08/D-09)
**Source:** `src/components/theme-provider.tsx` (untouched) + `next-themes` `.dark` class.
**Apply to:** `globals.css` `.dark` block (net-new near-black authoring), `header.tsx`/app-shell logo swap (`dark:hidden`/`dark:block`, already correct, do not rebuild), any component needing dark-specific overrides beyond token re-point.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.dark` token block in `globals.css` | config | transform | `design-system/tokens/colors.css` is light-only (`:root` only) — dark near-black + lightened accent/signal values must be authored net-new per D-08/D-09, no existing dark palette to copy from in this repo or the design system |
| Desktop sidebar active-nav-item logic | component | request-response | Current `header.tsx` has no active-route styling; `usePathname()`-based active state is new logic, not a retrofit |
| Mobile bottom tab bar | component | request-response | Current mobile nav is a `Sheet` drawer (opposite pattern); D-04 replaces it with a fixed tab bar — build from UI-SPEC description + `navLinks` data only, not from the `Sheet` structure |

## Metadata

**Analog search scope:** `src/app/`, `src/components/`, `src/components/ui/`, `design-system/components/`, `design-system/tokens/`
**Files scanned:** 10 source files read in full (globals.css, layout.tsx, page.tsx, header.tsx, button.tsx, card.tsx, badge.tsx, theme-toggle.tsx) + 3 design-system reference files (Icon.jsx, Chip.jsx, colors.css) + directory listing of `design-system/components/icons/` and `components/core/`
**Pattern extraction date:** 2026-07-10
