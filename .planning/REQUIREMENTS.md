# Requirements: Gemba Filesend

**Defined:** 2026-07-10
**Core Value:** Anyone can share a file securely — encrypted end-to-end, no account, no friction — through a single link.

## v1 Requirements

Requirements for this milestone (redesign + hardening). Each maps to a roadmap phase.

### Design Foundation

- [x] **DESIGN-01**: Gemba design tokens (`design-system/tokens/` + `styles.css`) are wired into the app via a single global import at the app root
- [x] **DESIGN-02**: App code uses the semantic token aliases (`--text-*`, `--surface-*`, `--border-*`, `--button-*`, radii, shadows, rings) instead of raw colour/spacing/shadow values
- [x] **DESIGN-03**: Public Sans is the app's default typeface and the Gemba type scale (H1–H5, body, small) is available via helper classes/tokens

### Components

- [x] **COMP-01**: Button ranks (Primary, Secondary, Tertiary, Ghost — default/small/square) exist in the app's component layer per the design system
- [x] **COMP-02**: Form controls (Input, Checkbox, Radio, Toggle) match the design system
- [x] **COMP-03**: Chip/status component (ALL-CAPS label, signal colour on 8% tint) matches the design system
- [x] **COMP-04**: A single `Icon` wrapper renders Untitled UI stroke icons (`currentColor`); app UI icons use it — no emoji as UI icons
- [x] **COMP-05**: Card/surface recipe (white surface, 16px radius, inset-ring border + soft cool-grey shadow) is applied to card surfaces

### Pages

- [x] **PAGE-01**: Home page is redesigned to the design system
- [x] **PAGE-02**: Upload page (dropzone, options, share link) is redesigned to the design system
- [x] **PAGE-03**: Download page (metadata, password entry, download/decrypt) is redesigned to the design system

### Dark Mode

- [x] **DARK-01**: A dark-mode token layer is authored — every semantic alias resolves to a correct dark value
- [x] **DARK-02**: All pages and components render correctly in light, dark, and system themes via `next-themes`
- [x] **DARK-03**: Logos / brand mark swap to the correct asset per theme, verified on web, PWA, and Android TWA

### Security

- [x] **SEC-01**: Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) are set on app responses
- [x] **SEC-02**: Per-IP rate limiting protects the upload and download endpoints (abuse + password brute-force)

### Reliability

- [x] **REL-01**: The download-counter race is fixed — concurrent downloads cannot exceed the configured download limit

### Testing

- [ ] **TEST-01**: Unit tests cover the crypto encrypt/decrypt round-trip and packed format
- [ ] **TEST-02**: Unit tests cover password hashing and validation
- [ ] **TEST-03**: Tests cover download-counter decrement and limit enforcement, including the REL-01 race fix
- [ ] **TEST-04**: Unit tests cover metadata serialization/validation

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
| Marketing website redesign | Design system covers a website too, but this repo is the file-send app only |
| Streaming/chunked encryption, larger presign TTL, cleanup indexing | Performance/scaling work; not required for redesign + core hardening |
| AES-256 / PBKDF2 migration | Real value but needs a separate crypto-migration milestone (see v2) |

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DESIGN-01 | Phase 1 | Complete |
| DESIGN-02 | Phase 1 | Complete |
| DESIGN-03 | Phase 1 | Complete |
| COMP-01 | Phase 1 | Complete |
| COMP-02 | Phase 1 | Complete |
| COMP-03 | Phase 1 | Complete |
| COMP-04 | Phase 1 | Complete |
| COMP-05 | Phase 1 | Complete |
| PAGE-01 | Phase 1 | Complete |
| DARK-01 | Phase 1 | Complete |
| DARK-03 | Phase 1 | Complete |
| PAGE-02 | Phase 2 | Complete |
| PAGE-03 | Phase 3 | Complete |
| DARK-02 | Phase 3 | Complete |
| SEC-01 | Phase 4 | Complete |
| SEC-02 | Phase 4 | Complete |
| REL-01 | Phase 4 | Complete |
| TEST-01 | Phase 4 | Pending |
| TEST-02 | Phase 4 | Pending |
| TEST-03 | Phase 4 | Pending |
| TEST-04 | Phase 4 | Pending |

**Coverage:**

- v1 requirements: 21 total
- Mapped to phases: 21 (100%)
- Unmapped: 0

*Note: an earlier draft of this file undercounted the total as 18; the enumerated list above (3 DESIGN + 5 COMP + 3 PAGE + 3 DARK + 2 SEC + 1 REL + 4 TEST) is 21 — corrected during roadmap creation.*

---
*Requirements defined: 2026-07-10*
*Last updated: 2026-07-10 after roadmap creation*
