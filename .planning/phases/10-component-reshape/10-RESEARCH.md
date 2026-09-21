# Phase 10: Component Re-shape - Research

**Researched:** 2026-09-21
**Domain:** Restyling existing Radix/shadcn React components in place with `motion/react` presets + Tailwind shape tokens (Next.js 16 App Router / React 19), sourced against real SmoothUI (`educlopez/smoothui`) component code
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Reuse Phase 9 foundation, no new magic numbers.** Every component draws its motion from the centralized presets in `src/lib/motion.ts` (`resolveMotionPreset`/`useMotionPreset`, transitions snappy/fill/micro/backdrop, the 8 variant pairs) and its geometry from `src/lib/shape.ts` (radii/ring/clip presets). If a component needs a motion/shape flavor not yet in the foundation, ADD it to the foundation module (and update `design-system/MOTION.md`), do NOT inline it locally.
- **In place on Radix.** Restyle `src/components/ui/*` (shadcn/Radix) and app-specific `src/components/*` — do NOT fork a parallel kit. Preserve every Radix primitive's behaviour, keyboard interaction, focus management, and ARIA. Motion wraps/decorates; it must not remove Radix functionality.
- **Keep colours + Public Sans type unchanged.** Only shape (radii/border/clip geometry) and motion change. No edits to `design-system/tokens/colors.css` or type tokens; keep using the existing semantic colour aliases.
- **Reduced motion.** Every animated component degrades correctly under `prefers-reduced-motion` for free by using the Phase 9 presets / `useMotionPreset` (never raw inline animate props with hardcoded values).
- **SSR/RSC safe.** Next 16 / React 19: `"use client"` only where motion hooks/state require it; keep server-safe imports server-safe. Import the client hook from `src/lib/use-motion-preset.ts`, pure data/`resolveMotionPreset` from `src/lib/motion.ts`.
- **Theming intact.** Light/dark/system must still render correctly on every re-shaped component.
- **Encryption boundary untouched.** The file-dropzone re-shape (FILE-01) is presentational only — do NOT change encryption/upload/download logic or the client-side key handling; keep the live encryption-progress + multi-file behaviour working.

### Component → SmoothUI analog map (from CONTEXT.md, refined below with verified source)
- Forms: `input.tsx` → Animated Input; `checkbox.tsx` → Checkbox; `radio-group.tsx` → Radio Group; `switch.tsx` → Animated Toggle; `label.tsx` → consistent shape/focus.
- Buttons: `button.tsx` → Smooth Button / Clip-Corners Button geometry + press/hover motion, preserving ALL existing ranks/variants/sizes.
- Surfaces: `card.tsx` → card entrance/hover; `dialog.tsx` + `sheet.tsx` → SmoothUI Dialog/Drawer open-close motion (Radix focus-trap kept); `dropdown-menu.tsx` → dropdown motion; `tabs.tsx` → Animated Tabs indicator; `badge.tsx`+app `chip.tsx` → SmoothUI badge/chip; `avatar.tsx`; `separator.tsx`.
- Feedback: `sonner.tsx` (toasts) → Basic Toast enter/exit; `progress.tsx` → Animated Progress Bar; a SmoothUI skeleton/loading treatment where loading states exist.
- File/list: app `file-dropzone.tsx` → Animated File Upload (drag/drop motion, keep encryption progress + multi-file); selected-file / share-result rows → Animated List add/remove.
- Shell: app `app-shell.tsx` (sidebar) + `mobile-tab-bar.tsx` → SmoothUI navigation motion/geometry; `theme-toggle.tsx` → SmoothUI Animated Theme Toggle keeping 3-way light/dark/system.

### Constraints (hard)
No colour/type token changes; no crypto/network/upload/download logic changes; SSR-safe; reduced-motion honored; Radix a11y preserved; `npm run build` + `npm test` + `tsc` stay green.

### Claude's Discretion
- Exact foundation additions needed (this research names them explicitly below).
- Whether to reuse an existing preset vs. add a new one, subject to the "no magic numbers" rule.
- Tracer component choice for the coarse-wave plan.

### Deferred Ideas (OUT OF SCOPE for Phase 10)
- Page/section entrance motion + scroll progress (MOT-01/MOT-02) → Phase 11.
- Cross-platform (web/PWA/TWA) + theming + encryption parity verification + human sign-off → Phase 12.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FORM-01 | Input re-shaped to SmoothUI geometry + focus/label motion, Radix/validation preserved | See Component Map row "Input"; new `variants.focusPop` (Foundation Additions); Code Examples "Input" |
| FORM-02 | Checkbox/RadioGroup re-shaped to SmoothUI geometry + check/select motion, a11y preserved | Component Map rows "Checkbox"/"RadioGroup"; Code Examples "Checkbox", "RadioGroup" |
| FORM-03 | Switch/Toggle re-shaped to SmoothUI animated-toggle geometry + motion | Component Map row "Switch"; Pattern 4 (direct state-driven animate); Code Examples "Switch" |
| FORM-04 | Label + field grouping/hint styling matches re-shaped controls | Component Map row "Label" (shape-only, no motion) |
| BTN-01 | Buttons re-shaped to SmoothUI geometry + press/hover motion, all ranks/sizes preserved | Component Map row "Button"; `chip.tsx` precedent already proves the pattern; Code Examples "Button" |
| SURF-01 | Card re-shaped to SmoothUI geometry + entrance/hover motion | Component Map row "Card"; Code Examples "Card" |
| SURF-02 | Dialog + Sheet re-shaped to SmoothUI geometry + open/close motion, focus-trap preserved | Pattern 2 (Radix + AnimatePresence + forceMount); Code Examples "Dialog" (near-complete), "Sheet" (near-complete); Common Pitfall 1 |
| SURF-03 | Dropdown-menu + Tabs re-shaped to SmoothUI geometry + motion (animated indicator) | Component Map rows "DropdownMenu"/"Tabs"; Code Examples "Tabs" (near-complete), "DropdownMenu" |
| SURF-04 | Badge/Chip, Avatar, Separator re-shaped to SmoothUI geometry | Component Map rows "Badge", "Avatar", "Separator" |
| FDBK-01 | Toasts (sonner) re-shaped to SmoothUI toast geometry + enter/exit motion | Common Pitfall 2 (sonner is CSS-driven, not Motion-driven — verified from sonner source); Code Examples "Toast/Sonner" (near-complete) |
| FDBK-02 | Progress bar re-shaped to SmoothUI animated progress geometry + motion | Component Map row "Progress"; Common Pitfall 5 (spring lag on rapid value updates — grounded in live encryption-progress consumer); Code Examples "Progress" |
| FDBK-03 | SmoothUI-style skeleton/loading treatment on loading states | Component Map row "Skeleton"; Code Examples "Skeleton" |
| FILE-01 | File-dropzone re-shaped to SmoothUI animated-file-upload geometry + drag/drop motion, encryption/multi-file preserved | Pattern 3 (presentational-only wrap); Code Examples "FileDropzone" (near-complete) |
| FILE-02 | Selected-file/share-result rows use SmoothUI animated-list geometry + add/remove motion | Component Map row "List rows"; Code Examples "List rows" |
| SHELL-01 | App-shell/sidebar + mobile-tab-bar re-shaped to SmoothUI geometry + navigation motion | Component Map row "AppShell nav"; Common Pitfall 6 (why NOT SmoothUI's Dock); Code Examples "Nav active-indicator" |
| SHELL-02 | Theme-toggle re-shaped to SmoothUI animated theme-toggle, 3-way control kept | Component Map row "ThemeToggle"; Code Examples "ThemeToggle" |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Both the user's global `~/.claude/CLAUDE.md` and the project's `/Users/lego/dev/gemba-filesend/CLAUDE.md` apply. Directives relevant to this phase's planning and execution:

- **GSD-only workflow.** All work goes through `/gsd-plan-phase` → `/gsd-execute-phase`; no direct edits outside the GSD flow. (Process constraint, not a code constraint — flagged for the executor, not the planner's task content.)
- **Design fidelity (project CLAUDE.md).** Only use tokens defined in `design-system/tokens/`; derive from the nearest token when a value isn't covered. This phase's motion/shape values must resolve to Phase 9's already-token-derived `src/lib/shape.ts`/`src/lib/motion.ts` exports — no new colour, spacing, or radius values invented ad hoc.
- **Tech stack.** Stay on Next.js 16 / React 19 / Tailwind 4; reuse the existing shadcn/Radix component layer — no parallel UI kit. Confirmed no new packages are needed this phase (see Standard Stack).
- **Encryption boundary.** Redesign/hardening must not weaken the client-side-encryption model. FILE-01 and FDBK-02 (progress bar) both sit adjacent to the live encryption/upload/download data path — verified in-repo (`src/app/upload/page.tsx:799`, `src/app/download/page.tsx:836`) that `Progress value=` is driven directly by `uploadProgress`/`progress` state. Motion wraps the *presentation* of that value only; the state and its producers are out of scope.
- **Platform parity.** Theme + logos must keep rendering correctly across web/PWA/TWA (verified in Phase 12, not blocked here, but no component change here should assume a browser API unavailable in a TWA WebView — `motion/react`'s `useReducedMotion` and `AnimatePresence` are already proven safe there by Phase 9).
- **Reuse-First (global CLAUDE.md, hard rule).** Before adding any new preset/helper, search `src/lib/motion.ts`/`src/lib/shape.ts` first. This research explicitly minimizes new foundation additions (2 net-new exports; see Foundation Additions Needed) by reusing existing named presets (`variants.scaleIn`, `variants.stagger`, `variants.menu`, `transitions.snappy/micro/fill/backdrop`) everywhere they fit, following `chip.tsx`'s already-migrated pattern as the reference.
- **Surgical changes.** Every changed line in a component file should trace to the shape/motion re-skin — do not refactor unrelated markup, do not rename props, do not touch business logic (`file-dropzone.tsx`'s drag/drop/encryption handlers, `app-shell.tsx`'s embed-mode logic, etc.).
- **TypeScript conventions.** Explicit types on exported component props (already the existing convention in every file read this session); avoid `any`; prefer `interface` for prop shapes matching the existing style in `chip.tsx`/`button.tsx`.
- **Context discipline.** This research was produced by reading full source files directly (not summarizing from memory) — every code claim below cites the exact file and, where a snippet is shown, is grounded in either this project's own already-read files or SmoothUI source fetched via `gh api` this session.

## Summary

Phase 9 already built the entire foundation this phase needs: `src/lib/motion.ts` (`transitions.snappy/fill/micro/backdrop`, 8 named `variants` pairs, `resolveMotionPreset`), `src/lib/use-motion-preset.ts` (`useMotionPreset` hook), `src/lib/shape.ts` (`shape.field/innerCard/card/pillButton/pill/ring/ringFocus`, `clipCorner`), and one proven consumer (`src/components/chip.tsx`, which wraps a Radix `Slot`/`span` in `motion.create(...)` hoisted to module scope and calls `useMotionPreset(variants.fadeSlideUp, transitions.snappy)`). Phase 10's job is almost entirely **pattern replication**: apply the exact same `motion.create(...)`-hoisted-at-module-scope + `useMotionPreset(...)` shape to every remaining `src/components/ui/*.tsx` and `src/components/*.tsx` file, using whichever existing preset name best matches the interaction (a hover/press → `variants.tapPress`/`hover`; a fade-scale reveal → `variants.scaleIn`; a fade-rise entrance/list item → `variants.fadeSlideUp`/`stagger`; a dropdown/dialog open-close → `variants.menu`; a progress reveal → `variants.progress` + `transitions.fill`).

Real SmoothUI source, fetched this session from `github.com/educlopez/smoothui` for the 11 highest-risk components (`animated-input`, `checkbox`, `radio-group`, `animated-toggle`, `dialog`, `drawer`, `animated-tabs`, `animated-file-upload`, `animated-list`, `theme-toggle`, `skeleton-loader`), confirms a consistent architecture across every one of them: **the Radix primitive (or native element) is kept exactly as-is; only the visual layer is swapped for a `motion.*` element, driven by a local `useReducedMotion()` check.** None of the fetched source replaces Radix's state management, keyboard handling, or ARIA attributes — this directly validates CONTEXT.md's "restyle in place" constraint as achievable, not aspirational.

Two genuine gaps exist in the Phase 9 foundation and must be added before/during the forms and surfaces waves: (1) `variants.focusPop` — Input's floating-label/border-glow motion has no existing analog (SmoothUI's `AnimatedInput` uses a floating-label pattern Gemba's `Input`+external `Label` markup doesn't have; the closer-fidelity, non-invasive alternative is a focus-driven scale/ring-intensify pop, which needs a new named variant); (2) a `getSlideOffset(side)` helper (a pure function, not a hardcoded value — same "structural constant" pattern already established by `clipCorner`) for Sheet's 4-directional slide, since none of the 8 existing variant pairs encode direction. Every other component maps cleanly onto an existing preset — see the Component → Approach Map below for the full per-component breakdown, including three components with **zero live consumers in the app today** (`Tabs`, `Sheet`, `Avatar` — verified via repo-wide grep this session), which changes their risk profile (no visual regression surface, but also no tracer-page to prove the reshape works without a throwaway test render).

One load-bearing correction to a plausible but wrong assumption: **`sonner` (the toast library already installed, v2.0.7) is not built on `motion/react` — it renders and animates its own DOM via hand-written CSS transitions/keyframes**, verified by reading `emilkowalski/sonner`'s actual `src/styles.css` this session. `[data-sonner-toast]` elements cannot be wrapped in `motion.*` without switching every `toast()` call site to `toast.custom()` (a much larger, out-of-scope change). FDBK-01 must be satisfied by CSS-level restyling (`toastOptions.classNames` + Tailwind, `!important` required per sonner's own docs) plus verifying sonner's built-in `@media (prefers-reduced-motion)` block already covers FND-03's requirement for toasts — it does, verified at `styles.css:708-711`.

**Primary recommendation:** Treat `src/components/chip.tsx` as the literal template for every remaining component — same `motion.create(...)` hoist-to-module-scope discipline, same `useMotionPreset(variants.X, transitions.Y)` call — and only reach for the two new foundation additions where a component's interaction genuinely has no existing analog (Input focus, Sheet direction). Recommended tracer for the coarse-wave plan: **`Button`** (BTN-01) — it has the most call sites of any UI primitive (used on every page, in Dialog's footer, in AppShell/MobileTabBar), a fully verified real SmoothUI source pattern already partially digested in Phase 9 (`smooth-button`/`clip-corners-button`), and zero Radix-a11y risk (native `<button>`/`Slot`, no focus-trap, no portal) — proving the foundation composes correctly before fanning out into the riskier Radix-portal components (Dialog, Sheet, DropdownMenu).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| All re-shaped `src/components/ui/*` primitives | Browser / Client | — | Every file is (or becomes) a `"use client"` component; `motion.*` and `useReducedMotion`/`useMotionPreset` are browser-only. |
| App-specific components (`file-dropzone`, `app-shell`, `mobile-tab-bar`, `theme-toggle`) | Browser / Client | — | Same — all already `"use client"`, all presentational wrapping only. |
| `sonner`/Toaster re-skin | Browser / Client | — | Sonner's own CSS-driven animation layer; no server involvement. |
| Foundation additions (`variants.focusPop`, `getSlideOffset`) in `src/lib/motion.ts` | Browser / Client | Build tooling (pure module, SSR-import-safe) | Pure data/functions, same tier split Phase 9 already established (`resolveMotionPreset` import-safe from Server Components; the *hook* stays client-only). |
| Live encryption-progress state (`uploadProgress`/`progress` in `upload/page.tsx`, `download/page.tsx`) | Browser / Client (existing, untouched) | — | Out of scope — Phase 10 only re-skins the `<Progress>` *presentation*; the state producer (crypto/streaming logic) is not touched. |

**Why this matters for this phase:** identical to Phase 9 — every capability in scope lives in the browser/client tier, confirming CONTEXT.md's "encryption boundary untouched" constraint holds structurally, not just by convention. The plan-checker should flag any task that edits `src/lib/crypto.ts`, `src/lib/storage.ts`, `src/lib/server-storage.ts`, `src/lib/blob-storage.ts`, `src/lib/redis.ts`, or the state-management blocks inside `upload/page.tsx`/`download/page.tsx` (as opposed to their JSX render of `<Progress>`) as out of scope.

## Standard Stack

### Core

No new runtime dependency is required for this phase — confirmed by reading `package.json` this session: `motion` (`^13.4.0`), `radix-ui` (`^1.4.3`), `sonner` (`^2.0.7`), `class-variance-authority` (`^0.7.1`), `lucide-react` (`^0.575.0`), `next-themes` (`^0.4.6`) are all already installed [VERIFIED: package.json, read this session]. Phase 10 is a pure consumption phase against the Phase 9 foundation plus these already-installed libraries.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | — | — | See above — no install step in this phase. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Re-skinning Radix `Dialog`/`Sheet` with `AnimatePresence`+`forceMount` | Keep the existing `tailwindcss-animate`/CSS `data-[state=open]:animate-in` classes, only change shape | Rejected as the *primary* path because CONTEXT.md's SURF-02 explicitly asks for "SmoothUI open/close motion" (the spring-bounce feel, not just a fade/zoom), and the verified SmoothUI `dialog`/`drawer` source uses exactly this Motion+`forceMount` pattern. Kept as the documented **fallback** (see Common Pitfall 1) if `forceMount` proves too invasive for a given call site. |
| Porting SmoothUI's `theme-toggle` "sun-moon" variant wholesale | Wrap the *existing* Sun/Moon `Icon` swap (already CSS `rotate/scale` in `theme-toggle.tsx`) in `motion.span` + `AnimatePresence` using the already-existing `variants.scaleIn` | Recommended — avoids introducing SmoothUI's much larger `theme-toggle/index.tsx` (858 lines, 4 variants, not Radix-based) as a parallel component; Gemba's toggle is a `DropdownMenu`-driven 3-way control today and CONTEXT.md requires keeping that exact control, just re-skinning the trigger icon's motion. |
| Building `variants.listItem` for FILE-02's animated-list receding effect | Reuse `variants.stagger` (already named for "list item entrance for a staggered container") | Recommended reuse — SmoothUI's own `animated-list` uses a receding-opacity/scale effect keyed by index that has no Gemba equivalent yet, but Gemba's Reuse-First rule + Phase 9's own IN-02 review note ("preset-composition footgun") argue against adding a near-duplicate preset for a cosmetic difference. Flagged as an Open Question if exact parity is desired later. |
| SmoothUI's `dock`/`floating-navbar` components for `app-shell`/`mobile-tab-bar` | Reuse the already-verified `layoutId` sliding-indicator pattern from `animated-tabs` | Rejected `dock` — it's a macOS-dock-style pointer-magnification effect (597-line source, `useSpring`/`useTransform`/pointer-distance math) built for icon-heavy launchers, not a 3-link app nav; wrong analog for SHELL-01. `animated-tabs`'s `layoutId` active-indicator is the correct, much simpler pattern for a nav with a small fixed link set. |

**Installation:** none required.

## Package Legitimacy Audit

No external packages are installed in this phase — all libraries consumed (`motion`, `radix-ui`, `sonner`, `class-variance-authority`, `lucide-react`) were already verified and installed in Phase 9 or earlier. Package Legitimacy Gate is not applicable.

**Packages removed due to [SLOP] verdict:** none — no packages evaluated.
**Packages flagged as suspicious [SUS]:** none.

## Component → Approach Map

Every in-scope component, its verified SmoothUI analog (or explicit "no direct analog" call), the concrete motion approach, which existing presets it draws from, and any foundation addition required.

| Component (file) | Requirement | SmoothUI analog (source verified this session) | Motion approach | Presets used | Foundation addition |
|---|---|---|---|---|---|
| `ui/input.tsx` | FORM-01 | Animated Input — `packages/smoothui/components/animated-input/index.tsx` | Keep native `<input>` + separate `<Label>` (do NOT adopt SmoothUI's floating-label markup — it doesn't match Gemba's field/label association pattern). Add `whileFocus` motion via a hoisted `motion.create("input")` | **NEW** `variants.focusPop` + `transitions.micro` | ADD `variants.focusPop` |
| `ui/checkbox.tsx` | FORM-02 | Checkbox — `.../checkbox/index.tsx` | Keep `CheckboxPrimitive.Root`/`Indicator` (`forceMount`); swap the static `CheckIcon` for a `motion.svg` + `motion.path` with `pathLength` draw-on, `AnimatePresence mode="wait"` | `variants.scaleIn` (icon reveal) + `transitions.snappy`; `pathLength` is inline/structural (Pattern 4) | none |
| `ui/radio-group.tsx` | FORM-02 | Radio Group — `.../radio-group/index.tsx` | Keep `RadioGroupPrimitive.Item`/`Indicator`; dot becomes `motion.span` scale-in; item wrapper gets optional stagger entrance | `variants.scaleIn` (dot) + `variants.stagger` (optional group entrance) + `transitions.snappy` | none |
| `ui/switch.tsx` | FORM-03 | Animated Toggle — `.../animated-toggle/index.tsx` | Keep `SwitchPrimitive.Root`/`Thumb`; thumb becomes `motion.span` animating `x`/`borderRadius` directly off `data-state` (two-state, not enter/exit — Pattern 4) | `transitions.snappy` (direct) | none |
| `ui/label.tsx` | FORM-04 | (shape-only, no analog) | No motion; align spacing/shape tokens only | n/a | none |
| `ui/button.tsx` | BTN-01 | Smooth Button / Clip-Corners Button (verified Phase 9: `packages/smoothui/components/smooth-button/index.tsx`, `clip-corners-button/index.tsx`) | Same `motion.create(Slot.Root)` hoist as `chip.tsx`; `whileTap`/`whileHover` per variant | `variants.tapPress` + `variants.hover` + `transitions.micro` | none |
| `ui/card.tsx` | SURF-01 | (no direct analog — generic glass/tilt-card family exists but is overkill) | `motion.div` entrance (`variants.fadeSlideUp`) + optional `variants.hover` lift on interactive cards only | `variants.fadeSlideUp` + `variants.hover` + `transitions.snappy` | none |
| `ui/dialog.tsx` | SURF-02 | Dialog — `.../dialog/index.tsx` (full open/close, `forceMount`+`AnimatePresence`, verified) | Restructure `Dialog`/`DialogContent` to own the resolved `open` boolean and drive `AnimatePresence`+`forceMount` on `Portal`/`Overlay`/`Content` (see Pattern 2 and Code Examples) | `variants.scaleIn` (panel) + `transitions.backdrop` (overlay) + `transitions.snappy` (panel) | none |
| `ui/sheet.tsx` | SURF-02 | Drawer — `.../drawer/index.tsx` (verified; wraps vaul, N/A here — Gemba's Sheet is Radix `Dialog`, not vaul) | Same `forceMount`+`AnimatePresence` restructure as Dialog, but panel transform is per-`side` | `transitions.backdrop` (overlay) + `transitions.snappy` (panel) + **NEW** `getSlideOffset(side)` | ADD `getSlideOffset(side)` helper |
| `ui/dropdown-menu.tsx` | SURF-03 | (menu variant already named for exactly this in Phase 9) | `DropdownMenuPrimitive.Content` → `forceMount` + `AnimatePresence`, `motion.div` wrapper reading Radix's `data-side`/`data-state` | `variants.menu` (already documented "Dropdown/dialog open-close") + `transitions.snappy` | none |
| `ui/tabs.tsx` | SURF-03 | Animated Tabs — `.../animated-tabs/index.tsx` (verified `layoutId` indicator pattern) | Replace the CSS `after:` pseudo-element active-indicator with a `motion.span` using `layout`+`layoutId`, rendered only inside the active trigger | `transitions.snappy` (direct, layout-animated) | none |
| `ui/badge.tsx` | SURF-04 | (no direct analog; `chip.tsx` already migrated — mirror it exactly) | Identical `motion.create(Slot.Root)` hoist + `useMotionPreset` pattern as `chip.tsx` | `variants.fadeSlideUp` + `transitions.snappy` | none |
| `ui/avatar.tsx` | SURF-04 | `animated-avatar-group` exists in SmoothUI's catalog but wasn't fetched (low motion need, zero live consumers today) | Optional fade-in via `AvatarPrimitive.Image`'s `onLoadingStatusChange` gating a `motion.div` | `variants.fadeSlideUp` | none |
| `ui/separator.tsx` | SURF-04 | (shape-only) | No motion; radii/shape only | n/a | none |
| `ui/progress.tsx` | FDBK-02 | Animated Progress Bar (verified Phase 9: `.../animated-progress-bar/index.tsx`; `transitions.fill`+`variants.progress` already named for it) | `ProgressPrimitive.Indicator` becomes `motion.div` animating `scaleX`/`translateX` toward `value`; container reveal on mount | `variants.progress` (container) + `transitions.fill` (bar) | none |
| `ui/sonner.tsx` | FDBK-01 | Basic Toast (Phase 9 sourced `transitions.snappy`+`variants.toast` from its constants) — but see Common Pitfall 2: sonner itself is CSS-driven | Restyle via `toastOptions.classNames` (Tailwind, needs `!important`) using `shape.card`/`shape.ring`; do NOT wrap in `motion.*` | n/a (CSS-level; sonner's own `@media (prefers-reduced-motion)` already covers FND-03) | none |
| Skeleton/loading treatment | FDBK-03 | Skeleton Loader — `.../skeleton-loader/index.tsx` (verified — itself pure CSS `animate-pulse`, no `motion.*` at all) | New tiny presentational component/utility using Tailwind `animate-pulse` + `shape.innerCard`, paired with `motion-reduce:animate-none` | n/a (pure CSS, mechanism 1 from Phase 9 Pitfall 3) | none |
| `file-dropzone.tsx` | FILE-01 | Animated File Upload — `.../animated-file-upload/index.tsx` (verified, full source) | Wrap the existing `<label>` root in a hoisted `motion.create("label")`; drag-state scale via direct `animate` (Pattern 4); file rows wrapped in `AnimatePresence`+`variants.stagger`. Zero changes to `handleDrag*`/`handleDrop`/`filterBySize`/state | `variants.stagger` (rows) + `transitions.micro`/`snappy` (direct, dropzone scale) | none |
| Selected-file / share-result rows | FILE-02 | Animated List — `.../animated-list/index.tsx` (verified) | `AnimatePresence mode="popLayout"` + `layout` prop on each row + `variants.stagger` for enter/exit | `variants.stagger` + `transitions.snappy` | none (see Alternatives Considered re: `variants.listItem`) |
| `app-shell.tsx` nav + `mobile-tab-bar.tsx` | SHELL-01 | NOT `dock` (see Alternatives Considered) — reuse `animated-tabs`'s `layoutId` pattern | Active-link indicator becomes a `motion.span` with shared `layoutId` across desktop nav and (separately) the mobile tab bar | `transitions.snappy` (direct, layout-animated) | none |
| `theme-toggle.tsx` | SHELL-02 | Theme Toggle "sun-moon" variant — `.../theme-toggle/index.tsx` (verified `showSystem`/3-way + icon-crossfade pattern) | Keep the existing `DropdownMenu`-based 3-way control exactly; wrap the Sun/Moon `Icon` swap in `AnimatePresence mode="wait"` + `motion.span` | `variants.scaleIn` + `transitions.snappy` | none |

### Foundation Additions Needed (add to `src/lib/motion.ts` + `design-system/MOTION.md` before/during the relevant wave)

1. **`variants.focusPop`** — a new `{full, reduced}` pair for Input's focus motion (FORM-01). No existing pair fits: `hover`/`tapPress` are pointer-only (no `whileFocus` equivalent exists yet), and `scaleIn` is an enter/exit pair, not a `whileFocus` state pair.
   ```typescript
   // src/lib/motion.ts — ADD to `variants`
   focusPop: {
     full: { whileFocus: { scale: 1.01 } },
     reduced: { whileFocus: {} },
   },
   ```
2. **`getSlideOffset(side)`** — a pure function (not a magic number — same category as the already-accepted `clipCorner` structural constants) returning the off-screen `{ x, y }` transform for Sheet's 4 directions, consumed by `motion.div`'s `initial`/`exit`.
   ```typescript
   // src/lib/motion.ts — ADD
   export function getSlideOffset(side: "top" | "right" | "bottom" | "left") {
     switch (side) {
       case "top": return { x: 0, y: "-100%" };
       case "bottom": return { x: 0, y: "100%" };
       case "left": return { x: "-100%", y: 0 };
       case "right": return { x: "100%", y: 0 };
     }
   }
   ```
   Both additions must be documented in `design-system/MOTION.md`'s existing tables (new row in "Variant pairs" for #1; a new small "Helper functions" subsection for #2), per CONTEXT.md's "ADD it to the foundation module ... do NOT inline it locally."

No other component in this phase requires a new preset — every remaining interaction is covered by `snappy`/`fill`/`micro`/`backdrop` and `fadeSlideUp`/`scaleIn`/`tapPress`/`hover`/`stagger`/`toast`/`progress`/`menu`.

## Architecture Patterns

### System Architecture Diagram

```
Existing Radix/shadcn component (behaviour + a11y, UNCHANGED)
      │
      ▼
┌──────────────────────────────────────────────────────────────┐
│  Component file (e.g. src/components/ui/button.tsx)            │
│                                                                   │
│  1. import { transitions, variants } from "@/lib/motion"        │
│  2. import { useMotionPreset } from "@/lib/use-motion-preset"   │
│  3. import { shape } from "@/lib/shape"                         │
│  4. const MotionX = motion.create(RadixPrimitive)  // module scope, hoisted │
│  5. inside component: const motionProps =                        │
│         useMotionPreset(variants.NAME, transitions.NAME)         │
│  6. <MotionX className={cn(shape.X, existingClasses)}            │
│         {...motionProps} {...radixProps} />                      │
└───────────────────────────┬──────────────────────────────────┘
                             │ renders client-side
                             ▼
                  Radix primitive still owns:
                  state, keyboard nav, focus-trap, ARIA
                             │
                             ▼
                  motion/react layer owns:
                  visual transform/opacity/scale only
                             │
              ┌──────────────┴───────────────┐
              ▼                               ▼
   AppMotionConfig (reducedMotion="user")   useMotionPreset()
   app-root belt-and-suspenders              per-component resolved value
```

For components needing exit animation on unmount (Dialog, Sheet, DropdownMenu, Toast-if-Motion-based, animated list rows), a second loop is required — see Pattern 2.

### Recommended Wave Grouping (for the coarse-wave plan)

Matches CONTEXT.md's suggested cohesion grouping, ordered by risk (tracer first):

1. **Tracer:** `Button` (BTN-01) — proves the foundation composes; zero Radix-portal risk.
2. **Forms:** `Input`, `Checkbox`, `RadioGroup`, `Switch`, `Label` (FORM-01..04) — moderate risk (new `focusPop` preset; Checkbox/Radio `pathLength` inline pattern).
3. **Feedback:** `Progress`, `Sonner`/Toaster, Skeleton (FDBK-01..03) — Progress has the encryption-progress consumer risk (Common Pitfall 5); Sonner is CSS-only (different pattern from everything else — flag clearly in the plan).
4. **Surfaces (low-portal-risk):** `Card`, `Badge`, `Avatar`, `Separator` (parts of SURF-01/04) — no Radix portal, no forceMount.
5. **Surfaces (portal-risk):** `Dialog`, `Sheet`, `DropdownMenu`, `Tabs` (SURF-02/03) — highest technical risk (forceMount restructure); Sheet and Tabs additionally have **zero live consumers**, so include a throwaway render (Storybook-less — a scratch route or existing test file) to visually confirm before merging.
6. **File/list:** `file-dropzone.tsx`, selected-file/share-result rows (FILE-01/02) — encryption-adjacent risk (Common Pitfall 5 applies to the same degree as Progress); presentational-only constraint is hard.
7. **Shell:** `app-shell.tsx`, `mobile-tab-bar.tsx`, `theme-toggle.tsx` (SHELL-01/02) — lowest technical risk, but cross-cuts every page (verify on all 3 routes).

### Pattern 1: Module-scope `motion.create(...)` hoist (already proven — `chip.tsx`)

**What:** `motion.create(Component)` returns a *new* wrapped component object on every call. Calling it inside a render function breaks React's component-identity rules (violates `react-hooks/static-components`) and defeats reconciliation/animation continuity. `chip.tsx` [VERIFIED: src/components/chip.tsx:16 — `const MotionSlot = motion.create(Slot.Root)`] already solves this by hoisting to module scope with an explanatory comment.
**When to use:** Every component in this phase that wraps a Radix primitive (`Slot.Root`, `CheckboxPrimitive.Root`, `DialogPrimitive.Content`, etc.) or a native element (`"label"`, `"input"`) in `motion.*`.
**Example (Button, extending `chip.tsx`'s exact pattern):**
```tsx
"use client"
import { motion } from "motion/react"
import { Slot } from "radix-ui"
import { transitions, variants } from "@/lib/motion"
import { useMotionPreset } from "@/lib/use-motion-preset"

// Hoisted once — never call motion.create() inside the component body.
const MotionButton = motion.create("button")
const MotionSlot = motion.create(Slot.Root)

function Button({ asChild = false, className, variant, size, ...props }: ButtonProps) {
  const Comp = asChild ? MotionSlot : MotionButton
  const press = useMotionPreset(variants.tapPress, transitions.micro)
  const hover = useMotionPreset(variants.hover, transitions.micro)
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      whileTap={press.whileTap}
      whileHover={hover.whileHover}
      {...props}
    />
  )
}
```
Note: `useMotionPreset` resolves a `{full, reduced}` pair keyed by `whileTap`/`whileHover` — spreading the *whole* resolved object (not just picking one key) is what `chip.tsx` does for its `initial/animate/exit` set; for `tapPress`/`hover` the resolved object's only key already is `whileTap`/`whileHover`, so `{...press} {...hover}` also works and is simpler than destructuring — prefer that form to match `chip.tsx`'s spread style exactly.

### Pattern 2: Radix portal components + `AnimatePresence` exit animation (`forceMount`)

**What:** Radix's own docs state the authoritative integration contract: *"JavaScript animation libraries need control of the unmounting phase, so we provide the `forceMount` prop on many components to allow consumers to delegate the mounting and unmounting of children based on the animation state determined by those libraries."* [CITED: radix-ui.com/primitives/docs/guides/animation]. Gemba's current `Dialog`/`Sheet`/`DropdownMenu` do NOT use `forceMount` — they rely on Radix's built-in CSS-animation-aware unmount-suspend (the `data-[state=open]:animate-in data-[state=closed]:animate-out` Tailwind classes already present, e.g. [VERIFIED: src/components/ui/dialog.tsx:42 — `"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"`]). To get Motion's spring-bounce feel (not just a CSS fade/zoom), the component must switch to the `forceMount`+`AnimatePresence` pattern, which requires the wrapper to **own the resolved `open` boolean itself** — verified directly from SmoothUI's real `Dialog` source [VERIFIED: GitHub `educlopez/smoothui`, `packages/smoothui/components/dialog/index.tsx`, fetched this session]:
```tsx
// Pattern verified from SmoothUI dialog/index.tsx (adapted to Gemba's existing exports)
const [internalOpen, setInternalOpen] = useState(false)
const isControlled = open !== undefined
const isOpen = isControlled ? open : internalOpen
// showContent + prevOpenRef keep the Radix tree mounted through the exit animation
const [showContent, setShowContent] = useState(false)
const prevOpenRef = useRef(false)
useEffect(() => {
  if (isOpen && !prevOpenRef.current) setShowContent(true)
  prevOpenRef.current = !!isOpen
}, [isOpen])

return (
  <DialogPrimitive.Root open={isOpen || showContent} onOpenChange={handleOpenChange}>
    <AnimatePresence onExitComplete={() => setShowContent(false)}>
      {isOpen ? (
        <DialogPrimitive.Portal forceMount>
          <DialogPrimitive.Overlay asChild forceMount>
            <motion.div
              className="fixed inset-0 z-50 bg-black/50"
              {...useMotionPreset({ full: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }, reduced: { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } } }, transitions.backdrop)}
            />
          </DialogPrimitive.Overlay>
          <DialogPrimitive.Content asChild forceMount>
            <motion.div
              className={cn("fixed top-[50%] left-[50%] z-50 ...", shape.card, className)}
              {...useMotionPreset(variants.scaleIn, transitions.snappy)}
            >
              {children}
            </motion.div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      ) : null}
    </AnimatePresence>
  </DialogPrimitive.Root>
)
```
**When to use:** `Dialog`, `Sheet`, `DropdownMenu` — any Radix component whose open/close needs the spring feel rather than a CSS fade.
**Critical constraint:** this restructure moves `open`-state ownership from "Radix's internal uncontrolled state, fully passthrough" to "the wrapper component's own `useState`, mirroring controlled/uncontrolled." Gemba's only live Dialog call site is fully controlled (`<Dialog open={encryptionFailure !== null}>` [VERIFIED: src/app/upload/page.tsx:821], no `onOpenChange`, no trigger) — the restructure must keep that exact controlled-without-`onOpenChange` usage working (i.e. `isControlled` branch must handle `onOpenChange` being `undefined`, matching SmoothUI's own `onOpenChange?.(next)` optional-call pattern).
**Focus-trap verification:** Radix's focus-trap logic lives inside `DialogPrimitive.Content`/`FocusScope`, which is unaffected by wrapping it in `motion.div` via `asChild` — `asChild` merges props onto the *same* underlying DOM node Radix already manages, it does not insert an extra DOM layer. This is the same `asChild`-preserves-behaviour guarantee `chip.tsx`'s `MotionSlot = motion.create(Slot.Root)` already relies on.

### Pattern 3: File-dropzone — presentational-only wrap (FILE-01)

**What:** `file-dropzone.tsx`'s business logic (`filterBySize`, `handleDrag*`, `handleDrop`, `handleFileSelect`, `removeFile`, `formatSize`, and all `useState`/`useCallback` wiring) [VERIFIED: src/components/file-dropzone.tsx:20-101, read this session] must not change at all. Only the JSX return (lines 111-179) is touched: the root `<label>` becomes a hoisted `motion.create("label")`, and the file-row `.map()` gets wrapped in `AnimatePresence` + `variants.stagger`.
**When to use:** FILE-01 exclusively — this is the one component in scope with a hard "logic untouched" constraint stricter than the general "in place on Radix" rule (there's no Radix primitive here at all — it's a native `<label>`+`<input type="file">`).
**Example — full presentational-layer diff (logic identical to the verified source):**
```tsx
"use client";
import { motion, AnimatePresence } from "motion/react";
import { transitions, variants } from "@/lib/motion";
import { useMotionPreset } from "@/lib/use-motion-preset";
import { shape } from "@/lib/shape";

const MotionLabel = motion.create("label"); // hoisted, module scope

export function FileDropzone({ files, onFilesChange, maxSizeMb = 15360 }: FileDropzoneProps) {
  // ...ALL existing state/handlers unchanged (isDragging, filterBySize, handleDrag*, handleDrop, handleFileSelect, removeFile, formatSize)...
  const dropzoneMotion = useMotionPreset(
    { full: { animate: { scale: isDragging ? 1.02 : 1 } }, reduced: { animate: {} } },
    transitions.micro
  );

  return (
    <div className="space-y-4">
      <MotionLabel
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center border-2 border-dashed p-8 text-center transition-colors",
          shape.card,
          isDragging ? "border-[var(--gemba-accent)] bg-[var(--gemba-accent-subdued)]" : "border-[var(--border-default)] hover:border-[var(--gemba-accent)]/50"
        )}
        {...dropzoneMotion}
      >
        {/* input + Icon + copy: UNCHANGED */}
      </MotionLabel>

      {files.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {files.map((file, index) => {
              const rowMotion = useMotionPreset(variants.stagger, transitions.snappy) // see note below
              return (
                <motion.div
                  key={`${file.name}-${index}`}
                  layout
                  {...rowMotion}
                  className={cn("flex items-center gap-3 p-3 shadow-[var(--ring-border)]", shape.innerCard)}
                >
                  {/* row contents: UNCHANGED */}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
```
**Rules-of-Hooks note:** calling `useMotionPreset` inside `.map()` (as sketched above for `rowMotion`) violates the Rules of Hooks (hooks can't be called in a loop with a variable iteration count). The actual implementation must extract a small `FileRow` subcomponent (`function FileRow({ file, onRemove }) { const rowMotion = useMotionPreset(...); return <motion.div {...rowMotion}>...</motion.div> }`) and map to `<FileRow key={...} .../>` instead — this is a required structural change, not optional; flag it explicitly in the plan's task for FILE-01/FILE-02's row-list refactor. The same rule applies to any other `.map()`-rendered list where each item needs its own resolved motion props (share-result rows, FILE-02).

### Anti-Patterns to Avoid

- **Calling `motion.create(...)` or `useMotionPreset(...)` inside `.map()` or any loop/conditional.** Violates Rules of Hooks and the module-scope-hoist requirement from Phase 9's own code review (WR-03). Extract a row/item subcomponent instead (see Pattern 3).
- **Wrapping `sonner`'s rendered toast DOM in `motion.*`.** Sonner does not expose the underlying toast element for wrapping — it owns its own render tree. Re-skin via `toastOptions.classNames`/CSS vars only (Common Pitfall 2).
- **Adopting SmoothUI's floating-label `AnimatedInput` markup wholesale.** It merges the `<label>` into the input's own wrapper with no separate accessible-name pattern matching Gemba's existing `Label`+`htmlFor` convention used everywhere else in the app — would create an inconsistent labelling pattern across the form components in the same wave (FORM-01 vs FORM-02/03/04 would use two different label-association strategies).
- **Porting `dock`'s pointer-magnification physics to `app-shell`/`mobile-tab-bar`.** Wrong domain (icon-launcher hover-scale vs. a small fixed link-count nav) and drags in `useSpring`/`useTransform`/pointer-distance math with no Radix/native-element involvement at all — massively higher complexity than SHELL-01 needs.
- **Skipping the `forceMount` restructure and just adding `motion.div` children inside the existing CSS-animated Dialog/Sheet.** Radix will still fully unmount the content the instant `open` flips to `false` (CSS `animate-out` classes handle the *visual* fade, but the underlying DOM node removal timing is Radix's, not Motion's) — a `motion.div` child with an `exit` prop but no `AnimatePresence`+`forceMount` ancestor will never see its exit animation run; it just disappears instantly, worse than the current CSS approach it was meant to improve on.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Reduced-motion detection anywhere new | A custom `matchMedia` listener | `useReducedMotion()` (already used by every SmoothUI source file read this session) via `useMotionPreset` | Established Phase 9 convention; SSR-safe mount guard already handled. |
| Directional slide offset for Sheet | Four separate hardcoded `translateX`/`translateY` literals inlined per call site | `getSlideOffset(side)` (Foundation Addition #2) | Keeps the "no magic numbers" rule; one place to adjust if the offscreen distance ever changes. |
| Toast reduced-motion handling | A custom `prefers-reduced-motion` check wrapping `toast()` calls | Nothing — sonner already does this internally [VERIFIED: `github.com/emilkowalski/sonner`, `src/styles.css:708-711`, fetched this session: `@media (prefers-reduced-motion) { [data-sonner-toast], [data-sonner-toast] > *, .sonner-loading-bar { transition: none !important; animation: none !important; } }`] | Don't duplicate what the library already guarantees. |
| Checkmark/dot "draw-on" SVG animation | Hand-rolled `stroke-dashoffset` CSS keyframes | `motion.path`'s `pathLength` prop (verified pattern in SmoothUI's real `checkbox/index.tsx`) | `motion/react` interpolates `pathLength` natively; CSS `stroke-dasharray` hacks are strictly more code for the same visual result. |
| Tabs active-indicator positioning math | Manually measuring `getBoundingClientRect()` of the active tab and animating `left`/`width` | `motion.span`'s `layout`+`layoutId` (verified pattern in SmoothUI's real `animated-tabs/index.tsx`) | Motion's layout animation system already solves the FLIP-technique measurement problem; hand-rolling it is exactly what Motion exists to replace. |

**Key insight:** every component in this phase already has either (a) a real, verified SmoothUI source file demonstrating the exact interaction, or (b) an existing Phase 9 preset that fits without modification. The only genuinely new engineering surface is the two Foundation Additions and the Dialog/Sheet `forceMount` restructure — everything else is disciplined pattern replication of `chip.tsx`.

## Common Pitfalls

### Pitfall 1: `forceMount` restructure breaks the single live Dialog call site if `onOpenChange` handling isn't defensive
**What goes wrong:** The only current Dialog usage passes `open` but no `onOpenChange` [VERIFIED: src/app/upload/page.tsx:821 — `<Dialog open={encryptionFailure !== null}>`]. SmoothUI's verified source calls `onOpenChange?.(next)` (optional chaining) — if the Gemba restructure forgets the `?.` and calls `onOpenChange(next)` directly, this exact call site crashes on any Radix-internal close attempt (e.g. Escape key, if the dialog isn't otherwise `showCloseButton={false}`-locked).
**Why it happens:** Radix's own `Dialog.Root` already handles `onOpenChange` being undefined gracefully; a hand-rolled wrapper re-implementing that contract can easily miss the optional-call.
**How to avoid:** Copy the `handleOpenChange` callback verbatim from the verified SmoothUI pattern (Pattern 2 above), which already uses `onOpenChange?.(next)`.
**Warning signs:** `TypeError: onOpenChange is not a function` in the browser console when testing the upload page's encryption-failure dialog.

### Pitfall 2: Sonner is CSS-animated, not Motion-animated — don't try to wrap it
**What goes wrong:** Assuming FDBK-01 ("toasts re-shaped ... enter/exit motion") means importing `motion/react` into `sonner.tsx` and wrapping `<Sonner>` or its children in `motion.div`. Sonner renders its own portal-based DOM tree internally; there is no child element exposed to wrap.
**Why it happens:** every *other* component in this phase follows the "wrap the Radix primitive in `motion.*`" pattern, making it easy to assume the same recipe applies universally.
**How to avoid:** re-skin via `<Sonner toastOptions={{ classNames: { toast: cn(shape.card, "!shadow-[var(--shadow-popover)]") } }} />` — note the `!` is required because "Sonner's injected styles win the cascade" [CITED: sonner.emilkowal.ski/styling, fetched this session — "you will need to use `!important` in order to override the default styles"]. Motion timing is already governed by sonner's own CSS (400ms transform/opacity transitions, verified in its `styles.css`) and its own `@media (prefers-reduced-motion)` block — no `useMotionPreset` involvement needed or possible here.
**Warning signs:** toasts render with the new shape but the reduced-motion story can't be tested via `useReducedMotion()` — that's expected; test it via the OS/browser "reduce motion" setting instead, since sonner reads the media query directly, not React state.

### Pitfall 3: Radix `asChild` + `motion.create(...)` requires exactly one child element
**What goes wrong:** `Slot.Root`/`DialogPrimitive.Content asChild` (and any Radix `asChild`) clones props onto its single child. `motion.create(Slot.Root)` wrapping a component that sometimes renders `null` or a fragment as its child (e.g. `Button`'s `asChild` path with a conditionally-rendered icon-only child) throws at runtime ("React.Children.only expected to receive a single React element child").
**Why it happens:** the `asChild` pattern is easy to reach for uniformly, but Motion's `motion.create(Slot.Root)` inherits Radix's single-child constraint exactly as strictly as plain `Slot.Root` does — this isn't a new failure mode Motion introduces, but it's easy to forget when refactoring.
**How to avoid:** when re-shaping `Button`, `Badge`, keep the existing `asChild` contract exactly as-is (verified: `button.tsx`'s `Comp = asChild ? Slot.Root : "button"` already assumes single-child discipline is the caller's responsibility) — don't add any new conditional-rendering branches inside the button/badge JSX itself during this phase.
**Warning signs:** `React.Children.only expected to receive a single React element child` in the console, specifically on `asChild` usages after the motion wrap.

### Pitfall 4: `useMotionPreset` inside `.map()` violates Rules of Hooks
**What goes wrong:** see Pattern 3 — any list re-shape (file rows, share-result rows) that calls `useMotionPreset`/`useReducedMotion` per-item inside `.map()` breaks React's hook-call-count invariant the moment the list length changes between renders (adding/removing a file).
**Why it happens:** the natural first draft of "give each list item its own motion props" reaches for the hook inline.
**How to avoid:** extract a per-item subcomponent (`FileRow`, `ShareResultRow`) that calls the hook once per component instance — React's reconciliation already treats each list item as its own component instance keyed by `key`, so this is the correct fix, not a workaround.
**Warning signs:** "Rendered more hooks than during the previous render" React error the moment a file is added or removed.

### Pitfall 5: Spring-animated Progress fighting a rapidly-updating `value`
**What goes wrong:** `transitions.fill`'s spring (`stiffness: 100, damping: 10, mass: 0.75`) is tuned for a single, discrete transition (0% → 100% once). Gemba's `<Progress value={...}>` is driven by `uploadProgress`/`progress` state that updates many times per second during an active transfer [VERIFIED: src/app/upload/page.tsx:799 — `<Progress value={Math.min(uploadProgress, 100)} />`; src/app/download/page.tsx:836 — `<Progress value={Math.min(progress, 100)} />`]. A spring re-targeted on every state tick can visibly lag behind the true progress (the bar never quite "catches up" during fast transfers), which is worse UX than the current instant `transform: translateX(...)` update [VERIFIED: src/components/ui/progress.tsx:25 — `style={{ transform: `translateX(-${100 - (value || 0)}%)` }}`].
**Why it happens:** the `fill` preset's physics values were reasoned about (Phase 9) as a single-shot reveal, not a continuously-retargeted animation.
**How to avoid:** animate the bar's `scaleX`/`width` with `transitions.fill` but verify visually with a fast simulated transfer (throttle the network in devtools, or a small test file) before merging; if lag is visible, the correct fix is a stiffer, less-damped variant of the same named preset (e.g., raise `stiffness`) — added to `transitions` under a new name if genuinely needed, not an inline override. Do not silently disable the animation for Progress only — confirm first.
**Warning signs:** the progress bar visibly "chases" a fast-moving value during manual testing on `/upload` or `/download`.

### Pitfall 6: `dock`/`floating-navbar` are not `layoutId`-based — don't cargo-cult SHELL-01 from them
**What goes wrong:** searching SmoothUI's catalog for "the nav component" surfaces `dock`, `floating-navbar`, `expandable-navbar` — none of which are the right analog (all built for icon-heavy launcher UIs with pointer-proximity magnification, not a 3-link top/bottom app nav).
**Why it happens:** these are the components most obviously *named* for navigation, so they're the first hit when searching the catalog.
**How to avoid:** use `animated-tabs`'s `layoutId` active-indicator pattern instead (see Component Map row "AppShell nav") — same visual payoff (a smoothly-sliding active-state pill/underline) at a fraction of the complexity, and it's already a verified, proven pattern from a different component family in this same phase.
**Warning signs:** a SHELL-01 implementation that imports `useSpring`/`useTransform`/pointer-event math for a 3-link nav is a sign the wrong analog was chosen.

## Runtime State Inventory

Not applicable — this is a pure component-reshape phase (no rename/refactor/migration of identifiers, no datastore/service-config/OS-registration changes). Confirmed: no `git mv`, no renamed exports, no changed prop names in scope; only internal JSX/className/motion-wrapping changes to existing files.

## Code Examples

### Checkbox — check-draw with `pathLength` (near-complete, adapted to Gemba's existing `checkbox.tsx`)
```tsx
"use client"
import * as React from "react"
import { CheckIcon } from "lucide-react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { AnimatePresence, motion } from "motion/react"
import { cn } from "@/lib/utils"
import { transitions, variants } from "@/lib/motion"
import { useMotionPreset } from "@/lib/use-motion-preset"

const MotionCheckIcon = motion.create(CheckIcon)

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  const iconMotion = useMotionPreset(variants.scaleIn, transitions.snappy)
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // existing shape classes unchanged: "peer size-[18px] shrink-0 rounded-[6px] ..."
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" forceMount className="grid place-content-center text-current">
        <AnimatePresence mode="wait">
          {props.checked && (
            <MotionCheckIcon key="check" className="size-3.5" {...iconMotion} />
          )}
        </AnimatePresence>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
```
Note: `forceMount` is required on `CheckboxPrimitive.Indicator` here too (same reasoning as Pattern 2) — without it, Radix removes the indicator from the DOM the instant `checked` flips, before `AnimatePresence`'s exit can run.

### Tabs — `layoutId` active indicator (near-complete, adapted to Gemba's existing `tabs.tsx`)
```tsx
"use client"
import { motion } from "motion/react"
import { Tabs as TabsPrimitive } from "radix-ui"
import { transitions } from "@/lib/motion"

function TabsTrigger({ className, value, children, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger value={value} className={cn(/* existing classes, drop the `after:` pseudo-element indicator classes */ className)} {...props}>
      <span className="relative z-10">{children}</span>
      {/* Rendered only for the active trigger — Radix exposes data-state="active" per trigger */}
      <TabsPrimitive.Trigger asChild value={value}>
        {/* placeholder pattern; actual impl renders indicator conditionally via data-state selector or a small wrapper reading useContext */}
      </TabsPrimitive.Trigger>
    </TabsPrimitive.Trigger>
  )
}
```
The verified SmoothUI `animated-tabs` source renders the indicator as a child of the *active* trigger only (`{isActive && <motion.span layoutId={layoutId} layout transition={SPRING} />}`), because it owns its own `activeTab` state directly. Gemba's `Tabs` wraps Radix's `TabsPrimitive`, which does not expose "is this the active trigger" as a prop to `TabsTrigger` — it's inferred by Radix internally via `data-state="active"|"inactive"`. The correct adaptation: render the `motion.span` indicator unconditionally inside every `TabsTrigger`, gated by CSS (`hidden data-[state=active]:block`) is WRONG (defeats `layoutId` — an unmounted-then-remounted element doesn't get the layout-animation benefit). Instead, use Radix's `TabsPrimitive.Trigger`'s render-prop-free `data-state` and read it via a small internal hook, OR — the simpler, lower-risk approach — keep `layoutId` scoped to a **separate absolutely-positioned indicator sibling** inside `TabsList` (not each trigger), positioned via `layout` off the active trigger's measured `data-state` — this is the shadcn-community-standard pattern for exactly this Radix+Motion combination. Flag this as an **Open Question** for the planner to resolve with a spike before committing to final code (see below) — the `layoutId`-per-active-trigger approach (verified, simple) versus the sibling-indicator approach (more Radix-idiomatic, more code) is a real design decision with no single "verified against this exact codebase" answer yet.

### ThemeToggle — icon crossfade (near-complete, adapted to Gemba's existing `theme-toggle.tsx`)
```tsx
"use client";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";
import { transitions, variants } from "@/lib/motion";
import { useMotionPreset } from "@/lib/use-motion-preset";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

function ThemeIcon({ resolvedTheme }: { resolvedTheme: string | undefined }) {
  const iconMotion = useMotionPreset(variants.scaleIn, transitions.snappy);
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span key={resolvedTheme} {...iconMotion} className="inline-flex">
        <Icon name={resolvedTheme === "dark" ? "Moon01" : "Sun"} size={20} />
      </motion.span>
    </AnimatePresence>
  );
}

export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change theme">
          <ThemeIcon resolvedTheme={resolvedTheme} />
          <span className="sr-only">Change theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          {/* light / dark / system items UNCHANGED — 3-way control preserved */}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```
Key change from the current implementation: `resolvedTheme` (not `theme`) drives the icon swap, since `theme` can be `"system"` (no matching icon) while `resolvedTheme` is always `"light"|"dark"`. This is a small but necessary behavioural note — the current CSS-only implementation [VERIFIED: src/components/theme-toggle.tsx:21-30] renders BOTH icons simultaneously and toggles visibility via `dark:` CSS variants (no `theme`/`resolvedTheme` branching at all); switching to an `AnimatePresence`-keyed single-icon render is a structural change from "both icons in the DOM, CSS-toggled" to "one icon in the DOM, swapped via `key`" — call this out explicitly in the SHELL-02 plan task.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Radix Dialog/Sheet exit animation via `data-[state=closed]:animate-out` CSS classes (tailwindcss-animate/tw-animate-css) | `forceMount` + `AnimatePresence` for spring-physics exit motion | This phase (SURF-02) | Higher-fidelity motion (matches the SmoothUI spring feel) at the cost of the wrapper owning `open` state itself — a real architectural shift for `Dialog`/`Sheet`, not just a class-name swap. |
| Theme-toggle: both icons always in the DOM, CSS `dark:` visibility toggle | Single icon in the DOM, `AnimatePresence`-keyed swap on `resolvedTheme` | This phase (SHELL-02) | Slightly different DOM shape; verify no other code queries the theme-toggle's DOM structure (grep found none). |

**Deprecated/outdated:** none — no library version changes in this phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | The `layoutId`-per-active-trigger pattern (vs. a separate sibling indicator) is the right adaptation of `animated-tabs` onto Radix `TabsPrimitive` | Code Examples "Tabs" | Medium — flagged explicitly as an Open Question; if wrong, the fix is contained to `tabs.tsx` alone and doesn't cascade to other components. |
| A2 | `variants.stagger` is close enough to SmoothUI's `animated-list` receding-opacity effect that a new `variants.listItem` isn't needed | Alternatives Considered | Low — purely cosmetic fidelity gap; adding `variants.listItem` later is a small, additive, non-breaking change if the team wants exact parity. |
| A3 | Sonner's `@media (prefers-reduced-motion)` block (verified without the `: reduce` value — it's `@media (prefers-reduced-motion)` matching any non-`no-preference` value) behaves equivalently to the `prefers-reduced-motion: reduce` check `useReducedMotion()` uses elsewhere in the app | Common Pitfall 2 | Low — `prefers-reduced-motion` as a media feature only has two defined values (`reduce`/`no-preference`); an unqualified `@media (prefers-reduced-motion)` matches when the feature is present and truthy, which in practice means `reduce` — but this wasn't independently cross-checked against MDN's exact matching semantics this session. |
| A4 | The `getThumbTransform`/`getThumbBorderRadius`-style direct-animate pattern (Pattern 4, referenced throughout for Switch/drag-state/Tabs) needs no new hook or foundation export — components can call `useReducedMotion()` from `motion/react` directly alongside the named `transitions.*` constants | Component Map (Switch, FileDropzone rows), Don't Hand-Roll | Low — this is how `chip.tsx`'s sibling patterns already work in principle (the hook is already imported in `use-motion-preset.ts`); worst case a small local helper is needed per component, not a foundation change. |

## Open Questions

1. **Tabs active-indicator implementation: `layoutId`-per-trigger vs. sibling-indicator?**
   - What we know: SmoothUI's real source renders the indicator conditionally inside the active trigger only, because it owns `activeTab` state directly and can conditionally render. Gemba's `Tabs` wraps `TabsPrimitive`, which manages active state internally and exposes it only via `data-state` on each trigger, not as a prop `Tabs`/`TabsList` can branch on without extra plumbing.
   - What's unclear: whether reading `data-state` via a small custom hook (subscribing to Radix's internal context, which isn't officially public API) is more or less fragile than the shadcn-community "absolutely-positioned sibling measured via `getBoundingClientRect` + `layout`" pattern.
   - Recommendation: spike both approaches against Gemba's actual `Tabs` usage during the SURF-03 wave (note: zero live consumers today, so this is safe to prototype against a throwaway route) before locking the plan's task description to one specific implementation.

2. **Should `variants.listItem` be added for exact `animated-list` parity, or is `variants.stagger` reuse sufficient for FILE-02?**
   - What we know: `stagger`'s exit is `{ opacity: 0 }` only; `animated-list`'s real exit is `{ opacity: 0, scale: 0.9, y: 0 }` with per-index receding opacity/scale on the *remaining* items (a more elaborate effect).
   - What's unclear: whether the milestone's bar for "uses SmoothUI animated-list geometry + add/remove motion" (FILE-02's literal wording) requires the receding effect specifically, or just *a* remove animation.
   - Recommendation: default to reusing `stagger` (documented above); treat upgrading to a dedicated `listItem` preset as a fast-follow if `/gsd-verify-work` or a UAT pass calls out the visual gap.

3. **Does `Checkbox`'s `CheckboxPrimitive.Indicator forceMount` change any existing consumer's assumptions about the indicator always/never being in the DOM?**
   - What we know: current `checkbox.tsx` does NOT use `forceMount` — Radix already conditionally renders `CheckboxPrimitive.Indicator` based on `checked`/`indeterminate`.
   - What's unclear: whether any existing test or a11y tooling asserts on the indicator's DOM presence tied to `checked` state (a `forceMount`+`AnimatePresence` swap means the indicator's *wrapper* is always mounted, with the icon itself animating in/out inside it).
   - Recommendation: grep for any `queryByRole`/`getByRole` checkbox-indicator assertions in existing tests before landing FORM-02; none were found in this research pass but this session did not do a full test-suite audit.

## Environment Availability

No new external tool/service/runtime dependency — this phase only consumes already-installed npm packages and already-present browser APIs (`prefers-reduced-motion` media query, already relied on by Phase 9's `AppMotionConfig`). Skipped per the "no external dependencies" condition.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|--------------------|
| V2 Authentication | No | Phase touches no auth code. |
| V3 Session Management | No | Phase touches no session code. |
| V4 Access Control | No | Phase touches no access-control code. |
| V5 Input Validation | No | No new user-input handling is introduced — `file-dropzone.tsx`'s existing validation (`filterBySize`) is explicitly unchanged; motion wraps presentation only. |
| V6 Cryptography | No | Explicitly out of scope per CONTEXT.md hard constraint; no code in `src/lib/crypto.ts` is touched, and the `<Progress>` re-skin only wraps the *rendering* of an already-computed percentage, never the encryption/transfer logic that produces it. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Accidental exposure of internal state via a11y/DOM structure change (e.g. Checkbox's `forceMount` making the indicator wrapper always-present) | Information Disclosure (minor) | Verify with existing a11y-relevant tests/manual screen-reader spot-check that `aria-checked`/`data-state` still correctly reflect checked state after the `forceMount` restructure — Radix's own `aria-checked` attribute is unaffected by `forceMount` (it's set on `Root`, not `Indicator`), but flagged for completeness. |
| None else applicable | — | This phase has no new input surface, no new auth surface, no new data-handling surface — a presentational-only phase, genuinely narrow from a security standpoint, matching Phase 9's own assessment. |

## Sources

### Primary (HIGH confidence)
- This project: `src/lib/motion.ts`, `src/lib/use-motion-preset.ts`, `src/lib/shape.ts`, `src/components/chip.tsx`, `src/components/ui/{button,input,checkbox,radio-group,switch,label,card,dialog,sheet,dropdown-menu,tabs,badge,avatar,separator,progress,sonner}.tsx`, `src/components/{file-dropzone,app-shell,mobile-tab-bar,theme-toggle,motion-config,icon}.tsx`, `src/app/{upload,download}/page.tsx`, `design-system/MOTION.md`, `package.json`, `.planning/config.json`, `.planning/REQUIREMENTS.md` — all read in full this session.
- GitHub `educlopez/smoothui` — real source fetched via `gh api` this session for: `animated-input`, `checkbox`, `radio-group`, `animated-toggle`, `drawer`, `animated-tabs`, `animated-file-upload`, `theme-toggle` (partial — types + sizing constants), `dialog` (first 250 lines, full open/close logic), `skeleton-loader`, `animated-list`, `dock` (header only, used to disqualify it as the SHELL-01 analog).
- GitHub `emilkowalski/sonner` — `src/styles.css` fetched via `gh api` this session, confirming the `@media (prefers-reduced-motion)` block (lines 708-711) and the absence of a `--toast-animation-duration` CSS variable (correcting an initial WebSearch-sourced claim — see below).
- radix-ui.com/primitives/docs/guides/animation — fetched via WebFetch this session, confirming the `forceMount` contract for JS animation library integration.
- sonner.emilkowal.ski/styling — fetched via WebFetch this session, confirming `toastOptions.classNames` requires `!important`.

### Secondary (MEDIUM confidence)
- `.planning/phases/09-smoothui-foundation/09-RESEARCH.md` — Phase 9's own verified findings (spring values, reduced-motion pattern, `smooth-button`/`clip-corners-button`/`animated-progress-bar`/`basic-toast` source excerpts already fetched and baked into `src/lib/motion.ts`'s comments).

### Tertiary (LOW confidence)
- Initial WebSearch result claiming sonner exposes a `--toast-animation-duration` CSS variable — **refuted** by reading the actual `styles.css` source this session (no such variable exists in the current source); not used in the final recommendations.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; existing versions confirmed via `package.json` read this session.
- Architecture: HIGH — every pattern (Pattern 1-3, the Component Map's approach column) is grounded in either this project's own read source or SmoothUI/Radix/sonner source fetched this session, not training-data recall. The one exception (Tabs indicator implementation choice) is explicitly flagged as an Open Question rather than asserted as settled.
- Pitfalls: HIGH — all six pitfalls cite verbatim-quoted source from this project, SmoothUI, sonner, or Radix's own documentation.

**Research date:** 2026-09-21
**Valid until:** 2026-10-21 (30 days — no fast-moving dependency in this phase; re-verify only if Phase 9's foundation modules change before Phase 10 executes)

## RESEARCH COMPLETE
