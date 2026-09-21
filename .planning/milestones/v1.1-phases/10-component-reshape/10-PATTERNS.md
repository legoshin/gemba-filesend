# Phase 10: Component Re-shape - Pattern Map

**Mapped:** 2026-09-21
**Files analyzed:** 20 (16 shared `src/components/ui/*` + 4 app-specific `src/components/*`)
**Analogs found:** 20 / 20 (all resolve to the Phase 9 foundation + `chip.tsx`; no "no analog" bucket — this phase's whole job is to bring every component up to a pattern that already exists in the codebase)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/components/ui/button.tsx` | component (CVA+Slot, leaf) | request-response (click/press) | `src/components/chip.tsx` | exact (CVA+Slot, needs `motion.create(Slot.Root)` hoist) |
| `src/components/ui/badge.tsx` | component (CVA+Slot, leaf) | request-response | `src/components/chip.tsx` | exact — badge is chip's un-migrated sibling |
| `src/components/ui/input.tsx` | component (plain leaf) | request-response (controlled input) | `src/components/chip.tsx` (motion wiring) + itself (no Slot) | role-match |
| `src/components/ui/checkbox.tsx` | component (Radix primitive, state toggle) | event-driven (state change) | `src/components/ui/switch.tsx` (thumb-transform sibling) | role-match |
| `src/components/ui/radio-group.tsx` | component (Radix primitive, state toggle) | event-driven | `src/components/ui/checkbox.tsx` | role-match |
| `src/components/ui/switch.tsx` | component (Radix primitive, state toggle) | event-driven | `src/components/ui/checkbox.tsx` / `radio-group.tsx` | role-match (thumb travel = SmoothUI Animated Toggle) |
| `src/components/ui/label.tsx` | component (plain leaf) | request-response | `src/components/ui/separator.tsx` | role-match (simple leaf, shape-only) |
| `src/components/ui/card.tsx` | component (compound, plain div) | request-response | `src/components/chip.tsx` (motion wiring pattern) | role-match |
| `src/components/ui/dialog.tsx` | component (Radix portal + exit animation) | event-driven (open/close) | `src/components/ui/sheet.tsx` (near-identical Radix Dialog wrapper) | exact (same underlying primitive family) |
| `src/components/ui/sheet.tsx` | component (Radix portal + exit animation) | event-driven | `src/components/ui/dialog.tsx` | exact |
| `src/components/ui/dropdown-menu.tsx` | component (Radix portal + exit animation) | event-driven | `src/components/ui/dialog.tsx` / `sheet.tsx` (portal+animate pattern), `chip.tsx` (motion hook wiring) | role-match |
| `src/components/ui/tabs.tsx` | component (Radix primitive, indicator) | event-driven (selection change) | `src/components/chip.tsx` (motion hook) — no existing sliding-indicator analog | role-match, partial (indicator motion is genuinely new — see below) |
| `src/components/ui/avatar.tsx` | component (Radix primitive, compound) | request-response | `src/components/ui/badge.tsx` (shape-only leaf) | role-match |
| `src/components/ui/separator.tsx` | component (plain leaf) | request-response | itself / `label.tsx` | role-match (shape-only, likely no motion) |
| `src/components/ui/progress.tsx` | component (Radix primitive, value-driven) | streaming (live value updates) | `src/components/chip.tsx` (motion hook) + `transitions.fill` (purpose-built) | exact (preset literally documents "Progress bar fill") |
| `src/components/ui/sonner.tsx` | component (3rd-party wrapper) | event-driven (toast queue) | `variants.toast` preset (purpose-built, no existing consumer yet) | role-match, preset pre-exists but unconsumed |
| `src/components/file-dropzone.tsx` | app component (drag/drop + list) | file-I/O + event-driven | `src/components/chip.tsx` (motion wiring) + `variants.stagger` (purpose-built for file rows) | role-match |
| `src/components/app-shell.tsx` | app component (layout shell) | request-response (route-driven) | `src/components/chip.tsx` (active-link motion is new, but hook wiring identical) | role-match |
| `src/components/mobile-tab-bar.tsx` | app component (nav) | request-response (route-driven) | `src/components/app-shell.tsx` desktop nav (shares active-link logic) | exact (sibling nav) |
| `src/components/theme-toggle.tsx` | app component (dropdown consumer) | event-driven | `src/components/ui/dropdown-menu.tsx` (its own primitive) | exact — theme-toggle only needs the dropdown-menu re-shape to propagate, plus its own icon-swap motion |

## Pattern Assignments

### Group A — CVA + Slot leaf components (`button.tsx`, `badge.tsx`)

**Analog:** `src/components/chip.tsx` (already migrated in Phase 9 — this is the literal template for this group)

**Imports pattern** (`chip.tsx` lines 1-10):
```typescript
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "motion/react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { transitions, variants } from "@/lib/motion"
import { useMotionPreset } from "@/lib/use-motion-preset"
```

**Stable MotionSlot hoist** (`chip.tsx` lines 12-16) — copy verbatim, adjusted for the native element being wrapped (`motion.button` for Button instead of `motion.span`):
```typescript
// Stable module-level component identity: `motion.create()` returns a new
// wrapped component object each call, so it must not be invoked during
// render (react-hooks/static-components) — hoisting it here keeps `Comp`
// identity stable across re-renders on the `asChild` path.
const MotionSlot = motion.create(Slot.Root)
```

**Core pattern** (`chip.tsx` lines 60-87) — CVA variants stay untouched; add `motion.*`/`useMotionPreset` wiring around the existing `Comp = asChild ? Slot.Root : "span"` line:
```typescript
function Chip({ className, variant = "neutral", asChild = false, ...props }: ChipProps) {
  const Comp = asChild ? MotionSlot : motion.span
  const motionProps = useMotionPreset(variants.fadeSlideUp, transitions.snappy)
  return (
    <Comp data-slot="chip" data-variant={variant}
      className={cn(chipVariants({ variant }), className)}
      {...motionProps} {...props}>
      {children}
    </Comp>
  )
}
```

**Current state to preserve exactly:**
- `button.tsx` (lines 43-64): `Comp = asChild ? Slot.Root : "button"` — becomes `asChild ? MotionSlot : motion.button`. ALL existing variant/size CVA strings (lines 7-41, 8 variants x 8 sizes) must be copied unchanged — only geometry values inside those strings may shift to `shape.ts` tokens if a radius/ring diverges from what's already there (most already use `rounded-[var(--radius-xl)]`/`rounded-[var(--radius-sm)]`, i.e. already `shape.field`/`shape.pillButton` equivalents — no literal change needed, just confirm alignment).
- `badge.tsx` (lines 29-46): identical `Comp = asChild ? Slot.Root : "span"` shape to Chip's pre-Phase-9 form — this is badge's exact "before" state. Apply the identical transform chip.tsx already received. Suggested motion preset: `variants.fadeSlideUp` + `transitions.snappy` (same as chip, since badge and chip are visually the same shape family) — or `variants.hover`/`tapPress` layered on for interactive badges (`asChild` used as a link).
- Note different native prop omission needs: button is a real `<button>` (no native/motion prop collision beyond drag/animation, same `NativeSpanProps`-style Omit pattern from chip.tsx lines 43-51, but computed for `"button"` element props).

**Naming convention:** `data-slot`, `data-variant` attrs stay; CVA variant/size names are a locked public API (CONTEXT.md: "preserving ALL existing ranks/variants/sizes") — do not rename.

---

### Group B — Radix state-toggle leaf components (`checkbox.tsx`, `radio-group.tsx`, `switch.tsx`)

**Analog:** each other (all three share the same shape: `"use client"`, thin Radix wrapper, `cn()`-merged className string, no CVA, no current motion).

**Current pattern** (`checkbox.tsx` full, 32 lines) — anchor for the group:
```typescript
"use client"
import * as React from "react"
import { CheckIcon } from "lucide-react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root data-slot="checkbox" className={cn("...", className)} {...props}>
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="grid place-content-center text-current transition-none">
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
```

**Established convention to keep:** no `forwardRef` (relies on React 19's ref-as-prop, matches every other file in this codebase — do NOT introduce `forwardRef`), no `displayName` set anywhere in this codebase's `ui/*` files (grep confirms none use it — do not add), props typed via `React.ComponentProps<typeof XPrimitive.Root>` (not a hand-written interface) — preserve this typing style.

**Re-shape approach:** these have no `asChild`/Slot surface, so they don't need `MotionSlot`. Wrap `CheckboxPrimitive.Indicator`'s check-mark and `SwitchPrimitive.Thumb`'s translate in `motion.span`/`motion.div` + `useMotionPreset` (a new small preset for check-mark scale-in / thumb spring may be needed — extend `variants`/`transitions` in `src/lib/motion.ts` per CONTEXT.md's "add it to the foundation, don't inline it" rule; `transitions.snappy` is the closest existing fit for thumb travel). `switch.tsx`'s CSS-only thumb transform (lines 25-30, `transition-transform` + `translate-x`) is the direct target to replace with a `motion.span` + spring, since SmoothUI's "Animated Toggle" is spring-driven, not CSS-eased.

**Radix primitives used per file** (for planner reference): Checkbox → `CheckboxPrimitive.Root`/`.Indicator`; RadioGroup → `RadioGroupPrimitive.Root`/`.Item`/`.Indicator`; Switch → `SwitchPrimitive.Root`/`.Thumb`. All three must keep `data-[state=checked]`/`data-[state=unchecked]` driven styling — Radix owns state, motion only decorates.

---

### Group C — Radix portal + exit-animation surfaces (`dialog.tsx`, `sheet.tsx`, `dropdown-menu.tsx`)

**Analog:** `dialog.tsx` and `sheet.tsx` are near-duplicates of each other (both wrap a Radix `Dialog` primitive — `sheet.tsx` imports `Dialog as SheetPrimitive` from `radix-ui`, i.e. Sheet literally IS Dialog under a different name/geometry). `dropdown-menu.tsx` is the third portal+animate surface, driven by CSS `data-[state=open]:animate-in`/`data-[state=closed]:animate-out` (tailwindcss-animate utility classes) rather than Motion.

**Current pattern — CSS-driven exit animation** (`dialog.tsx` lines 61-68, `dropdown-menu.tsx` lines 41-52) — this is what must be replaced:
```typescript
<DialogPrimitive.Content
  data-slot="dialog-content"
  className={cn(
    "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 outline-none sm:max-w-lg",
    className
  )}
  {...props}
>
```

**Target pattern:** replace the `animate-in`/`animate-out`/`fade-*`/`zoom-*` Tailwind utility classes with `motion.create(DialogPrimitive.Content)` (same hoist pattern as chip.tsx's `MotionSlot`, e.g. `const MotionDialogContent = motion.create(DialogPrimitive.Content)`) driven by `useMotionPreset(variants.scaleIn, transitions.snappy)` for the panel, and `useMotionPreset(variants.fadeSlideUp` or a plain fade, `transitions.backdrop)` for `DialogOverlay`/`SheetOverlay` (the `transitions.backdrop` preset in `motion.ts` line 31 is purpose-built for exactly this: "Backdrop fade (dialog/sheet scrim)"). For Radix's unmount-on-close to coexist with Motion exit animations, these portal contents need `AnimatePresence` wrapping — since none of these three files currently use it, this is the one genuinely new wiring the planner must account for (Radix's own `forceMount`/controlled-open pattern combined with `AnimatePresence`, documented in Motion's Radix integration guide — cite in the plan, not invented locally).
`dropdown-menu.tsx` gets the same overlay-less version (`variants.menu` preset already exists, line 123-140 of `motion.ts`, literally named "Dropdown/dialog open-close" — direct fit for `DropdownMenuContent`).

**Shared invariant across the three:** Radix owns `data-state`/focus-trap/ESC/outside-click — motion decorates only the `Content`/`Overlay` visual layer. `showCloseButton`, `side` (sheet), and all other existing props/behavior stay untouched.

**`DialogFooter`'s embedded `Button`** (dialog.tsx line 114) — once `button.tsx` is re-shaped (Group A), this call site inherits the change automatically; no edit needed in `dialog.tsx` itself for that part.

---

### Group D — Radix indicator/selection components (`tabs.tsx`)

**Analog:** no exact existing analog for a sliding active-indicator — closest is `chip.tsx`'s hook-wiring pattern (`useMotionPreset` + `motion.*`) applied to `TabsPrimitive.Trigger`'s CSS `after:` pseudo-element indicator (tabs.tsx lines 70), which today is a static `after:opacity-0`/`data-[state=active]:after:opacity-100` toggle with no slide.

**Current pattern** (`tabs.tsx` lines 59-76) — the `after:` indicator to replace/augment:
```typescript
"after:bg-foreground after:absolute after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 ... group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100"
```

**Target pattern:** SmoothUI's "Animated Tabs" moves a single shared indicator element (via `layoutId` in Motion, or `motion.div` positioned with `getBoundingClientRect`) rather than per-trigger opacity toggles. This requires a `TabsList`-level `motion.div` indicator sharing a `layoutId` across triggers — genuinely new geometry, not a copy of an existing file. Use `transitions.snappy` (already the general-purpose UI spring) and follow CONTEXT.md's rule: if this indicator motion isn't already a named preset in `motion.ts`, add one (e.g. `variants.tabIndicator` or reuse `transitions.snappy` raw since a `layoutId`-driven element doesn't need a variants pair, just a transition).

---

### Group E — Plain leaf/shape-only components (`input.tsx`, `label.tsx`, `separator.tsx`, `avatar.tsx`)

**Analog:** each other — none currently import `motion` or `cva`; all are a single `cn()`-merged className on a native or Radix element with no interactive state motion.

**Current pattern** (`input.tsx` full, 21 lines):
```typescript
import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input type={type} data-slot="input"
      className={cn("... h-10 w-full min-w-0 rounded-[var(--radius-sm)] bg-[var(--surface-card)] px-4 py-1 ... shadow-[var(--ring-border),var(--shadow-field)] ...", "focus-visible:shadow-[var(--ring-focus)]", "aria-invalid:...", className)}
      {...props}
    />
  )
}
```

**Re-shape approach:** `input.tsx` already uses `rounded-[var(--radius-sm)]` — directly swappable for `shape.field` from `src/lib/shape.ts` (`"rounded-[var(--radius-sm)]"`, identical value — confirms the shape.ts token is a literal extraction of what's already here). `focus-visible:shadow-[var(--ring-focus)]` already matches `shape.ringFocus`. For **motion**, "Animated Input" (FORM-01) per CONTEXT.md's SmoothUI map typically wants a label-float or focus-ring pulse — since `input.tsx` is a plain `<input>` with no children, add a `motion.span`-wrapped focus-ring overlay or convert the wrapping div (if any is added by consumers) — keep the `<input>` itself a real native element (uncontrolled ref forwarding, autofill, browser autocomplete UX must not break by swapping to `motion.input`... actually `motion.input` is safe to use directly since Motion supports native `motion.<tag>` factories the same way `motion.span`/`motion.button` do in chip.tsx/button.tsx). Use `useMotionPreset` with a small new "focus" preset if none exists (check `transitions.micro` — "Micro hover/press motion" — closest fit for a focus-ring pulse) rather than inlining raw spring constants.
- `label.tsx` (24 lines) and `separator.tsx` (28 lines): shape-only, no interaction — likely stay static (no forced motion requirement in CONTEXT.md beyond consistent `rounded-*`/shape tokens); confirm no hardcoded radius needs realignment (label has none; separator has none — both pass through).
- `avatar.tsx` (109 lines, compound: `Avatar`/`AvatarImage`/`AvatarFallback`/`AvatarBadge`/`AvatarGroup`/`AvatarGroupCount`): all `rounded-full` already — matches `shape.pill`. `AvatarImage` load could use `variants.fadeSlideUp` fade-in on mount (optional per SmoothUI "media treatment" note in CONTEXT.md), but no current usage of `Avatar` anywhere in `src/app`/`src/components` (confirmed via grep — zero consumers today), so treat as lower-priority/scaffold-only in the plan.

---

### Group F — Compound plain-div surface (`card.tsx`)

**Analog:** `src/components/chip.tsx` for the motion-wiring pattern; structurally `card.tsx` itself (92 lines, 7 sub-components: `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardAction`/`CardContent`/`CardFooter`) is its own closest shape analog — a plain `<div>` + `cn()`, no Radix primitive at all.

**Current pattern** (`card.tsx` lines 5-16):
```typescript
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card"
      className={cn("bg-card text-card-foreground flex flex-col gap-6 rounded-lg py-6 shadow-[var(--ring-border),var(--shadow-card)]", className)}
      {...props}
    />
  )
}
```

**Re-shape approach:** `rounded-lg` here is a raw Tailwind radius, NOT a `--radius-*` CSS var like every other file — this is the one component with a literal geometry gap vs. `shape.ts`; align to `shape.card` (`rounded-[var(--radius-lg)]`, 16px) per CONTEXT.md's "no new magic numbers" rule. For motion: only the outer `Card` needs `motion.div` + `useMotionPreset(variants.fadeSlideUp, transitions.snappy)` (entrance) and optionally `variants.hover` for interactive/clickable cards — sub-components (`CardHeader` etc.) stay plain `<div>`s, no motion needed on children.

---

### Group G — Value-driven (`progress.tsx`)

**Analog:** `transitions.fill` in `src/lib/motion.ts` (lines 17-22) — purpose-built and documented as "Progress bar fill — heavier, more damped, no bounce," with `variants.progress` (lines 113-122) as the container reveal pair. This is the strongest 1:1 preset-to-component match in the whole phase.

**Current pattern** (`progress.tsx` full, 31 lines) — CSS-only fill, to replace:
```typescript
<ProgressPrimitive.Indicator data-slot="progress-indicator"
  className="bg-primary h-full w-full flex-1 transition-all"
  style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
/>
```

**Target pattern:** swap the `<ProgressPrimitive.Indicator>` for `motion.create(ProgressPrimitive.Indicator)`, animate the `x`/`scaleX` transform via `animate={{ x: ... }}` with `transition={transitions.fill}` instead of the raw CSS `transition-all` + inline `style` transform. Wrap `ProgressPrimitive.Root` with `useMotionPreset(variants.progress, transitions.snappy)` for mount reveal. `FDBK-02` in CONTEXT.md maps directly here. Used in `download`/`upload` pages for live encryption/upload progress — CONTEXT.md's "encryption boundary untouched" constraint applies: this is presentation-only, the `value` prop wiring from encryption progress state must not change.

---

### Group H — Toast wrapper (`sonner.tsx`)

**Analog:** `variants.toast` in `src/lib/motion.ts` (lines 92-109) — purpose-built, documented as "Toast enter/exit — lateral slide-in," currently unconsumed by any file (Sonner's own internal CSS animations drive toasts today, not Motion).

**Current pattern** (`sonner.tsx` full, 40 lines) — thin wrapper around the third-party `Toaster` from `sonner`, no direct control over individual toast DOM nodes:
```typescript
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  return (
    <Sonner theme={theme as ToasterProps["theme"]} className="toaster group"
      icons={{ ... }}
      style={{ "--normal-bg": "var(--popover)", ... } as React.CSSProperties}
      {...props}
    />
  )
}
```

**Re-shape approach:** Sonner (the library) does not expose individual toast DOM nodes for `motion.create()` wrapping the way Radix primitives do — its `toastOptions`/CSS-var-driven styling is the only surface. Realistically this component's re-shape is CSS-var/shape-only (round the toast surface via `--border-radius: var(--radius-lg)` already wired at line 32, confirm it maps to `shape.card`) rather than a Motion-driven swap; `variants.toast`'s existence suggests the original intent was for a hand-rolled toast, but since Sonner is the established library (CONTEXT.md doesn't authorize swapping toast libraries), the planner should treat `FDBK-01` here as "confirm/align existing CSS transition timing to `transitions.snappy`'s 0.25s duration for visual consistency, not a `motion.create()` port." Flag this as a scope note for the plan rather than a direct copy.

---

### Group I — App-specific: `file-dropzone.tsx`

**Analog:** `src/components/chip.tsx` for the hook-wiring pattern; `variants.stagger` (motion.ts lines 76-91, explicitly documented for "List item entrance for a staggered container") is the purpose-built preset for the selected-file rows list.

**Imports pattern** (file-dropzone.tsx lines 1-7) — existing, to extend:
```typescript
"use client";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
```
add: `import { motion, AnimatePresence } from "motion/react"; import { transitions, variants } from "@/lib/motion"; import { useMotionPreset } from "@/lib/use-motion-preset";`

**Current pattern to re-shape (drop zone, lines 111-146):** static `border-2 border-dashed` + `isDragging` boolean-driven `cn()` swap — SmoothUI's "Animated File Upload" wants the dashed border / icon to react with spring motion on drag-enter, using `variants.hover`-style scale or a bespoke drag-active preset (extend `motion.ts` if none fits, per foundation rule) driven off the same `isDragging` state already tracked (`file-dropzone.tsx` line 20) — no new state needed, just wrap the motion props.

**File-row list (lines 148-176):** `files.map(...)` renders plain `<div>` rows — wrap the mapped list in `<AnimatePresence>` and each row in `motion.div` + `useMotionPreset(variants.stagger, transitions.snappy)`, keyed by `${file.name}-${index}` (existing key, line 152) so add/remove animates per SmoothUI "Animated List." `removeFile` (lines 96-101) already does an immutable filter — Motion's exit animation on removal requires `AnimatePresence` wrapping this list, which is new wiring (not present today).

**Hard constraint (CONTEXT.md FILE-01):** `handleDrag`/`handleDragIn`/`handleDragOut`/`handleDrop`/`handleFileSelect`/`filterBySize`/`removeFile`/`formatSize` — the entire encryption-adjacent file-handling logic (lines 24-109) is OFF LIMITS. Only the JSX return (lines 111-179) and its className/motion wiring change.

---

### Group J — App-specific: `app-shell.tsx` + `mobile-tab-bar.tsx`

**Analog:** each other — both implement the identical `navLinks`/`tabs` array + `usePathname()` active-link pattern (app-shell.tsx lines 11-15, 53-71 vs. mobile-tab-bar.tsx lines 7-11, 21-37), just desktop-horizontal vs. mobile-bottom-fixed. Re-shape one, then mirror to the other for consistency (CONTEXT.md's explicit grouping note: "SmoothUI navigation motion/geometry" applies to both as one SHELL-01/02 pair).

**Current pattern (active-link, app-shell.tsx lines 54-69):**
```typescript
{navLinks.map((link) => {
  const active = pathname === link.href;
  return (
    <Link key={link.href} href={link.href}
      className={`flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 ${
        active ? "gemba-body-strong bg-[var(--surface-subdued)] text-[var(--text-primary)]"
               : "gemba-body text-[var(--text-primary)] hover:bg-[var(--surface-subdued)]"
      }`}>
      <Icon name={link.icon} size={20} />
      {link.label}
    </Link>
  );
})}
```

**Re-shape approach:** the active-state background (`bg-[var(--surface-subdued)]`) is a hard opacity swap today — SmoothUI nav motion wants a shared sliding "pill" indicator behind the active link (same `layoutId` technique flagged in Group D/tabs.tsx) OR a `motion.div` scale/fade per-link. Given CONTEXT.md scopes this as presentational shape/motion only (no navigation logic change), keep `usePathname()`-driven `active` boolean, wrap the `Link`'s background in a `motion.span`/`layoutId="nav-active"` indicator using `transitions.snappy`. `mobile-tab-bar.tsx`'s icon+label column (lines 21-37) follows the same treatment, scaled to a bottom-tab layout — this is the "sibling nav, exact match" case (already noted in classification table).

**`app-shell.tsx` also imports/renders `ThemeToggle` and `MobileTabBar`** (lines 6-9) — once those are re-shaped independently (Groups H-analog for theme-toggle below, and this group for mobile-tab-bar), `app-shell.tsx` inherits both without further edits beyond its own header/nav.

---

### Group K — App-specific: `theme-toggle.tsx`

**Analog:** its own consumed primitive, `src/components/ui/dropdown-menu.tsx` (Group C) — once the dropdown-menu re-shape lands, `DropdownMenuContent`'s open/close motion (via `variants.menu`) automatically applies here with zero edits to `theme-toggle.tsx` itself for that part.

**Current pattern (icon swap, lines 20-31):** CSS-only `rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0` cross-fade between Sun/Moon icons — this is the one piece of `theme-toggle.tsx` that needs its own motion treatment (SmoothUI "Animated Theme Toggle," SHELL-02). Replace with `motion.span`-wrapped icons animating `rotate`/`scale` via `useMotionPreset` (a new small preset, since neither `variants.hover` nor `scaleIn` matches a rotate+scale icon-swap exactly — extend `motion.ts` per foundation rule) driven off the existing `theme` value from `useTheme()` (line 15) — no new state.

**Hard constraint (CONTEXT.md):** the 3-way light/dark/system `DropdownMenuRadioGroup`/`RadioItem` structure (lines 34-49) must stay intact — motion only touches the trigger icon and (via Group C) the dropdown panel.

## Shared Patterns

### Motion hook wiring (universal — every animated component in this phase)
**Source:** `src/components/chip.tsx` lines 68-69, `src/lib/use-motion-preset.ts`, `src/lib/motion.ts`
**Apply to:** every file in Groups A, C, D, F, G, I, J, K (anything gaining new motion)
```typescript
import { transitions, variants } from "@/lib/motion"
import { useMotionPreset } from "@/lib/use-motion-preset"
// ...
const motionProps = useMotionPreset(variants.<name>, transitions.<name>)
// spread onto a motion.* element: {...motionProps}
```
Never hand-write `initial`/`animate`/`exit`/`transition` inline — always resolve through `useMotionPreset` (client) or `resolveMotionPreset` (server-safe, for any non-hook usage) so `prefers-reduced-motion` degrades for free.

### Stable `motion.create()` hoisting (asChild/Slot components only)
**Source:** `src/components/chip.tsx` lines 12-16
**Apply to:** `button.tsx`, `badge.tsx` (Group A), and any `DialogPrimitive.Content`/`DropdownMenuPrimitive.Content` wrapping in Group C
```typescript
// Stable module-level component identity: `motion.create()` returns a new
// wrapped component object each call, so it must not be invoked during
// render (react-hooks/static-components) — hoisting it here keeps `Comp`
// identity stable across re-renders on the `asChild` path.
const MotionSlot = motion.create(Slot.Root)
```

### Shape tokens (universal — every component with a radius/ring)
**Source:** `src/lib/shape.ts`
**Apply to:** all 20 files — replace any literal `rounded-[var(--radius-*)]`/`rounded-lg`/`rounded-full` with the matching `shape.field`/`shape.innerCard`/`shape.card`/`shape.pillButton`/`shape.pill`/`shape.ring`/`shape.ringFocus` constant where it's a drop-in match (most already use the underlying CSS var directly — `card.tsx`'s raw `rounded-lg` is the one confirmed literal gap, see Group F).

### `cn()` class-merge (universal, pre-existing, unchanged)
**Source:** `src/lib/utils.ts` (referenced by every file, not itself in scope)
**Apply to:** all 20 files — keep `className={cn("...", className)}` as the merge point; motion/shape additions compose into the same `cn()` call, not a separate style prop, except where an *animated* numeric value (e.g. progress fill `x`) must go through Motion's `animate`/`style` prop instead of a Tailwind class.

### `data-slot` / `data-variant` / `data-size` attribute convention (universal, pre-existing, unchanged)
**Source:** every file in `src/components/ui/*` and `chip.tsx`
**Apply to:** all 20 files — every top-level element already carries `data-slot="<component-name>"`; variant-bearing components carry `data-variant`; size-bearing components carry `data-size`. Preserve verbatim — these are used for CSS targeting and tests; do not rename or drop.

### `"use client"` boundary discipline (universal)
**Source:** `src/lib/use-motion-preset.ts` (client-only hook, split from `src/lib/motion.ts`'s server-safe pure data — see its own file-level comment, "see 09-REVIEW.md WR-03")
**Apply to:** all 20 files — any file importing `useMotionPreset` (client hook) or using `motion.*` JSX (which requires client-side hydration for animation) needs `"use client"` at the top. `card.tsx`, `input.tsx`, `label.tsx`, `separator.tsx` currently have NO `"use client"` directive (they're server-safe today) — adding motion to them (Groups E/F) requires adding the directive. Components already `"use client"` (checkbox, radio-group, switch, dialog, sheet, dropdown-menu, tabs, avatar, sonner, all app-specific files) need no change here.

## No Analog Found

None — every in-scope file resolves to either `chip.tsx` (the Phase 9 template) or a sibling file within its own group. The two components with the weakest match are noted inline above:
- `tabs.tsx` (Group D) — sliding indicator motion is genuinely new geometry (no existing `layoutId`-driven element in the codebase); plan should budget extra time/foundation-module additions here.
- `sonner.tsx` (Group H) — third-party component with no DOM surface for `motion.create()`; re-shape is CSS-var/timing-alignment only, not a structural port.

## Metadata

**Analog search scope:** `src/components/ui/*.tsx`, `src/components/*.tsx` (excluding `upload/` subdir and `icon.tsx`/`icon-data.js`/`embed-provider.tsx`/`theme-provider.tsx`/`motion-config.tsx`, which are out of Phase 10 scope), `src/lib/motion.ts`, `src/lib/use-motion-preset.ts`, `src/lib/shape.ts`.
**Files scanned:** 20 in-scope component files + 3 foundation modules + usage-site grep across `src/app/**` and `src/components/**`.
**Pattern extraction date:** 2026-09-21
**Consumer/blast-radius grep results** (files importing each in-scope component, `@/components/ui/<name>` or `@/components/<name>` form):
- `button`: `src/app/page.tsx`, `src/app/download/page.tsx`, `src/app/upload/page.tsx`, `src/components/file-dropzone.tsx`, `src/components/theme-toggle.tsx`, `src/components/ui/dialog.tsx`
- `input`: `src/app/download/page.tsx`, `src/app/upload/page.tsx`, `src/components/upload/recipient-chip-input.tsx`
- `card`: `src/app/page.tsx`, `src/app/download/page.tsx`, `src/app/upload/page.tsx`
- `dropdown-menu`: `src/components/theme-toggle.tsx`
- `badge`: `src/components/upload/recipient-chip-input.tsx`
- `separator`: `src/app/upload/page.tsx`
- `progress`: `src/app/download/page.tsx`, `src/app/upload/page.tsx`
- `sonner` (Toaster): `src/app/layout.tsx`
- `switch`: `src/app/upload/page.tsx`
- `label`: `src/app/download/page.tsx`, `src/app/upload/page.tsx`
- `dialog`: `src/components/ui/dialog.tsx` self-contained (no external consumer found — scaffold-only, confirm with planner before treating as low priority since Radix Dialog primitive underlies Sheet too)
- `checkbox`, `radio-group`, `sheet`, `tabs`, `avatar`: **zero current consumers** in `src/app`/`src/components` (confirmed via grep) — these are shadcn scaffold components not yet wired into any page; re-shape still required per CONTEXT.md's "EVERY shared and app-specific UI component" scope, but blast radius for regression risk is effectively zero today.
- `chip` (already migrated, reference only): `src/app/page.tsx`, `src/app/download/page.tsx`, `src/app/upload/page.tsx`
- `file-dropzone`: `src/app/upload/page.tsx`
- `app-shell`: `src/app/layout.tsx`
- `mobile-tab-bar`: `src/components/app-shell.tsx`
- `theme-toggle`: `src/components/app-shell.tsx`

All analog paths verified git-tracked via `git ls-files` (no gitignored mirrors in this repo's `.planning` tree).

## PATTERN MAPPING COMPLETE
