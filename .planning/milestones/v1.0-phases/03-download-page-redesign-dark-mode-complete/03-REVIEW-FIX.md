---
phase: 03-download-page-redesign-dark-mode-complete
fixed_at: 2026-07-11T17:46:31Z
review_path: .planning/phases/03-download-page-redesign-dark-mode-complete/03-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-07-11T17:46:31Z
**Source review:** .planning/phases/03-download-page-redesign-dark-mode-complete/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (WR-01 through WR-05; fix_scope = critical_warning, Info findings IN-01/IN-02/IN-03 out of scope and untouched)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### WR-01: Unhandled promise rejection if `/meta` response body isn't valid JSON

**Files modified:** `src/app/download/page.tsx`
**Commit:** df67425
**Applied fix:** Wrapped `await res.json()` in a try/catch inside `fetchFileInfo`. On parse failure, shows `toast.error("Received an invalid response from the server")` and returns, instead of leaving an unhandled rejection with the UI silently stuck in `"input"` state.

### WR-02: `/meta` response consumed without a type guard

**Files modified:** `src/app/download/page.tsx`
**Commit:** 99a5700
**Applied fix:** Added `isMetaPayload()`, a runtime type guard (`obj is {...}`) matching the existing `validateClientMeta()` convention in `src/app/api/files/route.ts`. `fetchFileInfo` now parses the response as `unknown`, validates it with `isMetaPayload`, and on failure shows a toast plus transitions to the `"invalid-link"` state instead of trusting a blind `as` cast.

### WR-03: Active tab in mobile nav has no `aria-current`

**Files modified:** `src/components/mobile-tab-bar.tsx`
**Commit:** a6da0f7
**Applied fix:** Added `aria-current={active ? "page" : undefined}` to the active `<Link>` in the tab bar, exactly as suggested in the review.

### WR-04: ThemeToggle hand-rolls radio selection instead of reusing `DropdownMenuRadioGroup`/`DropdownMenuRadioItem`

**Files modified:** `src/components/theme-toggle.tsx`
**Commit:** 902627a
**Applied fix:** Rebuilt the three theme options using `DropdownMenuRadioGroup value={theme} onValueChange={setTheme}` wrapping three `DropdownMenuRadioItem`s (light/dark/system), removing the duplicated ternary and manual `Check` icon. Preserved the same visible labels/icons and the icon-only trigger with its `aria-label`. Verified `--accent`/`--popover` in `globals.css` alias to gemba tokens (`--surface-subdued`, `--text-primary`, `--surface-card`), so `DropdownMenuRadioItem`'s legacy-shadcn-named classes resolve to defined design-system colors — no invented tokens introduced. Padding/indicator layout (`pl-8`, absolute `CircleIcon`) is the standard Radix radio-item pattern and was left as-is per the review's own note and the IN-03 out-of-scope boundary (not touched).

### WR-05: Service worker registration failure is silently swallowed

**Files modified:** `src/app/layout.tsx`
**Commit:** f14a1ad
**Applied fix:** Replaced `.catch(() => {})` with `.catch((err) => console.error('SW registration failed', err))` on the inline SW registration script.

## Skipped Issues

None — all 5 in-scope findings were fixed.

## Verification

- `npx tsc --noEmit`: exit 0, no errors
- `npm run lint`: 0 errors, 4 pre-existing warnings (unrelated files: `last-ndc.ts`, `Radio.jsx`, `icon-data.js` — all outside `src/`, per constraint these are acceptable)
- `npm run build`: exit 0, compiled successfully

Encryption boundary re-checked after fixes: the decryption key (`keyBase64`) is still only ever read from `url.hash` client-side and passed to `importKeyBase64`/`decryptPacked`; no fix touched key handling, headers, or logging in a way that could leak it.

---

_Fixed: 2026-07-11T17:46:31Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
