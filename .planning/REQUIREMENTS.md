# Requirements: Gemba Filesend

**Defined:** 2026-07-10 · **v1.1 added:** 2026-07-12
**Core Value:** Anyone can share a file securely — encrypted end-to-end, no account, no friction — through a single link.

## Milestone v1.1 Requirements (Native Mobile Apps)

Native iOS + Android apps (React Native + Expo) — thin uploader/downloader front-ends over the existing API. Each maps to a roadmap phase. Store identifier `gemba.filesend` for both platforms. Store submission is human-gated.

### Crypto Parity

The walking skeleton and #1 risk. Native has no `crypto.subtle`; it must reproduce `src/lib/crypto.ts` exactly. Build and prove this **before any screen**.

- [x] **CRYPTO-01**: Native AES-128-GCM encrypt/decrypt reproduces the web packed (IV-prepended) format byte-for-byte via `react-native-quick-crypto`
- [x] **CRYPTO-02**: Native SHA-256 password hashing and Base64URL encoding match the web implementation exactly
- [x] **CRYPTO-03**: An automated interop test proves a file encrypted on web decrypts on native and vice-versa (walking-skeleton gate — no UI until this passes)

### App Foundation

- [x] **APP-01**: Monorepo restructure — `apps/mobile` (Expo) coexists with the Next app; crypto/validation/types are single-sourced in a shared `packages/crypto` imported by both web and native
- [x] **APP-02**: Expo app scaffold launches on the iOS simulator and Android emulator under app identifier `gemba.filesend`

### Uploader

- [ ] **UP-01**: User can pick a file from the device and see it staged for upload
- [ ] **UP-02**: App encrypts the file in-app and uploads via the existing API, producing a share link with the decryption key in the URL fragment (key never sent to server)
- [ ] **UP-03**: User can set share controls (password, download limit, expiry) matching the web app
- [ ] **UP-04**: User can copy or share the resulting link via clipboard / native share sheet

### Downloader

- [ ] **DL-01**: User can open a share link (deep link or paste) and the app fetches the file metadata
- [ ] **DL-02**: If password-protected, user can enter the password; the app fetches the ciphertext and decrypts in-app
- [ ] **DL-03**: User can save or share the decrypted file to the device

### Android Release

- [ ] **ANDROID-01**: EAS Build produces a signed AAB for `gemba.filesend`
- [ ] **ANDROID-02**: App is published to a new Google Play listing (submission human-gated: Play service-account JSON / Play App Signing)

### iOS Release

- [ ] **IOS-01**: EAS Build produces a signed IPA for bundle id `gemba.filesend`
- [ ] **IOS-02**: App is submitted to App Store Connect (submission human-gated on an Apple Developer account)

## Shipped (v1.0 — Redesign + Hardening)

Delivered across Phases 1–4. Retained for reference.

- [x] **DESIGN-01..03** — Gemba tokens wired globally; semantic aliases; Public Sans type scale (Phase 1)
- [x] **COMP-01..05** — Button ranks, form controls, Chip, `Icon` wrapper, card/inset-ring recipe (Phase 1)
- [x] **PAGE-01..03** — Home, upload, download redesigned to the design system (Phases 1–3)
- [x] **DARK-01..03** — Dark token layer; all surfaces theme-aware; per-theme logos (Phases 1–3)
- [x] **SEC-01..02** — Security headers; per-IP rate limiting on upload/download (Phase 4)
- [x] **REL-01** — Download-counter race fixed via atomic Redis counter (Phase 4)
- [x] **TEST-01..04** — Vitest suite: crypto round-trip, password, download-counter, metadata (Phase 4)

## v2 Requirements

Deferred to a future milestone. Tracked but not in this roadmap.

### Crypto

- **CRYP-01**: Migrate file encryption to AES-256-GCM (with re-encryption/version migration)
- **CRYP-02**: Replace SHA-256 password hashing with PBKDF2/Argon2

### Quality

- **QUAL-01**: End-to-end (Playwright) tests for upload → share → download and password/expiry/limit flows
- **QUAL-02**: Load/stress tests for concurrent uploads/downloads

### Operations

- **OPS-01**: Admin dashboard (stored files, manual delete, cleanup status)
- **OPS-02**: Hosted privacy-policy page (Play Store requirement)
- **OPS-03**: Abuse-reporting flow

## Out of Scope

Explicitly excluded for this milestone.

| Feature | Reason |
|---------|--------|
| User accounts / authentication | Product is deliberately anonymous; sharing is link-based |
| Server/API changes for native | Native apps are thin clients over the existing API; no backend work needed |
| Push notifications, in-app account/history | Beyond the anonymous uploader/downloader core; no server state to notify on |
| Retaining/updating the existing TWA (`mba.ge.filesend`) | Superseded by the native `gemba.filesend` listing; TWA retired (user decision) |
| Marketing website redesign | Design system covers a website too, but this repo is the file-send app only |
| Streaming/chunked encryption, larger presign TTL, cleanup indexing | Performance/scaling work; not required for native parity |
| AES-256 / PBKDF2 migration | Real value but needs a separate crypto-migration milestone (see v2) |

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CRYPTO-01 | Phase 5 | Complete (iOS on-device VECTORS PASS 2026-07-13) |
| CRYPTO-02 | Phase 5 | Complete (iOS on-device VECTORS PASS 2026-07-13) |
| CRYPTO-03 | Phase 5 | Complete (iOS on-device VECTORS PASS 2026-07-13; Android + manual round-trip accepted-deferred to release phase per user) |
| APP-01 | Phase 5 | Complete |
| APP-02 | Phase 5 | Complete (native app launched on iOS Simulator under gemba.filesend) |
| UP-01 | Phase 6 | Pending |
| UP-02 | Phase 6 | Pending |
| UP-03 | Phase 6 | Pending |
| UP-04 | Phase 6 | Pending |
| DL-01 | Phase 7 | Pending |
| DL-02 | Phase 7 | Pending |
| DL-03 | Phase 7 | Pending |
| ANDROID-01 | Phase 8 | Pending |
| ANDROID-02 | Phase 8 | Pending |
| IOS-01 | Phase 9 | Pending |
| IOS-02 | Phase 9 | Pending |

**Coverage:**

- v1.1 requirements: 16 total (3 CRYPTO + 2 APP + 4 UP + 3 DL + 2 ANDROID + 2 IOS)
- Mapped to phases: 16/16 ✓ (Phase 5: CRYPTO-01..03, APP-01..02 · Phase 6: UP-01..04 · Phase 7: DL-01..03 · Phase 8: ANDROID-01..02 · Phase 9: IOS-01..02)
- v1.0 shipped: 21 requirements (Phases 1–4, complete)

---
*Requirements defined: 2026-07-10 · v1.1 native-mobile requirements added: 2026-07-12 · v1.1 traceability mapped to Phases 5–9: 2026-07-12*
