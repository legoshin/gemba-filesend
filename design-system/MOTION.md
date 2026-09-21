# Gemba Shape + Motion (SmoothUI layer)

Recorded source of truth for the shape + motion language introduced in Phase 9
(SmoothUI Foundation). Phase 10 (component re-shape) and Phase 11 (page motion)
build on the presets documented here rather than re-deriving spring/radius
values per component.

**Colour tokens and Public Sans type tokens are UNCHANGED by this document
and by this milestone's re-shape.** See `design-system/tokens/colors.css` and
`design-system/tokens/typography.css` — neither file is touched by Phase 9.
Only shape (geometry: radii, rings, clip-corner constants) and motion
(transition/variant presets) are added.

## Shape

Shape presets are Tailwind class-string constants exported from
`src/lib/shape.ts`, derived entirely from the existing `--radius-*`/`--ring-*`
tokens already wired in `src/app/globals.css`'s `@theme inline` block. No new
CSS custom properties or radius values are introduced.

| Preset (`shape.*`) | Tailwind class | Underlying token | Typical usage |
|---|---|---|---|
| `field` | `rounded-[var(--radius-sm)]` | `--radius-sm` (8px) | Inputs, square buttons |
| `innerCard` | `rounded-[var(--radius-md)]` | `--radius-md` (12px) | Inner/nested cards |
| `card` | `rounded-[var(--radius-lg)]` | `--radius-lg` (16px) | Cards, chips |
| `pillButton` | `rounded-[var(--radius-xl)]` | `--radius-xl` (24px) | Pill buttons, hero blocks |
| `pill` | `rounded-full` | (Tailwind `full`) | Full pill (badges, CTAs) |
| `ring` | `shadow-[var(--ring-border)]` | `--ring-border` (`inset 0 0 0 1px var(--border-default)`) | Inset hairline ring |
| `ringFocus` | `focus-visible:shadow-[var(--ring-focus)]` | `--ring-focus` (`inset 0 0 0 2px var(--text-primary)`) | Inset focus ring |

### Clip-corner motif constants

`clipCorner` (also from `src/lib/shape.ts`) holds geometry constants for the
clip-corner compound pattern — four absolutely-positioned corner triangles
over a rectangular surface. This is not expressible as a single Tailwind
class; the constants are consumed by the Phase 10 component that implements
the motif.

| Constant | Value | Meaning |
|---|---|---|
| `triangleSizePx` | `8` | Corner triangle size |
| `insetPx` | `6` | Triangle inset from the surface edge (`top-1.5`/`left-1.5`, 0.375rem) |
| `hoverMovePx` | `4` | Triangle travel distance on hover |

## Motion

All motion is consumed by name from `src/lib/motion.ts` (transition/variant
data, RSC-safe) and `src/lib/use-motion-preset.ts` (the `useMotionPreset`
hook, client-only) — components never inline spring/number literals.

### Transition presets (`transitions.*`)

| Name | Config | Typical usage |
|---|---|---|
| `snappy` | `{ type: "spring", bounce: 0.1, duration: 0.25 }` | Toggle thumb, toast enter/exit, dialog panel, list item stagger, button loading-spinner — the most common "snappy" UI spring |
| `fill` | `{ type: "spring", stiffness: 100, damping: 10, mass: 0.75 }` | Progress bar fill — heavier, more damped, no bounce |
| `micro` | `{ type: "spring", stiffness: 400, damping: 24 }` | Micro hover/press motion (few px of travel) — clip-corner triangles |
| `backdrop` | `{ duration: 0.2, ease: "easeOut" }` | Backdrop fade (dialog/sheet scrim) — plain tween, no spring |

`fill` and `micro` are physics-only springs (`stiffness`/`damping`/`mass`, no
`duration`) — Motion's spring resolver ignores `duration` whenever physics
keys are present, so declaring both is dead configuration; the settle time
is governed entirely by the physics values.

### Variant pairs (`variants.*`)

Every variant is a `{ full, reduced }` pair — `full` is the real motion,
`reduced` degrades to opacity-only/zero-duration (see Reduced motion below).

| Name | Full → Reduced | Typical usage |
|---|---|---|
| `fadeSlideUp` | Fade + rise (`y`, `scale`) → opacity-only | Entrance/exit for cards, panels (proven via `chip.tsx`) |
| `scaleIn` | Fade + scale (no lateral travel) → opacity-only | Dropdown/dialog panels |
| `tapPress` | `whileTap: { scale: 0.97 }` → `whileTap: {}` | Press feedback |
| `hover` | `whileHover: { scale: 1.02 }` → `whileHover: {}` | Hover feedback |
| `stagger` | Fade + rise per item → opacity-only | List item entrance inside a staggered container (the container itself sets `transition: { ...transitions.snappy, staggerChildren: N }` on its own `animate` prop) |
| `toast` | Fade + scale + lateral slide → opacity-only | Toast enter/exit |
| `progress` | Fade + scale reveal → opacity-only | Progress bar container reveal (paired with `transitions.fill`; the live fill amount itself is a Phase 10/11 consumer concern, not part of this preset) |
| `menu` | Fade + scale + vertical offset → opacity-only | Dropdown/dialog open-close |

### Resolving a preset

- `resolveMotionPreset(preset, transition, shouldReduceMotion)` (`src/lib/motion.ts`) — pure function, no hook call inside, unit-testable without a React render, import-safe from Server Components.
- `useMotionPreset(preset, transition)` (`src/lib/use-motion-preset.ts`, `"use client"`) — hook wrapper; calls `useReducedMotion()` internally and resolves against the live user preference. Kept in its own client-only module so importing `transitions`/`variants`/`resolveMotionPreset` from `src/lib/motion.ts` never forces a client boundary.

## Reduced motion

Two mechanisms are required — a module that implements only one will miss
real interactions:

1. **CSS-only interactions** (plain `transition`/`transform` Tailwind
   utilities that never touch `motion/react`, e.g. `hover:`/`active:` state
   changes) — pair every such utility with the Tailwind `motion-reduce:`
   variant (built into Tailwind 4, no plugin needed).
2. **`motion/react`-driven animation** — resolved through
   `useMotionPreset()`/`useReducedMotion()` from `src/lib/motion.ts`. As a
   belt-and-suspenders app-wide default, `src/components/motion-config.tsx`
   mounts `<MotionConfig reducedMotion="user">` at the app root
   (`src/app/layout.tsx`), so any `motion.*` element respects the OS
   preference even if a consumer forgets to call `useMotionPreset()`
   explicitly.

A component's `active:scale-*`/`hover:` press effect that still visibly
animates with OS reduced-motion enabled — even though its `motion.div`
entrance animation correctly degrades — is the warning sign that mechanism
(1) was skipped.
