# Phase 12: Verification & Parity - Context

**Gathered:** 2026-09-21
**Status:** Verification phase (no feature build)
**Mode:** Auto-generated (discuss skipped; milestone brief is the spec)

<domain>
## Phase Boundary

Final milestone gate. Confirm the SmoothUI re-shape (Phases 9–11) did NOT weaken the three invariants, and gather evidence for the human visual/parity sign-off. No new features.

Requirements: INV-01 (colours/type unchanged + theming correct everywhere), INV-02 (client-side E2E encryption boundary intact — key never reaches server), INV-03 (web/PWA/TWA parity — theme + assets in all three; PWA app-shell cache valid).
</domain>

<decisions>
## Verification approach

**Automated (done / to confirm):**
- INV-01: git diff of `design-system/tokens/` across the whole v1.1 range is EMPTY (confirmed); no colour/type token changed. Grep for stray hardcoded colours introduced by the re-shape. Confirm next-themes wiring intact and build renders home/upload/download.
- INV-02: git diff of `src/lib/crypto.ts`/`storage.ts`/`server-storage.ts`/`blob-storage.ts`/`multi-file.ts` across v1.1 is EMPTY (confirmed). Full crypto test suite green. Deep security audit that no re-shaped component/page leaks the decryption key (URL fragment stays client-side; no key in any fetch/analytics/log). macOS interop wire-format vectors still match (unchanged crypto).
- INV-03: PWA manifest + service worker present; build output includes all routes; theme-adaptive brand assets present.
- Quality: design critique + a11y audit of the re-shaped UI (keyboard, focus-visible, APCA contrast, ARIA, reduced-motion, touch targets) — SmoothUI motion must not have broken a11y.

**Human sign-off (the gate — requires a person + devices):**
- Live light/dark/system visual pass across home/upload/download (motion feels right, no flashes, theming correct).
- Scroll-progress visually tracks scroll; download entrance doesn't replay across states (Phase 11 CR-01 — structurally verified, needs one live look).
- Toast geometry + progress spring-lag on a real fast transfer (Phase 10 10-03 flag).
- PWA install renders correctly; Android TWA on-device: theme + logos + asset-links intact.

## Constraints
- Verification only — do NOT change component/page behaviour. If a genuine invariant violation is found, fix minimally (through the review→fix loop) and re-verify.
</decisions>

<code_context>
- Milestone v1.1 phases 9–11 all complete + verified (foundation, component re-shape, page motion). 128 tests green; tsc only 3 pre-existing crypto.test.ts errors; build exit 0.
- Encryption model: key lives in the share link URL fragment, decryption client-side; server never sees the key. `src/lib/crypto.ts` untouched this milestone.
- PWA: `public/manifest.webmanifest`, `public/sw.js`. Android TWA on Google Play. macOS sender app matches the web AES-GCM wire format (`macos/scripts/verify-interop.mjs`).
</code_context>

<deferred>
## Deferred
- None — this is the terminal phase. Live human sign-off items are surfaced as the milestone's final gate, not deferred to a later milestone.
</deferred>
