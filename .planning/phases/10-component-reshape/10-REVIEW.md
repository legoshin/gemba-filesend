---
phase: 10-component-reshape
reviewed: 2026-09-21T12:08:51Z
depth: deep
files_reviewed: 24
files_reviewed_list:
  - src/components/ui/input.tsx
  - src/components/ui/label.tsx
  - src/components/ui/checkbox.tsx
  - src/components/ui/radio-group.tsx
  - src/components/ui/switch.tsx
  - src/components/ui/button.tsx
  - src/components/ui/card.tsx
  - src/components/ui/badge.tsx
  - src/components/ui/avatar.tsx
  - src/components/ui/separator.tsx
  - src/components/ui/dialog.tsx
  - src/components/ui/sheet.tsx
  - src/components/ui/dropdown-menu.tsx
  - src/components/ui/tabs.tsx
  - src/components/ui/progress.tsx
  - src/components/ui/sonner.tsx
  - src/components/ui/skeleton.tsx
  - src/components/file-dropzone.tsx
  - src/app/upload/page.tsx
  - src/app/download/page.tsx
  - src/components/app-shell.tsx
  - src/components/mobile-tab-bar.tsx
  - src/components/theme-toggle.tsx
  - src/lib/motion.ts
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
status: fixed
fixed_at: 2026-09-21T13:20:00Z
fixed_commits: 6
---

# Phase 10: Code Review Report

**Reviewed:** 2026-09-21T12:08:51Z
**Depth:** deep
**Files Reviewed:** 24
**Status:** issues_found → all findings fixed (see "Fixes Applied" below)

## Summary

Reviewed the full Phase 10 diff (`ca0dcbdb..HEAD`) across all 20 changed component files plus `src/lib/motion.ts`. The encryption boundary held: `file-dropzone.tsx`, `upload/page.tsx`, and `download/page.tsx` diffs are presentational-only (row extraction for `useMotionPreset`, `AnimatePresence`/`Skeleton` wiring) — no line touches `crypto.ts`, key handling, `encryptPacked`/`decryptPacked`, or upload/download control flow, and the new `isFetchingInfo` flag is a plain UI loading-state boolean. Every `motion.create(...)` call across all 20 files is hoisted to module scope (no CR-01 regression), `tsc --noEmit` reports zero new errors in any reshaped file, and the `NativeMotionConflicts`/`Omit` pattern type-checks cleanly everywhere it's used.

The one real defect is in the Dialog/Sheet `forceMount`+`AnimatePresence` wrapper: it gates its entire `children` prop (which includes `DialogTrigger`/`SheetTrigger` in the standard, exported composition pattern) by the resolved `isOpen` state, so the trigger unmounts whenever the dialog/sheet is closed — making it unopenable. This doesn't manifest in the app today only because the single live `<Dialog>` call site (`upload/page.tsx`) is fully controlled with no `DialogTrigger` child; `Sheet` has zero call sites. Tellingly, the `DropdownMenu` wrapper committed in the same plan wave (10-05) explicitly identifies and avoids this exact failure mode via a context provider (see its own code comment: "unlike Dialog/Sheet, DropdownMenu's children always include a Trigger that must stay mounted while closed") — confirming this is a known-but-unaddressed gap rather than a deliberate constraint, and `ThemeToggle` (`theme-toggle.tsx:34-40`) proves the Trigger+Content composition is the codebase's actual idiom, just not yet used with Dialog/Sheet.

A related, lower-severity issue: `DialogOverlay`/`DialogContent`/`SheetOverlay`/`SheetContent` spread caller `props` onto the inner `motion.div` rather than the outer Radix `asChild` primitive, which silently drops Radix's own behavioral callback props (`onEscapeKeyDown`, `onPointerDownOutside`, `onInteractOutside`, `onOpenAutoFocus`, `onCloseAutoFocus`) instead of forwarding them to Radix's dismissable-layer/focus-scope logic — `DropdownMenuContent` in the same file family avoids this by wrapping the Radix primitive directly with `motion.create()` instead of using `asChild`.

## Critical Issues

### CR-01: Dialog/Sheet unmount their own Trigger whenever closed

**File:** `src/components/ui/dialog.tsx:56-67` (and identically `src/components/ui/sheet.tsx:50-61`)
**Issue:** The `Dialog`/`Sheet` wrapper components gate their entire `children` prop — not just the content/overlay — behind the resolved `isOpen` state:

```tsx
return (
  <DialogPrimitive.Root data-slot="dialog" open={isOpen || showContent} onOpenChange={handleOpenChange} {...props}>
    <AnimatePresence onExitComplete={() => setShowContent(false)}>
      {isOpen ? children : null}
    </AnimatePresence>
  </DialogPrimitive.Root>
)
```

In the standard, documented Radix/shadcn composition this project itself exports and uses elsewhere (`DialogTrigger`, `SheetTrigger` are both exported from these files), a consumer writes:

```tsx
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>...</DialogContent>
</Dialog>
```

`children` here is *both* the trigger and the content. On initial render `isOpen` is `false`, so `{isOpen ? children : null}` renders `null` — the trigger never mounts, and the dialog can never be opened by the user. This is not hypothetical: `theme-toggle.tsx:34-40` shows `DropdownMenuTrigger`+`DropdownMenuContent` used exactly this way in this codebase, and the `DropdownMenu` wrapper (`dropdown-menu.tsx:30-37`) was deliberately built with a context provider specifically to avoid gating the trigger for this reason — the same fix was not applied to Dialog/Sheet. It only fails to manifest today because the sole current `<Dialog>` usage (`upload/page.tsx:836`) is fully controlled (`open={encryptionFailure !== null}`) with no `DialogTrigger` child, and `Sheet` has zero call sites in the app.

**Fix:** Mirror `DropdownMenu`'s approach — share the resolved `isOpen`/`onContentExitComplete` via context and only gate `DialogContent`/`DialogOverlay` (and `SheetContent`/`SheetOverlay`) internally, leaving `DialogTrigger`/`SheetTrigger` always mounted as a normal child of `DialogPrimitive.Root`:

```tsx
const DialogMotionContext = React.createContext<{ isOpen: boolean; onContentExitComplete: () => void }>(...)

function Dialog({ open, onOpenChange, children, ...props }) {
  // ...same isOpen/showContent bookkeeping...
  return (
    <DialogPrimitive.Root open={isOpen || showContent} onOpenChange={handleOpenChange} {...props}>
      <DialogMotionContext.Provider value={{ isOpen, onContentExitComplete: () => setShowContent(false) }}>
        {children}
      </DialogMotionContext.Provider>
    </DialogPrimitive.Root>
  )
}
```
with `DialogContent`/`DialogOverlay` reading `isOpen` from context and wrapping only themselves in `AnimatePresence`, the same way `DropdownMenuContent` already does.

## Warnings

### WR-01: Dialog/Sheet Overlay/Content route caller props to the wrong element, dropping Radix's dismiss/focus callbacks

**File:** `src/components/ui/dialog.tsx:104-111, 130-139`; `src/components/ui/sheet.tsx:98-105, 141-153`
**Issue:** `DialogOverlay`, `DialogContent`, `SheetOverlay`, and `SheetContent` all use the `asChild` pattern, but spread the caller's rest `props` onto the *inner* `motion.div` instead of the *outer* Radix primitive that carries `asChild`:

```tsx
<DialogPrimitive.Content data-slot="dialog-content" asChild forceMount>
  <motion.div className={...} {...panelMotion} {...props}>
```

Radix's own behavioral props (`onEscapeKeyDown`, `onPointerDownOutside`, `onInteractOutside`, `onOpenAutoFocus`, `onCloseAutoFocus`) are consumed by `DialogPrimitive.Content`/`Overlay` itself, not forwarded through to a child element — when using `asChild`, these props must be given to the Radix component, exactly as `MotionSlot`/`Comp` in `button.tsx:84-92` demonstrates (`{...press} {...hover} {...props}` spread directly onto `Comp`, which *is* the `asChild`-capable component). Any future caller passing e.g. `onOpenAutoFocus={...}` to `DialogContent` to prevent autofocus-stealing, or `onPointerDownOutside={(e) => e.preventDefault()}` to block dismissal during a critical action, will have the prop silently become an inert DOM attribute on `motion.div` — no error, no warning, and no effect. Not exercised today (no caller of `DialogContent`/`SheetContent` currently passes these props), but it's a genuine gap in the primitives' contract.
**Fix:** Spread the rest props onto the outer, `asChild`-bearing component instead:

```tsx
<DialogPrimitive.Content data-slot="dialog-content" asChild forceMount {...props}>
  <motion.div className={...} {...panelMotion}>
    {children}
    ...
  </motion.div>
</DialogPrimitive.Content>
```
(apply the same swap to `DialogOverlay`, `SheetOverlay`, `SheetContent`).

### WR-02: RadioGroupItem's dot has a dead `exit` animation — inconsistent with Checkbox's identical pattern

**File:** `src/components/ui/radio-group.tsx:32-51`
**Issue:** `RadioGroupItem` resolves `variants.scaleIn` (which declares both `animate` and `exit` states) and applies it to `MotionCircleIcon`, but — unlike `Checkbox` (`checkbox.tsx:48-62`), which explicitly adds `forceMount` to `CheckboxPrimitive.Indicator` and wraps the icon in `<AnimatePresence mode="wait">` — `RadioGroupPrimitive.Indicator` here has neither. Without `forceMount`, Radix unmounts the `Indicator` the instant the item becomes unchecked, and without an `AnimatePresence` ancestor, Framer Motion has no chance to intercept that unmount and play the declared `exit: { opacity: 0, scale: 0.9 }` — the icon just disappears instantly. The entrance animation (`initial`→`animate` on mount) still works since that doesn't require `AnimatePresence`, but the exit half of `variants.scaleIn` is silently inert here, which is inconsistent with the sibling `Checkbox` component using the exact same variant for the exact same "reveal a selection glyph" purpose.
**Fix:** Add `forceMount` to `RadioGroupPrimitive.Indicator` and wrap `MotionCircleIcon` in `<AnimatePresence mode="wait">{isSelected && (...)}</AnimatePresence>`, following the same pattern `Checkbox` already established (note `RadioGroupItem` doesn't currently track a local `checked`-equivalent state the way `Checkbox`/`Switch` do, since Radix doesn't expose per-item selection state as a prop here — would need to read `data-state` via a ref/observer, or accept the simpler fix of leaving entrance-only if exit isn't actually needed for radio dots).

### WR-03: `DropdownMenuSubContent` was left on the pre-Phase-10 CSS animation, inconsistent with its parent `DropdownMenuContent`

**File:** `src/components/ui/dropdown-menu.tsx:311-328`
**Issue:** `DropdownMenuContent` was migrated to the Motion-driven `forceMount`+`AnimatePresence`+`variants.menu` treatment (`dropdown-menu.tsx:108-136`), but `DropdownMenuSubContent` (nested submenu content) still uses the original Tailwind `data-[state=open]:animate-in data-[state=closed]:animate-out ...` classes untouched. Functionally this still works (Radix's own CSS-driven Presence still runs), but it means top-level dropdown menus and their nested submenus now animate via two different systems with different easing/duration characteristics, visible as a jarring tonal shift if a consumer opens a submenu.
**Fix:** Out of strict scope for this review since `DropdownMenuSubContent` wasn't in the phase's stated file list and nothing regressed — flagging for a follow-up pass so submenu open/close motion matches the top-level menu's `variants.menu`/`transitions.snappy`.

## Info

### IN-01: Checkbox/RadioGroup/Avatar were fully reshaped but have zero call sites in the app

**File:** `src/components/ui/checkbox.tsx`, `src/components/ui/radio-group.tsx`, `src/components/ui/avatar.tsx`
**Issue:** None of these three components are imported anywhere outside their own file (`grep` across `src` for `<Checkbox`, `<RadioGroup`, `<Avatar` returns no other matches). The controlled/uncontrolled state-bridging added to `Checkbox` (`checkbox.tsx:22-30`, explicitly commented "e.g. a future controlled call site") is therefore currently dead complexity, and WR-02 above (dead `exit` animation) is invisible in practice for the same reason.
**Fix:** No action needed if full design-system parity (including as-yet-unused primitives) is the intended Phase 10 charter — just noting these paths are unverified by any live rendering in the app today.

### IN-02: `file-dropzone.tsx`'s drag-scale value duplicates `variants.hover`'s magic number instead of reusing it

**File:** `src/components/file-dropzone.tsx:126-132`
**Issue:** `dropzoneMotion` hand-rolls a one-off preset (`animate: { scale: isDragging ? 1.02 : 1 }`) with the transition from `transitions.micro`, duplicating the same `1.02` scale factor already centralized as `variants.hover.full.whileHover.scale` in `lib/motion.ts:73`. It can't literally reuse `variants.hover` (that's a `whileHover` pair, this needs a state-conditional `animate`), but the repeated magic number suggests a shared `dragScale`/`liftScale` constant would be worth centralizing in `lib/motion.ts` alongside `variants`/`transitions`.
**Fix:** Extract the `1.02` value to a named constant in `lib/motion.ts` (e.g. `export const scale = { hover: 1.02 } as const`) and reference it from both `variants.hover` and `file-dropzone.tsx`.

### IN-03: `Switch`'s reduced-motion branch bypasses the centralized `resolveMotionPreset`

**File:** `src/components/ui/switch.tsx:371, 397`
**Issue:** Every other reshaped component resolves motion via `useMotionPreset(variants.X, transitions.Y)` → `resolveMotionPreset`. `Switch` instead calls `useReducedMotion()` directly and manually ternaries `transition={shouldReduceMotion ? { duration: 0 } : transitions.snappy}` next to a raw `animate={{ x: isChecked ? THUMB_TRAVEL_PX[size] : 0 }}`. This is defensible (the thumb's `x` travel is a per-size pixel constant, not expressible as a `{full, reduced}` variant pair), but it re-implements `resolveMotionPreset`'s reduced-motion branch (`{ duration: 0 }`) ad hoc rather than calling it, which is the one inline reduced-motion check in the whole Phase 10 diff.
**Fix:** No functional problem — flagging only because a future editor reading `resolveMotionPreset`'s doc comment ("never re-implemented inline") could reasonably read this as the one exception without an explanatory note as to why `Switch` can't go through the shared helper (its `animate` value must vary by `isChecked` × `size`, not `full`/`reduced`).

## Fixes Applied

All 7 findings were fixed in an isolated worktree (branch
`worktree-agent-af07f27a237878476`, base `origin/main@0288ee99`), one
commit per finding (CR-01/WR-01 share one commit — the WR-01 prop-routing
fix fell out of the same restructured hunks as CR-01's context-based
gating and could not be cleanly separated):

- **CR-01** (fixed): `Dialog`/`Sheet` no longer gate `children` by
  `isOpen`. Mirrored `DropdownMenu`'s context-sharing pattern — a
  `DialogMotionContext`/`SheetMotionContext` shares the resolved
  `isOpen`/`onContentExitComplete` from the root down to
  `DialogContent`/`SheetContent` (which now also renders `DialogOverlay`/
  `SheetOverlay` as a keyed sibling in the same `AnimatePresence`), leaving
  `DialogTrigger`/`SheetTrigger` always mounted. Verified the controlled
  `upload/page.tsx` call site (`<Dialog open={...}>`, no Trigger) is
  unaffected, and traced a `<Dialog><DialogTrigger/><DialogContent/></Dialog>`
  composition by hand to confirm the trigger now stays mounted while
  closed. No automated render test was added — the project's Vitest config
  is Node-environment only (`environment: "node"`, `include:
  ["src/**/*.test.ts"]`, no jsdom/@testing-library/react), so a React
  render assertion would require new test infrastructure out of scope for
  this fix pass.
- **WR-01** (fixed): `DialogOverlay`/`DialogContent`/`SheetOverlay`/
  `SheetContent` now spread `{...props}` onto the Radix `asChild`-bearing
  primitive instead of the inner `motion.div`, following `button.tsx`'s
  pattern.
- **WR-02** (fixed): `RadioGroup` now tracks its own controlled/
  uncontrolled current value (mirroring `Checkbox`'s `checked` tracking)
  and shares it via context; `RadioGroupItem` compares its own `value`
  against it to drive `forceMount` + `AnimatePresence mode="wait"`,
  matching `Checkbox`'s structure so the exit animation actually plays.
- **WR-03** (fixed): `DropdownMenuSub` got the same wrapper-owned
  resolved-open + context pattern as the root `DropdownMenu`, letting
  `DropdownMenuSubContent` run the same `forceMount`+`AnimatePresence`+
  `variants.menu`/`transitions.snappy` treatment as `DropdownMenuContent`
  instead of the pre-Phase-10 CSS `animate-in`/`animate-out` classes.
- **IN-02** (fixed): added `scale.hover = 1.02` to `lib/motion.ts`;
  `variants.hover` and `file-dropzone.tsx`'s `dropzoneMotion` both
  reference it now instead of duplicating the literal.
- **IN-03** (fixed): added a one-line comment to `switch.tsx` explaining
  why it calls `useReducedMotion()` directly instead of going through
  `useMotionPreset`/`resolveMotionPreset`.
- **IN-01** (left as-is per instruction — no action needed, unused call
  sites are expected for full design-system parity).

**Verification:** `npm run build` (exit 0), `npx vitest run` (127/127
pass, matches baseline), `npx tsc --noEmit` (only the 3 pre-existing
`crypto.test.ts` `SharedArrayBuffer`/`BlobPart` errors, unrelated to this
phase). Scope guards: `git diff origin/main -- src/lib/crypto.ts
src/lib/storage.ts src/lib/multi-file.ts` is empty (no encryption/upload/
download logic touched); no design-system token files changed; only
`file-dropzone.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `radio-group.tsx`,
`sheet.tsx`, `switch.tsx`, `lib/motion.ts` were modified.

---

_Reviewed: 2026-09-21T12:08:51Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Fixed: 2026-09-21T13:20:00Z_
_Fixer: Claude (gsd-code-fixer)_
