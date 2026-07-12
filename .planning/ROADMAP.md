# Roadmap: Gemba Filesend

## Overview

This roadmap spans two milestones. **v1.0** (Phases 1–4, shipped) re-skinned Gemba Filesend to the Gemba design system, added a proper dark mode, and closed the highest-priority security/reliability gaps. **v1.1** (Phases 5–9, in progress) adds native iOS + Android apps (React Native + Expo) as thin uploader/downloader clients over the existing API. The crypto-interop walking skeleton — proving byte-for-byte web↔native encrypt/decrypt parity — is built and gated first (Phase 5), before any screen exists. The native uploader (Phase 6) and downloader (Phase 7) flows follow. Android (Phase 8) and iOS (Phase 9) releases close the milestone, each split into an automated EAS build step (Claude) and a human-gated store-submission step (user).

## Milestones

- ✅ **v1.0 Redesign + Hardening** - Phases 1-4 (shipped 2026-07-11)
- 🚧 **v1.1 Native Mobile Apps** - Phases 5-9 (in progress)

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order. Phase numbering is continuous across milestones (v1.1 continues at Phase 5, not reset to 1).

<details>
<summary>✅ v1.0 Redesign + Hardening (Phases 1-4) — SHIPPED 2026-07-11</summary>

- [x] **Phase 1: Design Foundation & Home Page** - Wire Gemba tokens app-wide, build the shared component layer, redesign home page in light + dark (completed 2026-07-10)
- [x] **Phase 2: Upload Page Redesign** - Redesign the upload flow (dropzone, options, share link) to the design system, theme-aware (completed 2026-07-10)
- [x] **Phase 3: Download Page Redesign & Dark Mode Complete** - Redesign the download flow to the design system; verify light/dark/system theming across the entire app (completed 2026-07-11)
- [x] **Phase 4: Security, Reliability & Test Hardening** - Security headers, rate limiting, fix the download-counter race, add unit test coverage (completed 2026-07-11)

</details>

**🚧 v1.1 Native Mobile Apps (in progress):**

- [ ] **Phase 5: Monorepo, Expo Scaffold & Crypto-Interop Walking Skeleton** - Restructure as a monorepo, scaffold the Expo app, and prove byte-for-byte web↔native crypto parity — the #1 risk gate, closed before any screen is built
- [ ] **Phase 6: Native Uploader Flow** - Pick, encrypt in-app, upload via the existing API, and share the resulting link
- [ ] **Phase 7: Native Downloader Flow** - Open a share link, decrypt in-app, and save/share the file
- [ ] **Phase 8: Android Release** - EAS Build produces a signed AAB; new Google Play listing under `gemba.filesend` (submission human-gated)
- [ ] **Phase 9: iOS Release** - EAS Build produces a signed IPA; submitted to App Store Connect (gated on Apple Developer account)

## Phase Details

<details>
<summary>v1.0 Redesign + Hardening — Phase Details (SHIPPED 2026-07-11)</summary>

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

</details>

### Phase 5: Monorepo, Expo Scaffold & Crypto-Interop Walking Skeleton

**Goal**: The codebase is restructured as a monorepo with a single-sourced crypto package, the Expo app runs on both iOS and Android, and web-native encryption parity is proven by an automated test — the milestone's #1 risk, resolved before the uploader or downloader is built.
**Mode:** mvp
**Depends on**: Phase 4 (v1.0 complete — existing web app + API)
**Requirements**: APP-01, APP-02, CRYPTO-01, CRYPTO-02, CRYPTO-03
**Success Criteria** (what must be TRUE):

  1. Repo is restructured as a monorepo: `apps/mobile` (Expo) coexists with the Next app; `packages/crypto` is single-sourced and imported by both web and native code.
  2. The Expo app launches on the iOS simulator and Android emulator under app identifier `gemba.filesend`.
  3. Native AES-128-GCM encrypt/decrypt reproduces the web packed (IV-prepended) format byte-for-byte using the project's native crypto library.
  4. Native SHA-256 password hashing and Base64URL encoding match the web implementation exactly.
  5. An automated interop test proves a file encrypted on web decrypts on native and vice-versa — this must pass before any uploader/downloader work begins.

**Plans**: 4 plans

**Wave 1**

- [x] 05-01-PLAN.md — Monorepo restructure: npm workspaces + move Next app to apps/web (APP-01; D-06/D-07) [Wave 1]

**Wave 2** *(blocked on 05-01)*

- [ ] 05-02-PLAN.md — Shared @gemba/crypto + @gemba/shared, web adapter, golden-vector web byte-equality/cross-decrypt gate (APP-01, CRYPTO-01/02/03 web half; D-01/D-02/D-03/D-04) [Wave 2]

**Wave 3** *(blocked on 05-02)*

- [ ] 05-03-PLAN.md — Expo scaffold under gemba.filesend (dev-client + New Arch + expo-router) + supply-chain install gate + jest-expo core pre-check (APP-02; D-08/D-09) [Wave 3]

**Wave 4** *(blocked on 05-03)*

- [ ] 05-04-PLAN.md — Native crypto.native.ts (auth-tag concat/split) + on-device Maestro interop gate + manual round-trip (APP-02, CRYPTO-01/02/03 native half; D-02b/D-04/D-05) [Wave 4]

### Phase 6: Native Uploader Flow

**Goal**: Users can pick a file, encrypt it in-app, upload it via the existing API, and share the resulting link — the native uploader screen matches the web app's capabilities.
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: UP-01, UP-02, UP-03, UP-04
**Success Criteria** (what must be TRUE):

  1. User can pick a file from the device and see it staged for upload.
  2. App encrypts the file in-app and uploads it via the existing API, producing a share link with the decryption key in the URL fragment (key never sent to the server).
  3. User can set share controls — password, download limit, expiry — matching the web app.
  4. User can copy the link to the clipboard or share it via the native share sheet.

**Plans**: TBD
**UI hint**: yes

### Phase 7: Native Downloader Flow

**Goal**: Users can open a share link in the native app, decrypt the file in-app on the download screen, and save or share the result.
**Mode:** mvp
**Depends on**: Phase 6
**Requirements**: DL-01, DL-02, DL-03
**Success Criteria** (what must be TRUE):

  1. User can open a share link (deep link or paste) and the app fetches the file metadata.
  2. If the file is password-protected, user can enter the password on-screen; the app fetches the ciphertext and decrypts in-app.
  3. User can save the decrypted file to the device or share it via the native share sheet.

**Plans**: TBD
**UI hint**: yes

### Phase 8: Android Release

**Goal**: The Android app is built, signed, and released to Google Play under a new listing (`gemba.filesend`), with the automated build separated from the human-gated store submission.
**Mode:** mvp
**Depends on**: Phase 7
**Requirements**: ANDROID-01, ANDROID-02
**Success Criteria** (what must be TRUE):

  1. EAS Build produces a signed AAB for `gemba.filesend`.
  2. [Human-gated] The AAB is submitted to a new Google Play listing once the user supplies the Play service-account JSON (or completes the upload) and confirms the Play App Signing status.

**Plans**: TBD

### Phase 9: iOS Release

**Goal**: The iOS app is built, signed, and submitted to App Store Connect under bundle id `gemba.filesend`, with the automated build separated from the human-gated store submission.
**Mode:** mvp
**Depends on**: Phase 8
**Requirements**: IOS-01, IOS-02
**Success Criteria** (what must be TRUE):

  1. EAS Build produces a signed IPA for bundle id `gemba.filesend`.
  2. [Human-gated] The IPA is submitted to App Store Connect once the user provides an Apple Developer account.

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Design Foundation & Home Page | v1.0 | 7/7 | Complete | 2026-07-10 |
| 2. Upload Page Redesign | v1.0 | 3/3 | Complete | 2026-07-10 |
| 3. Download Page Redesign & Dark Mode Complete | v1.0 | 4/4 | Complete | 2026-07-11 |
| 4. Security, Reliability & Test Hardening | v1.0 | 3/3 | Complete | 2026-07-11 |
| 5. Monorepo, Expo Scaffold & Crypto-Interop Walking Skeleton | v1.1 | 1/4 | In Progress|  |
| 6. Native Uploader Flow | v1.1 | 0/TBD | Not started | - |
| 7. Native Downloader Flow | v1.1 | 0/TBD | Not started | - |
| 8. Android Release | v1.1 | 0/TBD | Not started | - |
| 9. iOS Release | v1.1 | 0/TBD | Not started | - |
