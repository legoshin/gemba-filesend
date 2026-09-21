# Phase 9: SmoothUI Foundation - Research

**Researched:** 2026-09-21
**Domain:** React motion/animation library integration (Motion for React) + Tailwind-expressed geometry/shape tokens, on Next.js 16 App Router / React 19
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Library:** SmoothUI (https://smoothui.dev/docs/components) — copy-paste source built on **Motion** (the `motion` package, Framer Motion successor) + Tailwind. Add `motion` as a dependency. GSAP is only needed for specific SmoothUI effects; do NOT add GSAP in this phase unless a concrete Phase 10/11 component requires it — prefer `motion` alone to keep the bundle lean.
- **Keep, don't change:** colour tokens and Public Sans type stay exactly as they are. This phase changes only *shape* (radii/border geometry presets) and introduces *motion* presets. Do not touch `design-system/tokens/colors.css` or type tokens.
- **Shape presets:** define a small, reusable set of SmoothUI-flavoured geometry tokens/utilities (radii scale, border/ring treatment, clip-corner helper) layered on top of the existing Gemba tokens — derive from existing radii where possible; no invented colours.
- **Motion presets:** a single shared module of reusable `motion` transition + variant presets (e.g. entrance/exit, press/tap, hover, list stagger, toast, progress, dropdown/dialog). Components must import these — **no per-component motion magic numbers** (FND-02).
- **Reduced motion (FND-03):** presets must resolve to instant/opacity-only when `prefers-reduced-motion: reduce`. Provide a hook/util (e.g. wrapping `useReducedMotion` from `motion`) and/or CSS fallback so every consumer gets it for free.
- **In place, not parallel:** these utilities restyle the existing shadcn/Radix components in Phase 10; do NOT fork a parallel component kit. Keep Radix behaviour.
- **Docs (DOC-01):** update `design-system/` (e.g. a MOTION/shape doc) recording the new shape + motion language and stating explicitly that colour + type tokens are unchanged.

### Constraints (hard)
- Must not weaken client-side E2E encryption (this phase touches no crypto/network path).
- Must hold web/PWA/TWA parity; respect SSR (Next.js 16 / React 19) — motion presets must be SSR-safe ("use client" where needed).
- Tailwind 4 + existing token pipeline.

### Claude's Discretion
- Final module naming (`src/lib/motion.ts` / `src/lib/shape.ts` suggested, not mandatory).
- Which single existing usage proves the layer works.
- Exact preset inventory shape, as long as FND-01–03 are met.

### Deferred Ideas (OUT OF SCOPE for Phase 9)
- Re-shaping the actual components (forms, buttons, surfaces, feedback, file/list, shell) → Phase 10.
- Page/section entrance motion + scroll progress → Phase 11.
- Cross-platform parity verification + human sign-off → Phase 12.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FND-01 | `motion` dependency installed and available to the web app | See "Standard Stack", "Package Legitimacy Audit" — exact install command, import surface, version, and legitimacy signals |
| FND-02 | Shared shape + motion utility layer (reusable radii/border/shape + reusable transition/variant presets), no per-component magic numbers | See "Architecture Patterns" (Pattern 1–3), "Code Examples" — concrete module shape for `src/lib/motion.ts` and `src/lib/shape.ts`, derived from Gemba's existing radii tokens and verified SmoothUI source |
| FND-03 | All motion respects `prefers-reduced-motion`, degrading to instant/opacity-only | See "Architecture Patterns" (Pattern 2), "Common Pitfalls" (Pitfall 1, 3) — the `useReducedMotion()` + inline-ternary pattern verified across 6 real SmoothUI source files, plus the CSS `motion-reduce:` Tailwind variant for pure-CSS states |
| DOC-01 | `design-system/` documents the new shape + motion language, explicitly stating colour/type unchanged | See "Recommended Project Structure" and the DOC-01 note under "Code Examples" — concrete doc file + required content |
</phase_requirements>

## Summary

This phase adds exactly one runtime dependency — `motion` (npm: `motion`, the maintained successor to `framer-motion`; both packages ship in lockstep at the same version, `13.4.0` as of this research, published 5 days ago) — and two new `src/lib/` modules: a **motion preset module** (transitions + variants, reduced-motion-aware) and a **shape preset module** (radii/border/ring/clip-corner constants expressed as Tailwind class strings). Neither module touches colour or type tokens, storage, crypto, or network code.

The critical verified finding, pulled directly from SmoothUI's real (non-npm, copy-paste) source on GitHub (`educlopez/smoothui`, 977 stars, pushed today): **SmoothUI itself does NOT centralize its motion presets** — every component defines its own local `SPRING` constant inline, duplicated ad hoc across files (a bouncy `{ bounce: 0.1, duration: 0.25, type: "spring" }` recurs in the toggle, toast, dialog panel, animated-list, and button-loading spinner; a stiffer `{ stiffness: 400, damping: 24, duration: 0.2 }` micro-spring is used for the clip-corner hover triangles; a heavier `{ stiffness: 100, damping: 10, mass: 0.75, duration: 0.25 }` spring drives the progress bar fill). Gemba's FND-02 requirement — a **single shared preset module, no per-component magic numbers** — is therefore a deliberate improvement on vanilla SmoothUI's own pattern, not a re-implementation of an existing centralized API. The planner should build the shared module by naming and consolidating these recurring spring "flavors," not by looking for a SmoothUI export to import.

Every real SmoothUI component inspected (`animated-toggle`, `smooth-button`, `animated-progress-bar`, `basic-toast`, `animated-list`, `dialog`) independently implements the identical reduced-motion pattern: call `useReducedMotion()` from `motion/react` once per component, then branch every `animate`/`initial`/`exit`/`transition` prop between the full motion value and a reduced-motion-safe fallback (usually `{ opacity: 1 }` with no transform, and `{ duration: 0 }` for the transition). This is the pattern to centralize into a small set of hook/helper utilities so consuming components stop repeating the ternary.

**Primary recommendation:** Install `motion` (not `framer-motion`) and import from `motion/react`. Build `src/lib/motion.ts` exporting a small set of named `transitions` (spring presets) and `variants` (fade/slide/scale/stagger/toast/dialog entrance-exit) plus one `useReducedMotionSafe()`-style helper that returns pre-resolved, reduced-motion-aware animate/transition props — so components never re-implement the ternary. Build `src/lib/shape.ts` exporting Tailwind class-string constants built on Gemba's *existing* `--radius-*` custom properties (already aliased into Tailwind's own `rounded-*` scale via the `@theme inline` block in `globals.css` — see Pitfall 4) plus the two existing inset-ring box-shadow variables, and a documented (not Tailwind-class) constant set for the clip-corner motif geometry, since that motif is a compound absolutely-positioned-SVG pattern, not a single utility class.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Motion transition/variant presets (`src/lib/motion.ts`) | Browser / Client | — | Pure client-side visual behavior; every consumer is a `"use client"` component. No server involvement. |
| Reduced-motion detection (`useReducedMotion`) | Browser / Client | — | Reads `window.matchMedia('(prefers-reduced-motion: reduce)')` — browser-only API, SSR-safe only via the hook's internal mount-guard. |
| Shape/radii/border presets (`src/lib/shape.ts`) | Browser / Client | Frontend Server (SSR) | Tailwind class strings render identically on server and client (no runtime browser API needed) — safe to import from Server Components too, but in practice will be consumed by the same client UI components as the motion presets. |
| Design system documentation (`design-system/MOTION.md` or similar) | N/A (docs) | — | Static documentation, not runtime code. |
| Package installation (`motion` in `package.json`) | Build tooling | — | npm dependency resolution; no runtime tier. |

**Why this matters for this phase:** every capability in Phase 9 lives in the browser/client tier. There is no API route, no database, no crypto path, and no server-only logic in scope — confirming the CONTEXT.md constraint that this phase "touches no crypto/network path." The plan-checker should flag any task that touches `src/app/api/`, `src/lib/crypto.ts`, `src/lib/storage.ts`, `src/lib/server-storage.ts`, `src/lib/blob-storage.ts`, or `src/lib/redis.ts` as out of scope for this phase.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| `motion` | `13.4.0` [VERIFIED: npm registry — `npm view motion version`, run this session] | Animation engine (springs, variants, `AnimatePresence`, `useReducedMotion`) | Maintained successor to `framer-motion`; both are released in lockstep at identical version numbers and `framer-motion` is now a thin re-export of `motion` under the hood — `motion` is the package to install going forward. SmoothUI itself is "Powered by motion.dev" [CITED: smoothui.dev/docs/components]. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | — | — | No supporting package is needed for Phase 9. `clsx`/`tailwind-merge` (`cn()` in `src/lib/utils.ts`) [VERIFIED: src/lib/utils.ts:1-6 — `import { clsx, type ClassValue } from "clsx"` / `import { twMerge } from "tailwind-merge"` / `export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }`] are already installed and should be reused by `shape.ts` for any class-composition helpers — do not add a second class-merge utility. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `motion` | `framer-motion` | Identical API surface and identical release version (`13.4.0`) as of this research [VERIFIED: npm registry — `npm view framer-motion version` returned `13.4.0`, same as `motion`]. `framer-motion` is the legacy package name; new projects should install `motion` per its own docs. No functional reason to prefer `framer-motion` here. |
| Centralized `src/lib/motion.ts` presets | Copying SmoothUI's own per-component inline `SPRING` constants | Rejected — this is explicitly what FND-02 forbids ("no per-component motion magic numbers"), and it is also not what SmoothUI's real source does (verified: each of 6 inspected components defines its own local spring constant). |
| Tailwind `rounded-*` classes off Gemba's existing `@theme` radii | New bespoke radius tokens for "SmoothUI shape" | Rejected per CONTEXT.md ("derive from existing radii where possible; no invented colours" — extends to no invented radii either). Gemba's `--radius-sm/md/lg/xl/2xl/3xl/4xl` are already aliased into Tailwind's own radius scale (see Pitfall 4) — SmoothUI's shape language (rounded corners, occasional square/pill overrides) maps cleanly onto them without adding anything new. |
| `useReducedMotion()` (from `motion/react`) | Hand-rolled `window.matchMedia` listener | Rejected — `motion/react`'s hook already handles the SSR-safe mount guard and subscription/cleanup; every verified SmoothUI source file uses it instead of a custom listener (see "Don't Hand-Roll"). |

**Installation:**
```bash
npm install motion
```

**Version verification:** confirmed via `npm view motion version` → `13.4.0`, published `2026-09-16T13:10:18Z` (5 days before this research) [VERIFIED: npm registry, run this session]. Peer dependencies: `react: '^18.0.0 || ^19.0.0'`, `react-dom: '^18.0.0 || ^19.0.0'` [VERIFIED: npm registry — `npm view motion peerDependencies`] — compatible with Gemba's installed React `19.2.3` [VERIFIED: package.json — `"react": "19.2.3"`].

## Package Legitimacy Audit

| Package | Registry | Age (latest publish) | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|------|-----------|-------------|---------|-------------|
| `motion` | npm | 5 days (latest patch; package itself has 100+ published versions going back years, including the `framer-motion`-branded lineage) | 15,442,098/week [VERIFIED: npm registry — `package-legitimacy check` signal] | `github.com/motiondivision/motion` [VERIFIED: npm registry — `npm view motion repository.url`] | **SUS** (`reasons: ["too-new"]`) | Flagged — planner must add a `checkpoint:human-verify` task before `npm install motion`, per protocol |

**Why the SUS verdict is very likely a false positive (context for the human-verify checkpoint):** the `package-legitimacy check` heuristic flags packages by *most recent publish date*, not package age. `motion`'s latest version (`13.4.0`) was published 5 days ago, which trips the "too-new" signal — but the package has 15.4M weekly downloads (an install base that cannot exist for a genuinely new/hallucinated package), a confirmed official GitHub organization repo (`motiondivision/motion`), no deprecation flag, and no postinstall script [VERIFIED: npm registry, run this session]. `motion` ships frequent patch releases (dozens of published versions visible in the registry going back to `0.1.0`), which is why "most recent publish" reads as "too-new" even though the package itself is well-established (formerly published as `framer-motion` since 2018, per training-data knowledge — this historical claim is `[ASSUMED]`, not verified this session). The human-verify checkpoint should be a quick sanity check (confirm `npm install motion` resolves cleanly and the version matches this table), not a deep vetting exercise.

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** `motion` — planner inserts a `checkpoint:human-verify` task immediately after the `npm install motion` task, before any code imports it.

## Architecture Patterns

### System Architecture Diagram

```
Developer imports
      │
      ▼
┌─────────────────────────┐     ┌──────────────────────────┐
│  src/lib/motion.ts       │     │  src/lib/shape.ts          │
│  (transitions, variants, │     │  (radii/ring/clip Tailwind │
│   useReducedMotionSafe)  │     │   class-string constants)  │
└───────────┬──────────────┘     └────────────┬──────────────┘
            │  named exports                   │  named exports
            ▼                                  ▼
┌───────────────────────────────────────────────────────────┐
│  Client Component (e.g. src/components/ui/*.tsx,          │
│  "use client" at top)                                     │
│                                                             │
│   import { transitions, variants } from "@/lib/motion"    │
│   import { shape } from "@/lib/shape"                     │
│                                                             │
│   <motion.div                                              │
│     className={cn(shape.card, className)}                 │
│     variants={variants.fadeSlideUp}                        │
│     transition={transitions.snappy}                        │
│   />                                                        │
└───────────────────────────┬───────────────────────────────┘
                             │ rendered client-side
                             ▼
                  ┌───────────────────────┐
                  │ useReducedMotion()      │
                  │ (motion/react, runs in  │
                  │  the browser only)      │
                  └───────────┬─────────────┘
                              │ boolean | null
              ┌───────────────┴────────────────┐
              ▼                                 ▼
   prefers-reduced-motion: reduce    prefers-reduced-motion: no-preference
   → opacity-only / duration:0       → full spring/transform motion
```

No server tier, no data flow beyond "developer imports a preset module into a client component." This is the entire scope of Phase 9.

### Recommended Project Structure
```
src/
├── lib/
│   ├── motion.ts        # NEW — transitions + variants + reduced-motion helper (FND-02, FND-03)
│   ├── shape.ts          # NEW — radii/ring/clip-corner Tailwind class-string constants (FND-02)
│   └── utils.ts           # EXISTING — cn() helper, reused (not duplicated) by shape.ts
design-system/
├── MOTION.md               # NEW — DOC-01: shape + motion language, explicit "colour/type unchanged" statement
└── DESIGN-SYSTEM.md        # EXISTING — add a short pointer to MOTION.md; do not restate colour/type here
```

### Pattern 1: Centralized transition presets, named by feel not by number

**What:** Name spring configs by their *purpose/feel* (what SmoothUI fails to do — it names nothing, just repeats literal objects), so Phase 10/11 components import a name, never a number.

**When to use:** Every animated interaction in Phase 10/11 (press, entrance, toast, dialog, list stagger, progress fill).

**Example** (consolidating the exact spring values verified across 6 SmoothUI source files this session):
```typescript
// src/lib/motion.ts
"use client";

import type { Transition, Variants } from "motion/react";

/**
 * Named transition presets. Values consolidated from SmoothUI's own
 * (uncentralized) per-component spring constants — see RESEARCH.md
 * Pattern 1 for provenance of each value.
 */
export const transitions = {
  // Toggle thumb, toast enter/exit, dialog panel, list item stagger,
  // button loading-spinner — the most common "snappy" UI spring.
  snappy: { type: "spring", bounce: 0.1, duration: 0.25 } as const satisfies Transition,
  // Progress bar fill — heavier, more damped, no bounce.
  fill: { type: "spring", stiffness: 100, damping: 10, mass: 0.75, duration: 0.25 } as const satisfies Transition,
  // Micro hover/press motion (few px of travel) — clip-corner triangles.
  micro: { type: "spring", stiffness: 400, damping: 24, duration: 0.2 } as const satisfies Transition,
  // Backdrop fade (dialog/sheet scrim) — plain tween, no spring.
  backdrop: { duration: 0.2, ease: "easeOut" } as const satisfies Transition,
} as const;
```

### Pattern 2: Reduced-motion-safe variants, resolved once per preset

**What:** Rather than every consuming component re-writing `shouldReduceMotion ? {...} : {...}` inline (as every SmoothUI source file does), export **pairs** of variants — full motion and reduced fallback — and a tiny resolver so components call one function.

**When to use:** Any `motion.*` element driven by `variants` or `animate`.

**Example** (pattern verified directly from `animated-toggle/index.tsx`, `basic-toast/index.tsx`, `animated-list/index.tsx`, `dialog/index.tsx` — all four independently implement this exact ternary shape):
```typescript
// src/lib/motion.ts (continued)
import { useReducedMotion } from "motion/react";

export const variants = {
  fadeSlideUp: {
    full: { initial: { opacity: 0, y: 14, scale: 0.95 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, scale: 0.9 } },
    reduced: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0, transition: { duration: 0 } } },
  },
  toast: {
    full: { initial: { opacity: 0, scale: 0.8, x: 50 }, animate: { opacity: 1, scale: 1, x: 0 }, exit: { opacity: 0, scale: 0.8, x: 50, transition: { duration: 0.15 } } },
    reduced: { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0, transition: { duration: 0 } } },
  },
} as const;

/** Resolve a variants pair + transition against the user's motion preference. */
export function useMotionPreset(preset: { full: object; reduced: object }, transition: Transition) {
  const shouldReduceMotion = useReducedMotion();
  return {
    ...(shouldReduceMotion ? preset.reduced : preset.full),
    transition: shouldReduceMotion ? { duration: 0 } : transition,
  };
}
```
Consumer usage:
```tsx
"use client";
import { motion } from "motion/react";
import { variants, transitions, useMotionPreset } from "@/lib/motion";

function ProofCard() {
  const motionProps = useMotionPreset(variants.fadeSlideUp, transitions.snappy);
  return <motion.div {...motionProps}>...</motion.div>;
}
```

### Pattern 3: Shape presets as Tailwind class-string constants (not new CSS vars)

**What:** Because Gemba's `@theme inline` block already aliases `--radius-sm/md/lg/xl/2xl/3xl/4xl` into Tailwind's own `rounded-*` scale [VERIFIED: src/app/globals.css:44-50 — `--radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px; --radius-xl: 24px; --radius-2xl: 32px; --radius-3xl: 40px; --radius-4xl: 48px;` inside `@theme inline { ... }`], plain Tailwind radius utilities (`rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-full`) already resolve to Gemba's exact design-system values with zero new tokens. `shape.ts` should export these as named, purpose-labeled constants (not new radii) plus the two existing inset-ring shadow variables.

**Example:**
```typescript
// src/lib/shape.ts
/** SmoothUI-flavoured shape presets, derived entirely from existing Gemba
 * radii/ring tokens — no new colour or radius values are introduced.
 * See design-system/tokens/base.css and spacing.css for the source tokens. */
export const shape = {
  field: "rounded-sm",        // 8px  — inputs, square buttons     (--radius-sm)
  innerCard: "rounded-md",    // 12px — inner/nested cards          (--radius-md)
  card: "rounded-lg",         // 16px — cards, chips                (--radius-lg)
  pillButton: "rounded-xl",   // 24px — pill buttons, hero blocks   (--radius-xl)
  pill: "rounded-full",       // full pill (badges, CTAs)
  ring: "shadow-[var(--ring-border)]",        // inset hairline ring
  ringFocus: "focus-visible:shadow-[var(--ring-focus)]", // inset focus ring
} as const;

/** Clip-corner motif geometry (compound pattern — 4 absolutely-positioned
 * corner triangles over a rectangular surface). Not expressible as a single
 * Tailwind class; consumed as constants by the Phase 10 component that
 * implements the motif (verified against SmoothUI's real
 * clip-corners-button source). */
export const clipCorner = {
  triangleSizePx: 8,
  insetPx: 6,       // top-1.5 / left-1.5 (0.375rem)
  hoverMovePx: 4,
} as const;
```

### Anti-Patterns to Avoid

- **Animating a Tailwind class swap for radius changes:** SmoothUI's `animated-toggle` "morph" variant animates border-radius between a pill (`9999`) and a rounded-square (`6`) thumb, and does this via Motion's `animate={{ borderRadius: getThumbBorderRadius() }}` **inline style value**, not by toggling between `rounded-full` and `rounded-md` classes [VERIFIED: GitHub `educlopez/smoothui`, `packages/smoothui/components/animated-toggle/index.tsx`, fetched this session — `getThumbBorderRadius()` returns a number consumed by `motion.span`'s `animate`/`style` props]. Tailwind class swaps do not tween; only Motion-driven inline values do. Any Phase 10 component that needs an *animated* radius change must follow this pattern, not a class-swap.
- **Re-implementing the reduced-motion ternary per component:** every SmoothUI component duplicates `shouldReduceMotion ? X : Y` at each `animate`/`transition` site — exactly what FND-02 exists to prevent. Use `useMotionPreset()` (Pattern 2) instead.
- **Adding GSAP in this phase:** explicitly deferred by CONTEXT.md — only add it in Phase 10/11 if a specific effect genuinely requires it.
- **Building a parallel toast/dialog component:** SmoothUI ships its own `basic-toast` (a `createPortal`-based component, verified source this session) but Gemba already has `sonner` installed [VERIFIED: package.json — `"sonner": "^2.0.7"`] and `src/components/ui/sonner.tsx`. Phase 10 (FDBK-01) re-skins `sonner`'s existing rendering with the shape+motion presets — it does not swap in SmoothUI's toast component.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Detecting `prefers-reduced-motion` | A custom `window.matchMedia('(prefers-reduced-motion: reduce)')` listener with manual mount/cleanup | `useReducedMotion()` from `motion/react` | Already SSR-safe (returns `null` until mount, avoiding hydration mismatch) and already the pattern used in every verified SmoothUI source file. |
| Spring/easing physics | Hand-rolled `requestAnimationFrame` easing curves | Motion's built-in `type: "spring"` transitions (see Pattern 1's named presets) | Motion's spring solver is the entire value proposition of the library; hand-rolling it defeats the point of installing it. |
| List/stagger sequencing | `setTimeout`-based staggered reveals | `AnimatePresence` + per-item `transition.delay` bounded by a max (verified pattern: `Math.min(index * stagger, MAX_STAGGER_DELAY)` in `animated-list/index.tsx`) | Handles interrupt/exit/reorder correctly; a `setTimeout` chain does not. |
| Class-merge utility for shape presets | A second `clsx`/`cn`-alike helper inside `shape.ts` | The existing `cn()` in `src/lib/utils.ts` [VERIFIED: src/lib/utils.ts:1-6] | Gemba's Reuse-First rule and existing convention — one class-merge utility, not two. |

**Key insight:** everything genuinely hard about this domain (spring physics, reduced-motion SSR-safety, exit-animation sequencing) is already solved inside `motion/react` itself. The only real engineering work in this phase is **naming and centralizing** — turning SmoothUI's scattered inline constants into a small, documented, importable vocabulary.

## Common Pitfalls

### Pitfall 1: Reduced-motion checked at render time, not baked into a static export
**What goes wrong:** `useReducedMotion()` is a *hook* — it can only be called inside a component during render, not read once at module scope in `motion.ts`. A naive `shape.ts`/`motion.ts` design that tries to export a single static "resolved" preset object will silently ignore the user's OS setting (it gets evaluated once at import time, server-side or at the wrong time, with no reactivity to a live OS preference change).
**Why it happens:** `motion.ts`/`shape.ts` are meant to be plain, tree-shakeable modules (no "use client" needed for pure objects), but `useReducedMotion()` requires a component render context.
**How to avoid:** keep `transitions`/`variants` as plain, static exports (safe to import anywhere). Put the *hook* (`useMotionPreset` / any wrapper of `useReducedMotion`) in the same file but call it only from inside a component, never at module scope. Mark files that export the hook with `"use client"`.
**Warning signs:** a preset resolves to the same value regardless of the OS "reduce motion" toggle during manual testing.

### Pitfall 2: Missing `"use client"` on the consuming component
**What goes wrong:** Next.js 16 App Router errors or silently no-ops if a Server Component tries to render `motion.div`/use `useReducedMotion()`.
**Why it happens:** `motion/react`'s default export requires the interactivity (event listeners, refs, hooks) that only Client Components can host [CITED: motion.dev/docs/react-installation — "Add `\"use client\"` at the top of the file... to convert importing files to client components"].
**How to avoid:** every file that imports `motion` (the component, not just types) or any hook from `motion/react` needs `"use client"` at the top — matching Gemba's existing convention [VERIFIED: .claude/docs/conventions.md — "Client components marked with `\"use client\"` directive"]. For RSC-heavy trees where you want to avoid the client-boundary cost of a whole file, Motion ships an RSC-safe alternate import — `import * as motion from "motion/react-client"` — which does not force the *importing* file into a client boundary by itself, but the component still only animates once hydrated [CITED: motion.dev/docs/react-installation]. Given this app's UI is already almost entirely client components (theme, dropzone, forms), plain `motion/react` + `"use client"` is simpler and is the recommended default; only reach for `motion/react-client` if a specific Phase 10/11 component is otherwise a Server Component.
**Warning signs:** build/runtime error mentioning hooks used in a Server Component, or a component that never animates.

### Pitfall 3: CSS-only reduced motion (`motion-reduce:`) and JS reduced motion (`useReducedMotion()`) are two different mechanisms — don't rely on only one
**What goes wrong:** SmoothUI's own `smooth-button` component uses the Tailwind **CSS** variant `motion-reduce:transition-none motion-reduce:active:scale-100` for its plain CSS `active:scale-[0.97]` press effect, but uses the **JS** `useReducedMotion()` hook for its `AnimatePresence`-driven loading spinner [VERIFIED: GitHub `educlopez/smoothui`, `packages/smoothui/components/smooth-button/index.tsx`, fetched this session — both `motion-reduce:` Tailwind classes in the `cva` string and a `shouldReduceMotion` check via `useReducedMotion()` are present in the same file]. A module that only wraps `useReducedMotion()` will miss pure-CSS `hover:`/`active:` transitions that never touch `motion/react` at all.
**How to avoid:** document both mechanisms in `design-system/MOTION.md` — (1) any plain CSS `transition`/`transform` utility gets a matching `motion-reduce:` Tailwind variant (built into Tailwind 4, no plugin needed); (2) any `motion.*`-driven animation goes through `useMotionPreset()`/`useReducedMotion()`.
**Warning signs:** a component's `active:scale-*` press effect still visibly scales with OS reduced-motion enabled, even though its `motion.div` entrance animation correctly degrades.

### Pitfall 4: Assuming Gemba's radii need new tokens before checking whether they're already wired
**What goes wrong:** building a parallel `--smoothui-radius-*` token set, duplicating what already exists.
**Why it happens:** it's easy to assume "SmoothUI shape" implies new tokens without checking how Tailwind's radius scale is currently resolved in this app.
**How to avoid:** `src/app/globals.css`'s `@theme inline` block already re-points Tailwind's own `--radius-sm/md/lg/xl/2xl/3xl/4xl` custom properties at Gemba's design-system values [VERIFIED: src/app/globals.css:44-50, quoted verbatim in Pattern 3 above]. Plain `rounded-sm`/`rounded-md`/`rounded-lg`/`rounded-xl` classes already resolve correctly — verify this with a quick visual check before adding any bracket-syntax (`rounded-[var(--radius-lg)]`) or new custom property.
**Warning signs:** a new `--radius-*` variable in `shape.ts`'s CSS that duplicates a value already present in `design-system/tokens/base.css`.

## Code Examples

### Consuming a preset in a "proof" usage (satisfies "imported/used", CONTEXT.md's success-criterion note)
```tsx
// Example candidate: src/components/chip.tsx (low-risk, presentational-only,
// not on the encryption/upload/download critical path, not yet in Phase 10's
// SURF-04 re-shape scope beyond this one entrance-motion wire-up)
"use client";
import { motion } from "motion/react";
import { transitions, variants, useMotionPreset } from "@/lib/motion";

export function Chip({ children, ...props }: ChipProps) {
  const motionProps = useMotionPreset(variants.fadeSlideUp, transitions.snappy);
  return (
    <motion.span {...motionProps} {...props}>
      {children}
    </motion.span>
  );
}
```
Any small, non-critical-path, purely-presentational component works equally well as the "one real usage" — `Chip` is one reasonable, low-risk candidate; the planner may pick another.

### DOC-01: `design-system/MOTION.md` required content
```markdown
# Gemba Shape + Motion (SmoothUI layer)

**Colour and Public Sans type tokens are unchanged by this document.**
See design-system/tokens/colors.css and typography.css — untouched.

## Shape
[table: preset name → Tailwind class → underlying --radius-* value → usage]

## Motion
[table: transition name → spring config → typical usage]
[table: variant name → full/reduced pair → typical usage]

## Reduced motion
Two mechanisms, both required:
1. CSS-only interactions → `motion-reduce:` Tailwind variant
2. `motion/react`-driven animation → `useMotionPreset()` / `useReducedMotion()`
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `framer-motion` as the primary install target | `motion` as the primary install target, with `framer-motion` retained as a compatibility re-export at the same version | Package renamed/restructured by the maintainers (Motion One team merged with Framer Motion) | Both packages are functionally identical at `13.4.0`; `motion` is the forward-looking name and the one CONTEXT.md already locked in. |

**Deprecated/outdated:** none directly relevant — no `deprecated` flag on either package [VERIFIED: npm registry, run this session].

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | `framer-motion` has been published under Framer/Motion One's stewardship since roughly 2018, and `motion` is its 2024-era rename | Standard Stack / Alternatives Considered | Low — purely historical color; does not affect the install command, version, or API guidance, all of which are independently verified this session. |
| A2 | `motion/react-client` is the right escape hatch only for genuine Server Components in Phase 10/11 | Common Pitfalls (Pitfall 2) | Low — if a Phase 10/11 component turns out to need it, the fallback (`"use client"` + `motion/react`) always works; this is a "which import" nuance, not a correctness risk. |
| A3 | `Chip` (or another small presentational component) is a safe "prove the layer" candidate | Code Examples | Low-Medium — the planner should confirm `Chip` isn't already scheduled for different Phase 10 work in a way that would conflict; CONTEXT.md leaves the specific choice at the planner's discretion. |

**If this table is empty:** N/A — see above; all items are low-risk framing notes, not load-bearing technical claims.

## Open Questions

1. **Should `src/lib/motion.ts` export the `variants`/`transitions` as two files or one?**
   - What we know: CONTEXT.md suggests `motion.ts` and `shape.ts` as separate concerns (motion vs. geometry); naming is explicitly left to the planner.
   - What's unclear: whether transitions and variants should further split into `motion-transitions.ts` / `motion-variants.ts` if the combined file grows past Gemba's own file-size convention (200–400 lines typical, 800 max, per user's coding-style rules).
   - Recommendation: start with one `src/lib/motion.ts` file (the full preset inventory sketched above is well under 200 lines); split only if Phase 10/11 additions push it past ~400 lines.

2. **Does the clip-corner motif belong in `shape.ts` at all, given it's a compound component pattern, not a class string?**
   - What we know: verified SmoothUI source shows the clip-corner motif is 4 absolutely-positioned SVG triangles with Motion-driven hover offsets, not a Tailwind utility.
   - What's unclear: whether Phase 9 should export just the geometry *constants* (as sketched in Pattern 3) or defer the whole motif to Phase 10 as a component-level concern.
   - Recommendation: export the constants now (satisfies "reusable... shape tokens" from FND-02 without pre-building the Phase-10-scoped component itself).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `npm install motion` | ✓ | v26.8.1 [VERIFIED: `node --version`, run this session] | — |
| npm | `npm install motion` | ✓ | 11.19.0 [VERIFIED: `npm --version`, run this session] | — |
| Network access to registry.npmjs.org | `npm install motion` | assumed ✓ in CI/dev, not directly probed this session | — | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none — this phase has no external service dependency (no database, no Redis, no third-party API).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|--------------------|
| V2 Authentication | No | Phase touches no auth code. |
| V3 Session Management | No | Phase touches no session code. |
| V4 Access Control | No | Phase touches no access-control code. |
| V5 Input Validation | No | This phase introduces no new user-input handling — `motion.ts`/`shape.ts` export developer-authored constants only; no external or untrusted data flows through them. |
| V6 Cryptography | No | Explicitly out of scope per CONTEXT.md hard constraint ("this phase touches no crypto/network path"); no code in `src/lib/crypto.ts` is touched. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Supply-chain risk from a new npm dependency (`motion`) | Tampering | Package Legitimacy Audit (above) — verified downloads/repo/no-postinstall-script; `checkpoint:human-verify` before install per the SUS verdict. |
| None else applicable | — | This phase has no user-input surface, no auth surface, and no data-handling surface — a genuinely narrow, low-risk phase from a security standpoint. |

## Sources

### Primary (HIGH confidence)
- npm registry — `npm view motion version|peerDependencies|repository.url|deprecated|scripts.postinstall|time.modified`, `npm view framer-motion version` (run this session)
- `gsd_run query package-legitimacy check --ecosystem npm motion` (run this session)
- GitHub `educlopez/smoothui` (977 stars, pushed 2026-09-21) — real source fetched via `gh api` this session for: `packages/smoothui/components/clip-corners-button/index.tsx`, `animated-toggle/index.tsx`, `animated-progress-bar/index.tsx`, `smooth-button/index.tsx`, `basic-toast/index.tsx`, `animated-list/index.tsx`, `dialog/index.tsx` (partial), `skeleton-loader/index.tsx`
- This project: `src/app/globals.css`, `design-system/tokens/base.css`, `design-system/tokens/spacing.css`, `design-system/DESIGN-SYSTEM.md`, `src/lib/utils.ts`, `src/components/ui/button.tsx`, `src/components/theme-toggle.tsx`, `package.json` — all read this session

### Secondary (MEDIUM confidence)
- motion.dev docs — `/docs/react-quick-start`, `/docs/react-installation`, `/docs/react-reduce-bundle-size`, `/docs/react-accessibility` (fetched via WebFetch this session; one code sample on the accessibility page still shows a `from "framer-motion"` import, likely unmigrated docs content — treat `motion/react` as authoritative per the install/quick-start pages)
- smoothui.dev — `/docs/components` (fetched via WebFetch this session; individual component doc pages did not render full source in WebFetch's HTML-to-markdown pass, hence the pivot to the GitHub source repo for concrete code)

### Tertiary (LOW confidence)
- None used for load-bearing claims in this document.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — package version, peer deps, and legitimacy signals independently verified against the npm registry this session.
- Architecture: HIGH — every code pattern (reduced-motion ternary, spring values, shape-token mapping) is sourced from real, currently-live component source files or this project's own already-read source files, not from training-data recall.
- Pitfalls: HIGH — all four pitfalls are grounded in verbatim-quoted source from either this project or the SmoothUI GitHub repo.

**Research date:** 2026-09-21
**Valid until:** 2026-10-21 (30 days — `motion` ships frequent patch releases, but the API surface and reduced-motion pattern verified here are stable; re-verify the exact version before Phase 10/11 kickoff if this window has passed)

## RESEARCH COMPLETE
