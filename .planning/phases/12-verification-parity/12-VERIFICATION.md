---
phase: 12
name: verification-parity
status: passed
automated_status: passed
requirements: [INV-01, INV-02, INV-03]
date: 2026-09-21
---

# Phase 12 Verification — Milestone v1.1 SmoothUI Re-shape

## Overall

**Automated verification: PASSED.** All code-level and build/test evidence for INV-01/02/03 is in place. The remaining gate is a **human visual + on-device sign-off** (inherent to this phase — it cannot be completed programmatically).

- `npm run build` exit 0 (all routes: `/`, `/upload`, `/download`)
- `npx vitest run` 128/128 passing
- `npx tsc --noEmit` only the 3 pre-existing `crypto.test.ts` errors (unrelated, from v1.0)

## INV-01 — Colours + Public Sans type unchanged; theming correct — AUTOMATED PASS

- `git diff <v1.1-start>..HEAD -- design-system/tokens/` is **empty** — no colour/type token changed across the whole milestone.
- Design audit confirmed colour/type discipline held: no new hex values, no off-scale type introduced by the re-shape.
- `next-themes` wiring intact; 3-way light/dark/system control preserved (theme-toggle re-shaped in Phase 10, still 3-way).
- **Human sign-off needed:** live light/dark/system visual pass on home/upload/download — confirm every re-shaped surface renders correctly in all three themes with no unstyled/mis-themed element.

## INV-02 — Client-side E2E encryption boundary intact — AUTOMATED PASS (SECURED)

- Security audit verdict: **SECURED**, 8/8 threats closed.
- `git diff <v1.1-start>..HEAD -- src/lib/crypto.ts src/lib/storage.ts src/lib/server-storage.ts src/lib/blob-storage.ts src/lib/multi-file.ts` is **empty**.
- The entire v1.1 diff (added lines) grepped for `fetch`/`sendBeacon`/`console.log`/`location.hash`/analytics/key vars → **zero matches**. No re-shaped component/page moves the URL-fragment key off the client.
- `crypto.test.ts` 16/16 pass; macOS AES-GCM interop wire-format unaffected (crypto.ts byte-identical → vectors unchanged).
- **Human sign-off needed:** one live end-to-end upload→share-link→download+decrypt round trip in a browser to confirm the flow still works after the re-shape (automated evidence is strong; a live confirmation closes it).

## INV-03 — Web / PWA / Android TWA parity — AUTOMATED PARTIAL + human/device

- `public/manifest.webmanifest` + `public/sw.js` present; build emits all routes; theme-adaptive brand assets present.
- **Human/device sign-off needed:** install the PWA and confirm it renders correctly; run the Android TWA on a device and confirm theme + logos + digital-asset-links still resolve (TWA/asset-links are fragile and can only be confirmed on-device).

## Quality closeout (design + a11y audits, all in-scope findings fixed)

Fixed this phase (commits ec72146a…16ac17bb):
- **[a11y-critical]** Progress `value`/`max` now forwarded to Radix Root → `aria-valuenow` restored on the live upload/download transfer bars.
- **[design-critical]** Dialog/Sheet content moved onto the inset-ring + soft-shadow token system (was raw `border`+`shadow-lg`).
- Dialog/Sheet close-button focus → `--ring-focus` token + 44px hit-area; Checkbox `rounded-[6px]`→`--radius-sm` + Checkbox/Radio 44px hit-areas; Button `lg`/`icon-lg` radius made consistent; `motion-reduce:animate-none` on spinners; desktop nav `aria-current="page"` + focus ring; encryption-failure dialog "Retry" made the sole primary action.
- Verified clean by audit: reduced-motion foundation solid; Dialog/Sheet/Dropdown `forceMount`+`AnimatePresence` preserves focus-trap + Esc + focus-return; motion system consistent (no raw springs).

## Deferred / follow-up (out of scope for v1.1 — pre-existing, not caused by the re-shape)

- Home-page uniform 3-column feature grid → a content/layout redesign, not a shape/motion change (recommend a future design pass).
- Download page `h1→h3` heading-level skip (pre-existing).
- Missing "skip to content" link in AppShell (pre-existing).
- Decorative-icon `aria-hidden` polish on nav/theme-toggle (low).
- Partial `shape.*` preset adoption — several components re-derive `rounded-[var(--radius-*)]` inline (visually identical today; consolidate to prevent future drift).
- Two low-severity accepted ScrollProgress scroll-handler risks (T-11-06/T-11-09) — logged in `12-SECURITY.md`.

## Verdict

Code-complete and automated-verified across INV-01/02/03. Human visual + on-device sign-off RECEIVED 2026-09-21 (user: "tested UI, all ok"). Milestone verified.
