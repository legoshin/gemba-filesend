---
phase: 09-smoothui-foundation
reviewed: 2026-09-21T10:45:58Z
depth: deep
files_reviewed: 8
files_reviewed_list:
  - src/lib/motion.ts
  - src/lib/motion.test.ts
  - src/lib/shape.ts
  - src/lib/shape.test.ts
  - src/components/motion-config.tsx
  - src/components/chip.tsx
  - src/app/layout.tsx
  - design-system/MOTION.md
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: fixed
fixed_at: 2026-09-21T12:00:00Z
fixed_summary:
  fixed: [CR-01, WR-01, WR-02, WR-03]
  deferred: [IN-01, IN-02]
  deferred_to: 10-smoothui-component-reshape
---

# Phase 9: Code Review Report

**Reviewed:** 2026-09-21T10:45:58Z
**Depth:** deep
**Files Reviewed:** 8
**Status:** fixed (CR-01, WR-01, WR-02, WR-03 applied; IN-01/IN-02 deferred to Phase 10)

## Fix Status (2026-09-21)

All Critical and Warning findings were fixed and committed atomically on
worktree branch `worktree-agent-a349d3f396dc49595`; Info findings were left
for Phase 10 per instruction.

| Finding | Outcome | Commit |
|---|---|---|
| CR-01 | Fixed — hoisted `motion.create(Slot.Root)` to module scope in `chip.tsx` | `5166b8b` |
| WR-01 | Fixed — dropped dead `duration` from `transitions.fill`/`transitions.micro`; updated `MOTION.md` + test | `8751726` |
| WR-02 | Fixed — made `MotionPreset`/`resolveMotionPreset` generic over branch shapes | `281f334` |
| WR-03 | Fixed — split `useMotionPreset` into `src/lib/use-motion-preset.ts` (`"use client"`), keeping `src/lib/motion.ts` RSC-safe | `148c834` |
| IN-01 | Deferred to Phase 10 | — |
| IN-02 | Deferred to Phase 10 | — |

Verification after fixes: `npm run build` clean, `npx tsc --noEmit` shows no
new errors (only pre-existing `src/lib/crypto.test.ts` errors, unrelated to
this phase), `vitest run` 123/123 passing (same count as before the fixes).
Scope guard confirmed: diff touches only `src/lib/motion.ts`,
`src/lib/motion.test.ts`, `src/lib/use-motion-preset.ts` (new),
`src/components/chip.tsx`, and `design-system/MOTION.md` — no colour/type
token or crypto/network changes.

## Summary

Reviewed the SmoothUI foundation layer (`src/lib/motion.ts`, `src/lib/shape.ts`, `AppMotionConfig`, and `chip.tsx` as first consumer) against correctness, SSR/RSC safety, scope adherence, and the `ChipProps` narrowing.

Scope adherence is clean: `git diff --stat` across the full phase range (`5d5dd205^..a53de21e`) touches only the listed source/doc files plus `package.json`/`package-lock.json` (the `motion` dependency) — no colour/type token files, no crypto/network/upload/download path files. The reduced-motion contract is well-tested (`motion.test.ts` asserts every `variants.*.reduced` branch is transform-free) and `resolveMotionPreset` is a clean, hookless pure function. The `ChipProps` narrowing (omitting `onDrag`/`onDragStart`/`onDragEnd`/`onAnimationStart`/`onAnimationEnd`/`onAnimationIteration`) is correct and complete — those are exactly the props where Motion's event signatures conflict with the native DOM ones; no other native span prop actually collides with Motion's public API, so nothing needed was dropped.

One real, verified functional bug was found in `chip.tsx` (confirmed by the project's own ESLint rule, not just inspection): `motion.create(Slot.Root)` is called inline during render, creating a new component type on every render whenever `asChild` is used, which will force React to unmount/remount the underlying DOM node — the opposite of "smooth." Two further issues were verified by reading the installed `motion@13.4.0` source directly: `transitions.fill`/`transitions.micro` declare a `duration` that Motion's own spring-options resolver silently ignores whenever physics keys are present, and `MotionPreset`'s use of bare `object` erases all property information from `resolveMotionPreset`'s return type under TypeScript's structural spread rules (reproduced against `tsc --strict`). None of these are exercised by the current single consumer (`chip.tsx` default path only), so nothing is visibly broken today, but all three will bite as soon as Phase 10/11 build on this foundation as documented.

## Critical Issues

### CR-01: `motion.create(Slot.Root)` creates a new component identity on every render (`asChild` path)

**File:** `src/components/chip.tsx:61`
**Issue:** `const Comp = asChild ? motion.create(Slot.Root) : motion.span` calls `motion.create()` inline in the render body. `motion.create()` returns a brand-new wrapped component object each call, so every time `Chip` re-renders with `asChild` (e.g. a parent re-render, a variant/icon prop change, or a state update above it), `Comp` is a *different* component type from the previous render. React treats a changed element type as "this is a different component" and fully unmounts the old DOM node and mounts a new one — losing focus, any nested DOM/input state, and resetting/cutting off any in-flight animation. This is confirmed by the project's own lint rule, not speculative:

```
$ npx eslint src/components/chip.tsx
react-hooks/static-components: Cannot create components during render
  61 |   const Comp = asChild ? motion.create(Slot.Root) : motion.span
     |                          ^^^^^^^^^^^^^^^^^^^^^^^^ The component is created during render here
```

The default (`motion.span`) path is unaffected — `motion.span` is a stable module-level export, not created per render — so the bug is confined to `asChild`. No current consumer passes `asChild` (`page.tsx`, `upload/page.tsx`, `download/page.tsx` only use the default `<Chip>` form), so it is dormant today, but `asChild` is part of the component's declared public API and this defeats the entire point of Phase 9 (smooth, uninterrupted motion) the moment it is used. This is also a regression versus the pre-Phase-9 `chip.tsx`, which used `Comp = asChild ? Slot.Root : "span"` — both stable references.

**Fix:** Hoist the wrapped component to module scope so its identity is stable across renders:
```tsx
const MotionSlot = motion.create(Slot.Root)

function Chip({ ... }: ChipProps) {
  const Comp = asChild ? MotionSlot : motion.span
  ...
}
```

## Warnings

### WR-01: `transitions.fill`/`transitions.micro` declare a `duration` that Motion silently ignores

**File:** `src/lib/motion.ts:17-30`
**Issue:** `transitions.fill` sets `{ type: "spring", stiffness: 100, damping: 10, mass: 0.75, duration: 0.25 }` and `transitions.micro` sets `{ type: "spring", stiffness: 400, damping: 24, duration: 0.2 }`. Verified against the installed `motion-dom@13.4.0` source (`node_modules/motion-dom/dist/es/animation/generators/spring.mjs`), `getSpringOptions()` only resolves a spring from `duration`/`bounce` when **no** physics key (`stiffness`/`damping`/`mass`) is present:
```js
const durationKeys = ["duration", "bounce"];
const physicsKeys = ["stiffness", "damping", "mass"];
// stiffness/damping/mass overrides duration/bounce
if (!isSpringType(options, physicsKeys) && isSpringType(options, durationKeys)) {
  // ...duration/bounce resolution (findSpring)...
}
```
Because `fill` and `micro` both set `stiffness`/`damping`/`mass`, this branch is skipped: the spring is driven entirely by the physics values, settles dynamically based on rest-velocity/rest-delta thresholds, and the declared `duration` field is carried through the options object but never consulted. The `0.25`/`0.2` durations documented in the code comments and in `design-system/MOTION.md`'s transitions table ("Progress bar fill", "Micro hover/press motion") do not actually bound the animation's timing — they're dead configuration. `transitions.snappy` (`bounce`+`duration`, no physics keys) and `transitions.backdrop` (plain tween, no `type: "spring"`) do not have this problem.
**Fix:** Either drop the inert `duration` field from `fill`/`micro` (physics keys alone fully determine the spring) or, if a specific settle time is actually required, drop `stiffness`/`damping`/`mass` and express the preset purely via `duration`/`bounce` (as `snappy` already does) so the documented value is the one actually driving the animation.

### WR-02: `MotionPreset`'s `object`-typed fields erase spread property info from `resolveMotionPreset`'s return type

**File:** `src/lib/motion.ts:144-163`
**Issue:** `type MotionPreset = { full: object; reduced: object }` uses the bare `object` type. When `resolveMotionPreset` spreads `...(shouldReduceMotion ? preset.reduced : preset.full)`, TypeScript cannot carry forward any property names from a value typed merely as `object` (this differs from a generic/indexable type) — the compiler infers the spread's contribution as empty, so the function's actual inferred return type is just `{ transition: Transition }`, silently dropping `initial`/`animate`/`exit`/`whileHover`/`whileTap`. Reproduced directly against `tsc --strict`:
```
error TS2339: Property 'initial' does not exist on type '{ transition: { duration: number; }; }'.
```
and confirmed the fix (making the function generic over the preset's actual shape) resolves it cleanly. This doesn't break `chip.tsx` today because it blindly spreads `{...motionProps}` into JSX without touching individual keys, and JS spread doesn't care about static types — but it means: (a) any future consumer that needs to inspect/merge individual keys from `useMotionPreset()`'s result gets no compiler help, and (b) `variants` (unlike `transitions`, which uses `satisfies Transition` per entry) has no structural check against Motion's expected animation-prop shapes, so a typo like `iniital` inside a variant definition would not be caught by the type system.
**Fix:** Make the resolver generic instead of using a fixed `object`-typed interface:
```ts
export function resolveMotionPreset<F extends object, R extends object>(
  preset: { full: F; reduced: R },
  transition: Transition,
  shouldReduceMotion: boolean
) {
  return {
    ...(shouldReduceMotion ? preset.reduced : preset.full),
    transition: shouldReduceMotion ? { duration: 0 } : transition,
  }
}
```

### WR-03: `src/lib/motion.ts` is marked `"use client"` for its whole module, though most of it is pure data

**File:** `src/lib/motion.ts:1`
**Issue:** The top-level `"use client"` directive applies to the entire module, but only `useMotionPreset` (a hook, via `useReducedMotion`) actually needs a client boundary — `transitions`, `variants`, and `resolveMotionPreset` are plain data/pure functions with no React or browser dependency. Next.js's RSC bundler treats every export of a `"use client"` module uniformly as belonging to the client bundle/boundary. `design-system/MOTION.md` explicitly frames this module as the shared foundation Phase 10/11 components should pull named presets from ("components never inline spring/number literals") without qualifying that as "client components only." If a future Server Component (or a component that doesn't otherwise need to be client) tries to import `transitions`/`variants`/`resolveMotionPreset` directly, it risks a build-time/runtime failure or an unnecessary forced client boundary, since those bindings are exported from a client module.
**Fix:** Split the hook into its own client-only file (e.g. `src/lib/use-motion-preset.ts` with `"use client"`), and keep `transitions`/`variants`/`resolveMotionPreset` in a plain module with no directive, so pure data stays importable from both server and client code.

## Info

### IN-01: `0.15` exit-duration is a duplicated magic number not sourced from `transitions`

**File:** `src/lib/motion.ts:102, 133`
**Issue:** `variants.toast.full.exit.transition` and `variants.menu.full.exit.transition` both hardcode `{ duration: 0.15 }` inline, independently, rather than referencing a named entry in `transitions`. This is still centralized within `motion.ts` (not inlined in a component), so it's low-impact, but it's inconsistent with the module's own stated goal that all spring/number literals live in one named place, and the duplication means the two values could silently drift if one is tuned and the other forgotten.
**Fix:** Extract a `transitions.quickExit = { duration: 0.15 }` (or similar) and reference it from both `toast.full.exit.transition` and `menu.full.exit.transition`.

### IN-02: Combining two `useMotionPreset()` results on one element isn't documented as unsupported

**File:** `src/lib/motion.ts:154-168`
**Issue:** `resolveMotionPreset`'s return object always includes a top-level `transition` key. A Phase 10 consumer wanting both an entrance preset (e.g. `fadeSlideUp`) and a press-feedback preset (e.g. `tapPress`) on the same element would need to call `useMotionPreset()` twice and spread both results; since both results carry a `transition` key, the second spread would silently clobber the first's `transition` (and any other overlapping key) rather than merge them. This isn't a bug in the code shipped today (no consumer combines presets yet), but it's a foreseeable Phase 10 footgun given `variants.tapPress`/`variants.hover` are explicitly designed as pairing presets.
**Fix:** Document (in `MOTION.md` or a code comment) that combining presets requires manual merging (e.g. spreading `whileTap`/`whileHover` from one preset's result alongside another preset's `initial`/`animate`/`exit`, with a single shared `transition`), or add a small helper for composing two presets safely.

---

_Reviewed: 2026-09-21T10:45:58Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
