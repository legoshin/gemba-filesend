# Roadmap: Gemba Filesend — Redesign + Hardening

## Overview

This milestone re-skins Gemba Filesend to the Gemba design system end-to-end and closes the highest-priority security/reliability gaps. Foundation tokens and the shared component layer land together with a fully-themed home page (Phase 1), then each remaining page — upload (Phase 2), download (Phase 3) — is redesigned in place reusing those components, with the download phase also closing out full light/dark/system theme coverage across the whole app. A final hardening phase (Phase 4) adds security headers, rate limiting, fixes the download-counter race, and brings the crypto/password/counter/metadata logic under test.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Design Foundation & Home Page** - Wire Gemba tokens app-wide, build the shared component layer, redesign home page in light + dark (completed 2026-07-10)
- [x] **Phase 2: Upload Page Redesign** - Redesign the upload flow (dropzone, options, share link) to the design system, theme-aware (completed 2026-07-10)
- [x] **Phase 3: Download Page Redesign & Dark Mode Complete** - Redesign the download flow to the design system; verify light/dark/system theming across the entire app (completed 2026-07-11)
- [ ] **Phase 4: Security, Reliability & Test Hardening** - Security headers, rate limiting, fix the download-counter race, add unit test coverage

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

- [ ] 04-03-PLAN.md — TEST-01..04: Vitest baseline + crypto round-trip/packed-format, password hash/validate, metadata validation, and the hermetic REL-01 counter/concurrency test [Wave 2]

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Design Foundation & Home Page | 7/7 | Complete    | 2026-07-10 |
| 2. Upload Page Redesign | 3/3 | Complete    | 2026-07-10 |
| 3. Download Page Redesign & Dark Mode Complete | 4/4 | Complete    | 2026-07-11 |
| 4. Security, Reliability & Test Hardening | 2/3 | In Progress|  |
