# Phase 5: Monorepo, Expo Scaffold & Crypto-Interop Walking Skeleton - Context

**Gathered:** 2026-07-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure the repo into a monorepo, scaffold the Expo native app, and prove **byte-for-byte web↔native crypto parity** with an automated test — the milestone's #1 risk, resolved before any uploader/downloader screen is built. Delivers APP-01, APP-02, CRYPTO-01, CRYPTO-02, CRYPTO-03.

**In scope:** monorepo restructure (npm workspaces), Expo app scaffold that launches on iOS sim + Android emulator, a shared crypto (+ metadata-contract) package, and the interop gate (golden vectors on both runtimes + one manual device round-trip).

**Out of scope:** uploader UI (Phase 6), downloader UI (Phase 7), store builds/release (Phases 8–9). No production screens — the only native surface this phase is a throwaway test harness screen.
</domain>

<decisions>
## Implementation Decisions

### Shared crypto package design
- **D-01:** `packages/crypto` uses a **shared core + platform adapters** model. The pure-TS parts — constants (`AES_KEY_BITS=128`, `IV_BYTES=12`), Base64URL (`toBase64Url`/`fromBase64Url`), the packed `[iv(12)][ciphertext+tag]` format, and the password-hash/salt logic — are written **once** in the shared package. AES-GCM + SHA-256 primitives come from a **platform-resolved file** (`crypto.web.ts` → Web Crypto `crypto.subtle`; `crypto.native.ts` → `react-native-quick-crypto`) using React Native's platform-extension resolution. Both platforms expose the **same public async API** (`generateKey`, `exportKeyBase64`, `importKeyBase64`, `encryptPacked`, `decryptPacked`, `sha256Hex`, `randomSaltBase64`, `toBase64Url`, `fromBase64Url`). Rationale: the format/encoding logic (where drift is most dangerous) can never diverge; only the primitive call differs per platform.
- **D-02:** Rejected alternatives: (a) using quick-crypto's `crypto.subtle` polyfill on **both** web and native — rejected because it forces an RN library + polyfill into the web bundle when the browser already ships native `subtle`; (b) fully injected crypto provider — rejected as unnecessary boilerplate at every call site.

### Shared-package scope
- **D-03:** Single-source **crypto AND the metadata contract** in this phase. Hoist `ClientMeta` (type), `validateClientMeta`, and the `MAX_*` bounds out of `src/lib/storage.ts` into a shared package so the **web API routes and the native uploader validate against one source** — the native client cannot drift from server-side validation. Accepts a slightly larger restructure now to avoid a duplicate meta contract later. (Native uploader consumption lands in Phase 6; this phase just establishes the shared source.)

### Interop gate (CRYPTO-03 = the walking-skeleton gate)
- **D-04:** The gate is **golden test vectors (byte-equality) + one manual device round-trip.**
  - **Automated CI gate:** deterministic fixed-key + fixed-IV vectors asserting the **exact** ciphertext bytes (and SHA-256 hashes / Base64URL encodings) produced on **both** runtimes — web under **Vitest**, native under **jest-expo against a native dev build** (D-05). Also assert cross-decrypt: web-encrypted vector decrypts to plaintext on native and vice-versa.
  - **Manual confidence check:** one real device/emulator run that encrypts on web → decrypts on native, and the reverse.
  - **No production UI may be built until this gate passes.**
- **D-05:** The native side of the vectors runs under **jest-expo with a native dev build** (not plain Node/Vitest) because `react-native-quick-crypto` is a JSI native module and will not load in a bare Node process.

### Monorepo layout & tooling
- **D-06:** **npm workspaces** (repo is already npm — least new tooling; keep `package-lock.json`, no pnpm/Turborepo migration). Layout: root becomes the private workspace manager with `apps/web` (the current Next app, **moved** from repo root), `apps/mobile` (Expo), and `packages/*` (`packages/crypto` and the shared metadata contract — final package split at planner's discretion).
- **D-07:** Moving the Next app to `apps/web` requires a **one-time Vercel change: set the project Root Directory to `apps/web`.** The web app must remain build-and-deploy-correct after the move — the `@/*` path alias, `public/` assets, `sw.js`, `next.config.ts`, `scripts/`, and the `android/` TWA folder all move with it or are re-pathed. Treat "web still builds + deploys" as a verification criterion for this phase.

### Expo scaffold
- **D-08:** Scaffold with **Expo prebuild + a custom dev client + New Architecture enabled** — all required for `react-native-quick-crypto`'s JSI module (Expo Go cannot load it). App identifier **`gemba.filesend`** for both platforms.
- **D-09:** **Scaffold `expo-router` + deep-link config now** (not deferred), so Phases 6–7 (uploader/downloader) and share-link deep-linking have their foundation in place. The throwaway interop-test harness screen lives inside this scaffold.

### Claude's Discretion
- Final split of `packages/*` (one shared package vs `packages/crypto` + `packages/shared`), workspace/package naming (current root package is named `ffsend-web` — rename as sensible), and exact jest-expo/EAS wiring are left to research/planning, provided the decisions above hold.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone & phase scope
- `.planning/HANDOVER-native-mobile-milestone.md` — full milestone context, all locked decisions (RN+Expo, `gemba.filesend`, crypto-interop as walking skeleton, phase breakdown). Read first.
- `.planning/ROADMAP.md` §"Phase 5" — phase goal, requirements, success criteria.
- `.planning/REQUIREMENTS.md` §"Milestone v1.1 Requirements" — APP-01/02, CRYPTO-01/02/03 exact wording.
- `.planning/PROJECT.md` §"Current Milestone" + "Key Decisions" — native-stack decisions.

### Crypto parity (the thing to reproduce byte-for-byte)
- `src/lib/crypto.ts` — the **exact** implementation native must match: AES-128-GCM, 12-byte IV, packed `[iv][ciphertext+tag]`, raw key → Base64URL, `sha256Hex` (hex SHA-256), `randomSaltBase64` (16-byte Base64URL), `toBase64Url`/`fromBase64Url`. (Path moves to `apps/web/src/lib/crypto.ts` during the restructure; the shared logic is extracted to `packages/crypto`.)
- `src/lib/storage.ts` — source of the metadata contract to hoist: `ClientMeta`, `validateClientMeta`, `MAX_*` bounds.
- Callers to re-point after extraction: `src/app/upload/page.tsx`, `src/app/download/page.tsx`, `src/app/api/files/route.ts`, `src/app/api/files/[id]/route.ts` (+ its `meta` route), and the Phase 4 Vitest crypto tests.

### Codebase maps (context)
- `.planning/codebase/STRUCTURE.md`, `.planning/codebase/STACK.md`, `.planning/codebase/ARCHITECTURE.md` — current layout/stack before the monorepo move.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/crypto.ts` — leaf module, no internal deps; its pure-TS parts (Base64URL, packing, constants, `sha256Hex`) lift cleanly into `packages/crypto`'s shared core. The two `crypto.subtle` call sites (encrypt/decrypt/digest/generateKey/importKey/exportKey) are the only things that need a platform adapter.
- `src/lib/storage.ts` — `ClientMeta`/`validateClientMeta`/`MAX_*` are already isolated, framework-free predicates promoted to named exports in Phase 4 (TEST-04) — they hoist to the shared package without logic change.
- Phase 4 Vitest suite (33 tests) — the web-side golden vectors extend the existing crypto round-trip tests; the runner (`vitest`) is already wired.

### Established Patterns
- Web crypto is **async** (`Promise<CryptoKey>`, `await crypto.subtle.*`). The shared public API must stay async so `crypto.web.ts` and `crypto.native.ts` share one signature.
- `@/*` path alias → `./src/*` (tsconfig). After moving to `apps/web`, aliases resolve within `apps/web`; shared code is imported as a workspace package, not via `@/`.
- No default exports; named exports only (matches how the shared package should export).

### Integration Points
- Vercel deploy: Root Directory must point at `apps/web` post-move (D-07). Service worker (`public/sw.js`), manifest, and `android/` TWA assets travel with the web app.
- API routes and the web UI both import crypto + meta validation — after extraction they consume the shared package; native app consumes the same package (crypto now, meta in Phase 6).
</code_context>

<specifics>
## Specific Ideas

- Golden vectors should be **shared fixtures** (one JSON/TS vector set) consumed by both the Vitest (web) and jest-expo (native) assertions, so there is literally one source of expected bytes.
- The interop gate must assert **exact ciphertext bytes** for a fixed key+IV (AES-GCM is deterministic given a fixed IV) — not just round-trip success — so any encoding/packing drift fails loudly.
</specifics>

<deferred>
## Deferred Ideas

- Uploader share controls, document picker, upload flow — Phase 6.
- Downloader deep-link parsing, decrypt-and-save flow — Phase 7.
- EAS Build production AAB/IPA, store submission, service-account/Apple-account wiring — Phases 8–9 (human-gated).
- Consolidating additional web/native shared types beyond crypto + meta (e.g., API response shapes) — revisit in Phase 6 if the uploader needs them.
- Retiring/handling the existing `android/` TWA config now living under `apps/web` — cosmetic cleanup; TWA is already superseded, no action required this phase.

*(No pending todos matched this phase.)*
</deferred>

---

*Phase: 5-Monorepo, Expo Scaffold & Crypto-Interop Walking Skeleton*
*Context gathered: 2026-07-12*
