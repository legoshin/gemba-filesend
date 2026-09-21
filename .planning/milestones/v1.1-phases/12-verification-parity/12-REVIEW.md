---
phase: 12-verification-parity
reviewed_at: 2026-09-21
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
worktree: /Users/lego/dev/gemba-filesend/.claude/worktrees/agent-a24089fb6ee3979d5
branch: worktree-agent-a24089fb6ee3979d5
base_commit: 9bce3d9e
---

# Phase 12: Design + A11y Fidelity Audit — Fix Report

Milestone audit of the SmoothUI re-shape (Phases 9–11), covering design-token
fidelity and accessibility on the live upload/download/nav surfaces. All
in-scope findings were fixed; Radix behaviour, colours/type, and
crypto/upload/download logic are unchanged.

**Base check:** origin/main was `9bce3d9e` at start, matching the worktree's
HEAD — no merge was required.

## Fixed Issues

### CR-01: Progress `value` not forwarded to Radix Root (A11Y-CRITICAL)

**File:** `src/components/ui/progress.tsx`
**Commit:** `ec72146a`
**Issue:** `value` was destructured to drive the motion `x` fill transform but
never passed to `ProgressPrimitive.Root` (`MotionRoot`), so Radix emitted no
`aria-valuenow`/`aria-valuemin`/`aria-valuemax`/`data-state` — breaking
screen-reader announcement on the live upload/download transfer bars (WCAG
4.1.2).
**Applied fix:** Forward `value` and `max` to `MotionRoot` while keeping the
motion transform on the indicator only.
**Acceptance check:** No component-render test harness exists in this repo
(no `@testing-library/react`/jsdom dependency; all existing `*.test.ts` files
are `lib/` unit tests). Rather than introduce new test infrastructure
out-of-scope for this fix, verified via a build-time grep instead, per the
finding's own suggested alternative:
```
grep -A3 "<MotionRoot" src/components/ui/progress.tsx | grep -q "value={value}"
# → PASS: value reaches Root
```

### CR-02: Dialog/Sheet raw border + shadow-lg instead of token pattern (DESIGN-CRITICAL)

**File:** `src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx`
**Commit:** `63c3e433`
**Issue:** `DialogContent`/`SheetContent` used a raw Tailwind `border` +
`shadow-lg` instead of the app's inset-ring + soft-shadow token system that
Card/DropdownMenuContent/Input/Sonner all use — a design-fidelity breach,
live on the upload encryption-failure Dialog.
**Applied fix:** Replaced `bg-background` / `border` / `shadow-lg` with
`bg-[var(--surface-card)]` + `shadow-[var(--ring-border),var(--shadow-popover)]`
(the same recipe `DropdownMenuContent` already uses for its own popover
surface). Sheet's four per-side directional borders (`border-l/-r/-t/-b`)
were replaced by the same all-around inset ring — the outward edge is
naturally clipped by the viewport, so the visible result matches the prior
single-edge divider. No new colour/shadow value introduced — both tokens
(`--ring-border`, `--shadow-popover`) already existed in
`design-system/tokens/spacing.css`.

### WR-01: Dialog/Sheet close (X) button focus ring + hit-area (A11Y-WARNING)

**File:** `src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx`
**Commit:** `2995dd1c`
**Issue:** Close buttons used the legacy `focus:ring-ring`/`ring-offset-2`
utilities instead of the app's `focus-visible:shadow-[var(--ring-focus)]`
token, and had a hit-area no larger than the visible 16px icon.
**Applied fix:** Swapped the ring utilities for
`outline-none focus-visible:shadow-[var(--ring-focus)]` (matches
button.tsx/input.tsx), and added a `before:absolute before:-inset-[14px]`
pseudo-element to expand the click/touch target to 44px (16px icon +
2×14px) without changing the visible icon size or panel layout.

### WR-02: Checkbox off-scale radius + checkbox/radio hit-area (DESIGN+A11Y-WARNING)

**File:** `src/components/ui/checkbox.tsx`, `src/components/ui/radio-group.tsx`
**Commit:** `2aefb64c`
**Issue:** `checkbox.tsx` used `rounded-[6px]`, off the app's radius scale
(8/12/16/24/32/40/48px). Both Checkbox and RadioGroupItem also had an 18px
hit-area, below the 24px WCAG 2.5.5 minimum.
**Applied fix:** `rounded-[6px]` → `rounded-[var(--radius-sm)]` (8px, the
nearest scale step — documented inline as the chosen step). Added
`before:absolute before:-inset-[13px]` to both Checkbox and RadioGroupItem,
expanding the touch target to ~44px (18px control + 2×13px) without growing
the visible control.

### WR-03: Button `lg`/`icon-lg` radius inconsistent with `default`/`sm` (DESIGN-WARNING)

**File:** `src/components/ui/button.tsx`
**Commit:** `3570b346`
**Issue:** `lg` and `icon-lg` (both `h-10`/`size-10`) used `rounded-md`
while `default`/`sm` used `rounded-[var(--radius-xl)]` — an inconsistent
radius within the same height group.
**Applied fix:** `lg` and `icon-lg` now use `rounded-[var(--radius-xl)]`,
matching `default`. All variants/sizes preserved; only the radius utility
changed.

### WR-04: Raw `animate-spin` spinners not gated on reduced-motion (A11Y-WARNING)

**File:** `src/app/download/page.tsx` (~line 891), `src/components/ui/sonner.tsx` (~line 28)
**Commit:** `5e691c01`
**Issue:** The download page's transfer spinner and sonner's loading-toast
icon use raw CSS `animate-spin`, not covered by `MotionConfig`'s
reduced-motion handling.
**Applied fix:** Added `motion-reduce:animate-none` to both, mirroring
`skeleton.tsx`'s existing pulse-gating pattern.

### WR-05: Desktop nav missing `aria-current` + focus ring (A11Y-WARNING)

**File:** `src/components/app-shell.tsx`, `src/components/mobile-tab-bar.tsx`
**Commit:** `aeefce19`
**Issue:** The desktop top-nav active `Link` had no `aria-current="page"`
(the mobile tab bar already sets it). Neither desktop nor mobile nav links
had a visible focus ring.
**Applied fix:** Added `aria-current={active ? "page" : undefined}` to the
desktop nav Link, and `outline-none focus-visible:shadow-[var(--ring-focus)]`
to both the desktop nav links and mobile-tab-bar links.

### WR-06: Encryption-failure dialog has no clear primary action (DESIGN-WARNING)

**File:** `src/app/upload/page.tsx` (~lines 865-884)
**Commit:** `16ac17bb`
**Issue:** The three footer actions (Cancel / Retry Encryption / Upload
Unencrypted) were all `secondary`/`destructive`, with no primary button to
guide the user toward the safe recommended action.
**Applied fix:** Changed "Retry Encryption" from `variant="secondary"` to
`variant="default"` (primary). Cancel stays `secondary`, "Upload
Unencrypted" stays `destructive`. Variant-only change — handlers and
encryption logic untouched.

## Deferred / Follow-up

Out of scope per the audit brief — not fixed, listed here for a future pass:

- **Home-page uniform 3-column feature grid** — pre-existing from the
  Phase-1 content redesign; not part of this milestone's component/a11y
  scope.
- **Download page h1→h3 heading-level skip** — pre-existing heading
  hierarchy gap, predates the SmoothUI re-shape.
- **Missing skip-to-content link** — pre-existing a11y gap across all
  pages.
- **Decorative-icon `aria-hidden` polish** — optional cosmetic a11y
  cleanup (icons paired with visible text labels are already
  non-blocking for screen readers; unlabelled decorative icons could
  still get `aria-hidden="true"` in a future pass).

See `12-SECURITY.md` for the two accepted low-severity ScrollProgress
scroll-handler risks (T-11-06/T-11-09) carried over from Phase 11.

## Verification

Run inside the isolated worktree (`.claude/worktrees/agent-a24089fb6ee3979d5`,
branch `worktree-agent-a24089fb6ee3979d5`), not the main checkout — results
are recorded here for reproducibility since the worktree is torn down after
this run.

| Check | Result |
|---|---|
| `npm run build` | exit 0 (1 pre-existing Tailwind CSS warning from `design-system/MOTION.md`'s literal `--radius-*` string, unrelated to this fix set) |
| `npx vitest run` | 128/128 passed (10 test files) |
| `npx tsc --noEmit` | only the 3 pre-existing `src/lib/crypto.test.ts` `BlobPart`/`SharedArrayBuffer` errors remain (confirmed identical before and after this fix set) |
| `npx eslint` on touched files | clean |
| `git diff --stat -- design-system/tokens/ src/lib/crypto.ts src/lib/storage.ts src/lib/multi-file.ts` (base→HEAD) | empty (scope guard held) |

## Commits (base `9bce3d9e` → HEAD, this branch only)

1. `ec72146a` — fix(12): forward value/max to Progress Root for ARIA (A11Y-CRITICAL)
2. `63c3e433` — fix(12): replace raw border+shadow-lg with ring+token pattern on Dialog/Sheet (DESIGN-CRITICAL)
3. `2995dd1c` — fix(12): token focus ring + 44px hit-area on Dialog/Sheet close buttons (A11Y-WARNING)
4. `2aefb64c` — fix(12): checkbox radius token + 44px hit-area on checkbox/radio (DESIGN+A11Y-WARNING)
5. `3570b346` — fix(12): align lg/icon-lg radius with default/sm at h-10 (DESIGN-WARNING)
6. `5e691c01` — fix(12): gate raw animate-spin spinners on prefers-reduced-motion (A11Y-WARNING)
7. `aeefce19` — fix(12): desktop nav aria-current + focus ring on nav links (A11Y-WARNING)
8. `16ac17bb` — fix(12): make Retry Encryption the primary action in failure dialog (DESIGN-WARNING)

---

_Fixed: 2026-09-21_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
