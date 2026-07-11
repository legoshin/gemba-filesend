---
phase: 03-download-page-redesign-dark-mode-complete
reviewed: 2026-07-11T18:20:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/app/download/page.tsx
  - src/app/layout.tsx
  - src/components/mobile-tab-bar.tsx
  - src/components/theme-toggle.tsx
  - src/components/ui/dropdown-menu.tsx
findings:
  critical: 0
  warning: 5
  info: 3
  total: 8
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-07-11T18:20:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Reviewed the download page redesign and dark-mode completion changes with particular attention to the client-side-encryption boundary (the AES key lives in the URL fragment) and to correctness/a11y in the theme-toggle and navigation components.

**Encryption boundary: verified clean.** In `src/app/download/page.tsx`, the decryption key (`keyBase64`, extracted from `url.hash`) is only ever passed to `importKeyBase64`/`decryptPacked` client-side and stored in React state. It is never included in any `fetch` request (only `id` — always `encodeURIComponent`-escaped — and the `x-password` header are sent to the server), never interpolated into an error message or toast, and never written into a DOM attribute other than the (transient, only-in-`"input"`-state) share-link `<Input value={link}>`, which merely mirrors what the user already sees in the browser's own address bar. No `console.log` of key material, no `dangerouslySetInnerHTML` in these files, no `eval`. Password is sent in a header for server-side hash verification only, matching the documented "SHA-256 for storage verification only, not key derivation" model — not a new issue.

No Critical-severity findings. The issues below are correctness/robustness gaps and a11y/consistency gaps that should be fixed but do not represent an immediate security or data-loss risk.

## Warnings

### WR-01: Unhandled promise rejection if `/meta` response body isn't valid JSON

**File:** `src/app/download/page.tsx:115`
**Issue:** `fetchFileInfo` wraps only the `fetch()` call itself in try/catch (lines 94-100); the subsequent `await res.json()` on line 115 is unguarded. `fetchFileInfo` is always invoked as `void fetchFileInfo(...)` (lines 140, 148), so if the meta endpoint ever returns a 2xx response with a non-JSON or malformed body, the rejection is unhandled: no toast, no state transition — the "Fetch file info" button silently does nothing and `state` stays `"input"` forever with zero user feedback.
**Fix:**
```ts
let data: { name: string; type: string; size: number; passwordProtected: boolean; downloadsRemaining: number; expiresAt: number };
try {
  data = await res.json();
} catch {
  toast.error("Received an invalid response from the server");
  return;
}
```

### WR-02: `/meta` response consumed without a type guard

**File:** `src/app/download/page.tsx:115-134`
**Issue:** The JSON payload is cast with `as {...}` and used directly (`formatSize(data.size)`, `formatExpiresIn(data.expiresAt)`, etc.) without any runtime validation. Per this codebase's own stated convention ("Validate all input data with type guards before processing… Never trust external data (API responses)"), this API response should be validated the same way client metadata is validated elsewhere (`validateClientMeta()`). A missing/mistyped field (e.g. `size` absent or a string) silently produces garbage output (`NaN B`, `Invalid Date`-ish `expiresIn`) instead of a clear error.
**Fix:** Add a small type guard (or reuse/extend the pattern used for `validateClientMeta`) before calling `setFileInfo`, and surface a toast + `invalid-link`-style state on failure instead of trusting the shape blindly.

### WR-03: Active tab in mobile nav has no `aria-current`

**File:** `src/components/mobile-tab-bar.tsx:24-34`
**Issue:** The currently active tab is only distinguished by a text-color change (`text-[var(--text-primary)]` vs `text-[var(--text-subdued)]`) and a `font-bold` label. There is no `aria-current="page"` (or equivalent) on the active `<Link>`, so screen-reader users get no semantic signal for which tab is selected — this combines a WCAG "use of color alone" concern with a missing ARIA state that assistive tech relies on for tab-bar/nav patterns.
**Fix:**
```tsx
<Link
  key={tab.href}
  href={tab.href}
  aria-label={tab.label}
  aria-current={active ? "page" : undefined}
  className={...}
>
```

### WR-04: ThemeToggle hand-rolls radio selection instead of reusing `DropdownMenuRadioGroup`/`DropdownMenuRadioItem`

**File:** `src/components/theme-toggle.tsx:33-55`
**Issue:** The three theme options are implemented as plain `DropdownMenuItem`s with a manually repeated ternary (`theme === "light" ? "gemba-body-strong" : "gemba-body"`, duplicated 3x) and a manually placed `<Icon name="Check" .../>` to indicate selection. `dropdown-menu.tsx` (also in this review) already exports `DropdownMenuRadioGroup`/`DropdownMenuRadioItem` built exactly for this "single choice from N options" case, which also renders with the correct `menuitemradio` role/`aria-checked` state for assistive tech — semantics the current hand-rolled version doesn't provide (a screen reader announces these as plain `menuitem`, not conveying which theme is currently selected). This is both a "Reuse First" violation (CLAUDE.md hard rule: reuse existing shared components/patterns rather than hand-rolling a one-off) and an a11y regression versus the primitive that's already available in the same file.
**Fix:** Rebuild using `DropdownMenuRadioGroup value={theme} onValueChange={setTheme}` wrapping three `DropdownMenuRadioItem`s (`light`/`dark`/`system`), removing the duplicated ternary and manual checkmark.

### WR-05: Service worker registration failure is silently swallowed

**File:** `src/app/layout.tsx:83-91`
**Issue:** `navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})` discards the error entirely. If registration fails (e.g. scope conflict, invalid SW script after a bad deploy), there is no way to diagnose it — PWA installability and offline behavior silently degrade with zero trace, contradicting the project convention of never silently swallowing errors.
**Fix:** At minimum log the failure for diagnostics (e.g. `.catch((err) => console.error('SW registration failed', err));`), or report it via existing error-reporting infrastructure if one exists.

## Info

### IN-01: Inconsistent `void` usage on fire-and-forget async handlers

**File:** `src/app/download/page.tsx:400, 421` (vs. `140`)
**Issue:** `handleFetchInfo` explicitly marks the async call as fire-and-forget (`void fetchFileInfo(link)`, line 140), but the async `handleDownload` is invoked directly and un-`void`-ed both from `onClick={handleDownload}` (line 421) and `onKeyDown={(e) => e.key === "Enter" && handleDownload()}` (line 400). Inconsistent handling of floating promises within the same file.
**Fix:** Use `onClick={() => void handleDownload()}` and `onKeyDown={(e) => e.key === "Enter" && void handleDownload()}` for consistency (and to satisfy stricter `no-floating-promises`-style lint rules if enabled later).

### IN-02: `expiresIn` is computed once and goes stale

**File:** `src/app/download/page.tsx:131` (definition: `49-63`)
**Issue:** `formatExpiresIn(data.expiresAt)` is evaluated a single time when the metadata is fetched and stored as a formatted string in `fileInfo.expiresIn`. If a user leaves the "preview" screen open (e.g., shows "1 minute" left) and waits before clicking download, the displayed value never updates and can become materially wrong right up to (and past) the point the link actually expires.
**Fix:** Store `expiresAt` (the timestamp) in `fileInfo` instead of a pre-formatted string, and compute the display string at render time (optionally on an interval) so it stays accurate.

### IN-03: Incomplete design-token migration in `dropdown-menu.tsx` leaves legacy classes on unused-by-this-feature variants

**File:** `src/components/ui/dropdown-menu.tsx:85-109, 122-144, 201-223, 225-239`
**Issue:** `DropdownMenuContent`/`DropdownMenuItem` were migrated to the gemba token pattern (`bg-[var(--surface-card)]`, `rounded-[var(--radius-sm)]`, `shadow-[var(--ring-border),var(--shadow-popover)]`), but `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem`, `DropdownMenuSubTrigger`, and `DropdownMenuSubContent` still use the legacy shadcn defaults (`bg-accent`, `text-accent-foreground`, `bg-popover`, `text-popover-foreground`, `shadow-lg`, generic `border`/`rounded-md`). These currently resolve to the correct colors only because `globals.css` still aliases `--accent`/`--popover` back to the gemba surface tokens, so there's no visible breakage today (and none of these variants are used by `ThemeToggle`), but it's a half-finished migration that will silently regress if that alias layer is ever removed, and it violates the "only use design-system tokens" constraint for any future consumer of these unmigrated variants.
**Fix:** Finish the migration on the remaining variants to use the same `var(--...)` token references as `DropdownMenuContent`/`DropdownMenuItem`, or explicitly document why they're intentionally deferred (e.g., unused in current app).

---

_Reviewed: 2026-07-11T18:20:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
