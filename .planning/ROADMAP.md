# Roadmap: Gemba Filesend — Redesign + Hardening

## Overview

This milestone re-skins Gemba Filesend to the Gemba design system end-to-end and closes the highest-priority security/reliability gaps. Foundation tokens and the shared component layer land together with a fully-themed home page (Phase 1), then each remaining page — upload (Phase 2), download (Phase 3) — is redesigned in place reusing those components, with the download phase also closing out full light/dark/system theme coverage across the whole app. A final hardening phase (Phase 4) adds security headers, rate limiting, fixes the download-counter race, and brings the crypto/password/counter/metadata logic under test.

**v1.1 SmoothUI Re-shape** (Phases 9-12): the entire web UI (root `src/` Next.js app) is re-shaped onto the SmoothUI component language — new geometry (radii/borders/shape) and SmoothUI motion built on `motion` — while keeping the existing Gemba colour palette and Public Sans type tokens unchanged. A foundation phase (Phase 9) installs the motion library and a shared shape+motion utility layer; every shared and app-specific component is then re-shaped onto it (Phase 10); page-level entrance motion and scroll progress land next (Phase 11); a final phase (Phase 12) verifies colours/type/theming, the client-side encryption boundary, and web/PWA/TWA parity are all unweakened, gated on human visual sign-off.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Design Foundation & Home Page** - Wire Gemba tokens app-wide, build the shared component layer, redesign home page in light + dark (completed 2026-07-10)
- [x] **Phase 2: Upload Page Redesign** - Redesign the upload flow (dropzone, options, share link) to the design system, theme-aware (completed 2026-07-10)
- [x] **Phase 3: Download Page Redesign & Dark Mode Complete** - Redesign the download flow to the design system; verify light/dark/system theming across the entire app (completed 2026-07-11)
- [x] **Phase 4: Security, Reliability & Test Hardening** - Security headers, rate limiting, fix the download-counter race, add unit test coverage (completed 2026-07-11)
- [x] **Phase 9: SmoothUI Foundation** - Install `motion` + build the shared shape/motion utility layer, reduced-motion handling, and document the new shape + motion language (completed 2026-09-21)
- [ ] **Phase 10: Component Re-shape** - Re-shape every shared + app-specific component (forms, buttons, surfaces, feedback, file/list, shell) onto SmoothUI geometry and motion
- [ ] **Phase 11: Page Motion** - Add SmoothUI entrance motion and a scroll-progress indicator across home, upload, and download
- [ ] **Phase 12: Verification & Parity** - Confirm colours/type/theming, the encryption boundary, and web/PWA/TWA parity are unweakened by the re-shape (human sign-off)

## Phase Details

### Phase 1: Design Foundation & Home Page

**Goal**: The Gemba design system is wired into the app as the single source of visual truth, the shared component layer exists, and the home page is fully redesigned and theme-aware in both light and dark.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: DESIGN-01, DESIGN-02, DESIGN-03, COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, PAGE-01, DARK-01, DARK-03
**Success Criteria** (what must be TRUE):

  1. Home page renders using Gemba tokens (Public Sans type scale, semantic color/spacing/radii/shadow aliases) with no raw/hardcoded visual values on the redesigned surfaces.
  2. Home page displays correctly in both light and dark themes via the theme toggle, including the correct logo/brand-mark asset for each theme.
  3. Buttons, form controls, chips, icons, and card surfaces on the home page use the new shared component layer (button ranks, Input/Checkbox/Radio/Toggle, Chip, card recipe) matching the design system spec.
  4. All UI icons on the home page render through the single `Icon` wrapper (Untitled UI stroke icons, `currentColor`) — no emoji used as UI icons.
  5. Switching themes on the home page resolves every semantic token alias to a valid dark value — no unstyled or mis-colored elements in dark mode.

**Plans**: 7 plansPlans:
**Wave 1**

- [x] 01-01-PLAN.md — Token foundation: wire Gemba tokens app-wide + author near-black dark layer (globals.css) [Wave 1]
- [x] 01-02-PLAN.md — Port the Untitled UI Icon wrapper + reskin theme-toggle (COMP-04) [Wave 1]

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-03-PLAN.md — Reskin Button ranks + Card recipe, add Chip (COMP-01/03/05) [Wave 2]
- [x] 01-04-PLAN.md — Form controls: reskin Input/Switch, add Checkbox/RadioGroup (COMP-02) [Wave 2]

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-05-PLAN.md — App shell (240px sidebar + top bar) + mobile tab bar + layout wiring (PAGE-01/DARK-03) [Wave 3]
- [x] 01-06-PLAN.md — Redesign the home page as a Gemba app landing (PAGE-01) [Wave 3]

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-07-PLAN.md — Phase-level human visual verification gate (light/dark/logo/icons) [Wave 4]

**UI hint**: yes

### Phase 2: Upload Page Redesign

**Goal**: The upload page (dropzone, share options, generated link) is fully redesigned to the Gemba design system, reusing the Phase 1 component layer, and is theme-aware in light and dark.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: PAGE-02
**Success Criteria** (what must be TRUE):

  1. Upload page's dropzone, share-option controls (password, download limit, expiry), and share-link result use Gemba tokens and the shared components from Phase 1 — no raw/legacy styling remains.
  2. Upload page renders correctly in both light and dark themes, matching the visual system established in Phase 1.
  3. Existing upload functionality (drag-drop, multi-file selection, client-side encryption, share-link generation) continues to work unchanged after the redesign.

**Plans**: 3 plans

**Wave 1**

- [x] 02-01-PLAN.md — Reskin the dropzone: dashed/accent drop target + inset-ring file rows (D-03) [Wave 1]
- [x] 02-02-PLAN.md — Reskin the upload page: cards, share options, progress, CTA, calm success/share-link state (D-01/D-02/D-04) [Wave 1]

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-03-PLAN.md — Phase-level human visual verification gate (light/dark sign-off + build audit) [Wave 2]

**UI hint**: yes

### Phase 3: Download Page Redesign & Dark Mode Complete

**Goal**: The download page (metadata display, password entry, decrypt/download) is fully redesigned to the Gemba design system, and — with all three pages now redesigned — light/dark/system theming is verified complete across the entire app.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: PAGE-03, DARK-02
**Success Criteria** (what must be TRUE):

  1. Download page's metadata display, password prompt, and download/decrypt flow use Gemba tokens and the shared components, matching the design system.
  2. Download page renders correctly in both light and dark themes, matching the visual system established in Phase 1.
  3. Every page (home, upload, download) and every shared component renders correctly under light, dark, and system theme settings via `next-themes` — no unstyled or mis-themed element remains anywhere in the app.
  4. Existing download functionality (metadata fetch, password validation, decryption, file download) continues to work unchanged after the redesign.

**Plans**: 4 plans

**Wave 1**

- [x] 03-01-PLAN.md — Reskin the download page: all four states + D-01 handled error cards/inline password error + D-03 secure row (PAGE-03) [Wave 1]
- [x] 03-02-PLAN.md — 3-way light/dark/system theme control + Gemba dropdown-menu reskin (D-02, DARK-02) [Wave 1]
- [x] 03-03-PLAN.md — Fix the Public Sans production webfont drop in the root layout (DARK-02) [Wave 1]

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 03-04-PLAN.md — DARK-02 completeness: build/source audit + blocking human light/dark/system sign-off (D-04) [Wave 2]

**UI hint**: yes

### Phase 4: Security, Reliability & Test Hardening

**Goal**: The app's responses are hardened with security headers and rate limiting, the download-counter race condition is fixed, and the crypto/password/counter/metadata logic is covered by automated unit tests.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: SEC-01, SEC-02, REL-01, TEST-01, TEST-02, TEST-03, TEST-04
**Success Criteria** (what must be TRUE):

  1. App responses include CSP, HSTS, X-Frame-Options, and X-Content-Type-Options headers, verifiable by inspecting HTTP responses.
  2. Repeated upload/download requests from the same IP are throttled past a defined threshold, protecting against abuse and password brute-forcing.
  3. Concurrent download requests against a file with a configured download limit never exceed that limit — the counter race is fixed and verified by a concurrency test.
  4. Automated unit tests exist and pass for: the crypto encrypt/decrypt round-trip and packed format, password hashing/validation, download-counter decrement and limit enforcement (including the concurrency fix), and metadata serialization/validation.

**Plans**: 3 plans

**Wave 1**

- [x] 04-01-PLAN.md — SEC-01: enforced CSP + HSTS + X-Frame-Options + X-Content-Type-Options in next.config.ts (font-CDN/blob-CDN allowlist, T-03-07 carry-forward) [Wave 1]
- [x] 04-02-PLAN.md — SEC-02 + REL-01: shared Upstash Redis client, per-IP sliding-window rate limiting (429 + Retry-After), and atomic dl:{id} download counter replacing the read-modify-write race [Wave 1]

**Wave 2** *(blocked on 04-02 completion)*

- [x] 04-03-PLAN.md — TEST-01..04: Vitest baseline + crypto round-trip/packed-format, password hash/validate, metadata validation, and the hermetic REL-01 counter/concurrency test [Wave 2]

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Design Foundation & Home Page | 7/7 | Complete    | 2026-07-10 |
| 2. Upload Page Redesign | 3/3 | Complete    | 2026-07-10 |
| 3. Download Page Redesign & Dark Mode Complete | 4/4 | Complete    | 2026-07-11 |
| 4. Security, Reliability & Test Hardening | 3/3 | Complete   | 2026-07-11 |
| 5. Recipient Email Verification | 0/? | Planning | — |
| 9. SmoothUI Foundation | 2/2 | In Progress|  |
| 10. Component Re-shape | 0/? | Not started | - |
| 11. Page Motion | 0/? | Not started | - |
| 12. Verification & Parity | 0/? | Not started | - |

### Phase 5: Recipient Email Verification

**Goal:** Add an optional per-upload gate: the sender lists one or more recipient emails and enables "verify recipient before download". When enabled, the recipient must request a one-time code (sent via Mailgun to any listed address) and enter it before the encrypted file is served. Adds upload Options UI, request-code/verify-code API endpoints, Redis-backed TTL codes, and rate limiting. Preserves the client-side-encryption model (the AES key stays in the URL fragment; the code only gates who can pull the ciphertext).
**Requirements**: VERIFY-01, VERIFY-02, VERIFY-03, VERIFY-04, VERIFY-05, VERIFY-06, TEST-05
**Depends on:** Phase 4
**Plans:** 3 plans

Plans:

- [ ] 05-01-PLAN.md — Server verification spine (tracer): code/token domain lib, widened Redis, recipientEmails metadata, gate inserted into GET /api/files/[id] in both modes + meta verifyRequired (Wave 1)
- [ ] 05-02-PLAN.md — request-code + verify-code endpoints, Mailgun sender (bare fetch), two rate limiters, upload-side recipientEmails validation/storage (Wave 2)
- [ ] 05-03-PLAN.md — Upload Options recipient UI + verify toggle, download verify-code flow + x-verify-token header, Mailgun env docs, human end-to-end/platform-parity checkpoint (Wave 3)

### Phase 6: Notify Recipient by Email

**Goal:** A sender can, at upload time, notify one or more recipients by email of the shared download link(s). A Notify toggle (auto-enabling Verify) and a single shared interactive chip-input recipient list feed both notify and verify; each recipient receives their own individual email (never a shared To/CC) containing whatever link(s) the upload produced. Reuses the existing bare-fetch Mailgun sender and Upstash rate limiter, works for encrypted + unencrypted uploads, and never blocks or rolls back the upload on failure. Honors the LOCKED, user-approved E2E exception routing the full link (incl. #key) through the server.
**Requirements**: NOTIFY-01, NOTIFY-02, NOTIFY-03, NOTIFY-04, NOTIFY-05, NOTIFY-06, NOTIFY-07
**Depends on:** Phase 5
**Plans:** 2/3 plans executed

Plans:

- [x] 06-01-PLAN.md — Notify server path + end-to-end tracer: sendShareNotificationEmail, checkNotifyLimit, POST /api/notify (validate → rate-limit → per-recipient send → fail-loud 500), minimal client POST (Wave 1)
- [x] 06-02-PLAN.md — Client UX: shared recipient-emails normalizer/commit lib, RecipientChipInput (Input+Badge), notify toggle + verify coupling + single shared chip list wired into upload page (Wave 2)
- [ ] 06-03-PLAN.md — Human-verify gate: live per-recipient sends, coupling/chip UX, encrypted+unencrypted links, platform parity (Wave 3)

### Phase 7: Multi-file Single Download Link

**Goal:** Selecting multiple files produces ONE share link (one id, one key) instead of one link per file. Each file is encrypted client-side under the same key with its own IV (existing per-file wire format, no zip), stored separately under the single id; the download page lists every file and downloads/decrypts each individually. Backward-compatible with existing single-file shares; one download-limit counter per id; Phase 6 notify unbroken.
**Requirements**: MFL-01 (N files → one id/key/link), MFL-02 (per-file encrypt under shared key, wire format unchanged), MFL-03 (multi-file meta + separate per-file storage, no zip), MFL-04 (download page lists + decrypts each file), MFL-05 (legacy single-file shares still work), REL-01 (one download counter per id)
**Depends on:** Phase 6
**Plans:** 1/3 plans executed

Plans:

- [x] 07-01-PLAN.md — Backend: multi-file meta schema + resolveFiles(), fs per-index storage, finalize route, index-addressable bytes/meta, one-per-id counter (Wave 1)
- [ ] 07-02-PLAN.md — Upload client: N files → one id/key/link, single finalize, one-link result UI, notify one link (Wave 2)
- [ ] 07-03-PLAN.md — Download client: list all files + per-file decrypt under one key + legacy compat + end-to-end verify (Wave 2)

### Phase 9: SmoothUI Foundation

**Goal**: The `motion` library and a shared SmoothUI shape + motion utility layer are installed and available app-wide, respecting `prefers-reduced-motion`, and the new shape/motion language is documented as the recorded source of truth.
**Depends on**: Phase 8 (native macOS app; the root web app returns to focus as of v1.1)
**Requirements**: FND-01, FND-02, FND-03, DOC-01
**Success Criteria** (what must be TRUE):

  1. The `motion` npm package is installed and successfully imported/used in the web app (`package.json` dependency + a working import).
  2. A shared shape/motion utility module exists exporting reusable radii/border/shape tokens and reusable transition/variant presets, so no re-shaped component defines its own one-off motion values.
  3. With the OS/browser `prefers-reduced-motion` setting enabled, any motion driven by the utility layer degrades to instant or opacity-only transitions.
  4. `design-system/` documents the new SmoothUI shape + motion language (radii, borders, transition presets, reduced-motion behavior) and explicitly states colour/type tokens are unchanged.

**Plans**: 2/2 plans executed

- [x] 09-01-PLAN.md — Install `motion`; build the shape + motion utility layer (transitions/variants + reduced-motion resolver + shape tokens), MotionConfig, and one real consumer (FND-01, FND-02, FND-03)
- [x] 09-02-PLAN.md — Document the shape + motion language in `design-system/MOTION.md` (colour/type explicitly unchanged) (DOC-01)

**UI hint**: yes

### Phase 10: Component Re-shape

**Goal**: Every shared UI primitive and app-specific component — form controls, buttons, surfaces, feedback/indicators, file/list, and the app shell — is re-shaped onto SmoothUI geometry and motion using the Phase 9 foundation layer, preserving existing Radix behaviour and a11y.
**Depends on**: Phase 9
**Requirements**: FORM-01, FORM-02, FORM-03, FORM-04, BTN-01, SURF-01, SURF-02, SURF-03, SURF-04, FDBK-01, FDBK-02, FDBK-03, FILE-01, FILE-02, SHELL-01, SHELL-02
**Success Criteria** (what must be TRUE):

  1. Form controls (Input, Checkbox, RadioGroup, Switch/Toggle, Label, and field/hint grouping) render with SmoothUI geometry and focus/check/select motion, preserving Radix behaviour, keyboard interaction, and validation states.
  2. Buttons render with SmoothUI geometry and press/hover motion across every existing rank, variant, and size.
  3. Surface components (Card, Dialog, Sheet/Drawer, Dropdown-menu, Tabs, Badge/Chip, Avatar, Separator) render with SmoothUI geometry and entrance/open-close/hover motion, preserving Radix focus-trap and a11y.
  4. Feedback/indicator components (toasts, progress bar, skeleton/loading) render with SmoothUI geometry and enter/exit motion.
  5. The file-dropzone, file/list rows, the app-shell/sidebar, mobile-tab-bar, and theme-toggle all render with SmoothUI geometry and motion — the dropzone and file rows still support multi-file selection and show client-side encryption progress; the theme-toggle keeps its 3-way light/dark/system control.

**Plans**: TBD
**UI hint**: yes

### Phase 11: Page Motion

**Goal**: Home, upload, and download pages carry SmoothUI section/entrance motion and a scroll-progress indicator, built on the Phase 10 component layer.
**Depends on**: Phase 10
**Requirements**: MOT-01, MOT-02
**Success Criteria** (what must be TRUE):

  1. Home, upload, and download pages each animate their primary content in with SmoothUI entrance motion when the page loads.
  2. A SmoothUI scroll-progress indicator is visible and accurately tracks scroll position on the scrollable page(s).

**Plans**: TBD
**UI hint**: yes

### Phase 12: Verification & Parity

**Goal**: The SmoothUI re-shape is verified to leave colours/type/theming intact, keep the client-side encryption boundary unweakened, and hold parity across web, PWA, and Android TWA, with human sign-off.
**Depends on**: Phase 11
**Requirements**: INV-01, INV-02, INV-03
**Success Criteria** (what must be TRUE):

  1. A human visual audit confirms the colour palette and Public Sans type tokens are unchanged, and light/dark/system theming still renders correctly on every re-shaped surface.
  2. Upload and download flows are exercised end-to-end and confirm the decryption key never reaches the server — the client-side E2E-encryption boundary is unweakened by the re-shape.
  3. The app is checked as an installed PWA and as the Android TWA (alongside the standard web view), confirming theme and brand assets render correctly in all three and the PWA app-shell cache remains valid.

**Plans**: TBD
**UI hint**: yes
