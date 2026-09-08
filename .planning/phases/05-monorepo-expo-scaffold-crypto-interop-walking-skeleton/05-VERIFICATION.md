---
phase: 05-monorepo-expo-scaffold-crypto-interop-walking-skeleton
verified: 2026-07-13T14:00:00Z
status: passed
score: 6/6 must-haves verified (2 with accepted override)
overrides_applied: 2
overrides:
  - must_have: "Expo app scaffold launches on the Android emulator under gemba.filesend (APP-02, Android half)"
    reason: "iOS on-device proof used the REAL react-native-quick-crypto/Nitro module (the same module Android uses) and produced byte-exact VECTORS PASS. Android emulator confirmation is deferred to Phase 8 (Android Release), which already requires a full EAS Android build + Play publishing pass. User explicitly accepted the iOS on-device proof as sufficient to clear the walking-skeleton gate and continue the milestone."
    accepted_by: "legoshin (user, via orchestrator session)"
    accepted_at: "2026-07-13T00:00:00Z"
  - must_have: "A manual round-trip confirms a web-encrypted payload decrypts on native and vice-versa (D-04)"
    reason: "The automated proof already establishes both directions transitively through the shared frozen-vector oracle: apps/web/src/golden-vectors.test.ts proves web-encrypt == expectedPackedBase64 AND web-decrypt(expectedPackedBase64) == plaintext; the on-device harness (apps/mobile/app/harness.tsx) proves native-encrypt == expectedPackedBase64 AND native-decrypt(expectedPackedBase64) == plaintext (real device, real primitive). Together these prove web->native and native->web byte-for-byte parity without a live manual round-trip. User accepted deferring the manual click-through check to the release phase."
    accepted_by: "legoshin (user, via orchestrator session)"
    accepted_at: "2026-07-13T00:00:00Z"
---

# Phase 5: Monorepo, Expo Scaffold & Crypto-Interop Walking Skeleton Verification Report

**Phase Goal:** The codebase is restructured as a monorepo with a single-sourced crypto package, the Expo app runs on iOS (and Android), and web↔native encryption parity is proven byte-for-byte by an automated test — the milestone's #1 risk, resolved before the uploader or downloader is built.

**Verified:** 2026-07-13
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Monorepo restructure: `apps/mobile` (Expo) coexists with `apps/web`; crypto/validation/types single-sourced in `packages/crypto`/`packages/shared` | VERIFIED | Root `package.json` `workspaces: ["apps/*","packages/*"]`; `packages/crypto/src/{index.ts,encoding.ts,crypto.web.ts,crypto.native.ts,vectors.ts}` exist and are imported by both `apps/web` (`golden-vectors.test.ts`, upload/download pages per 05-SECURITY.md) and `apps/mobile` (`harness.tsx`, `core.test.ts`) via `@gemba/crypto`. `packages/shared/src/index.ts` holds `ClientMeta`/`validateClientMeta` reused by both. `apps/web` build + tests re-verified green from its new workspace home (37/37 Vitest). |
| 2 | Native AES-128-GCM encrypt/decrypt reproduces the web packed `[iv][ciphertext+tag]` format byte-for-byte via `react-native-quick-crypto` (CRYPTO-01) | VERIFIED | `packages/crypto/src/crypto.native.ts` read directly: `encryptRaw` calls `cipher.update()`+`cipher.final()` THEN `getAuthTag()`, concatenates ciphertext+tag (matches Web Crypto's auto-appended layout); `decryptRaw` splits the last `GCM_TAG_BYTES` (16) bytes as tag and calls `setAuthTag(tag)` BEFORE `update()`/`final()` — correct order confirmed by reading, not just grep. On-device harness assertion 1 ("encrypt matches frozen packed bytes") and assertion 4 (cross-decrypt) both reported PASS on a real iOS Simulator run with the real native module (2026-07-13, directly observed by orchestrator). |
| 3 | Native SHA-256 hashing and Base64URL encoding match web exactly (CRYPTO-02) | VERIFIED | `crypto.native.ts` implements `sha256Hex` via `createHash("sha256").update(input).digest("hex")`; shared `toBase64Url`/`fromBase64Url` used identically by both adapters (owned once in `encoding.ts`). On-device harness assertions 2 and 3 ("sha256Hex matches frozen hex", "toBase64Url matches frozen value") reported PASS on real device. |
| 4 | An automated interop test proves web-encrypted bytes decrypt on native and native-encrypted bytes decrypt on web (CRYPTO-03) | VERIFIED | Transitive byte-for-byte proof via the single frozen oracle (`packages/crypto/src/vectors.ts`, `expectedPackedBase64`): `apps/web/src/golden-vectors.test.ts` proves web-encrypt == frozen bytes AND web-decrypt(frozen bytes) == plaintext (37/37 Vitest, re-run and confirmed passing). `apps/mobile/app/harness.tsx` proves native-encrypt == frozen bytes AND native-decrypt(frozen bytes) == plaintext — confirmed PASS on a real iOS Simulator running the real `react-native-quick-crypto` module (not jest-expo's mock; `jest.config.js` pins `web.ts` resolution first so jest never exercises the real native binding, per D-05). Combined, both cross-platform directions are proven byte-exact. |
| 5 | The Expo app launches on the iOS simulator (and Android emulator) under `gemba.filesend` (APP-02) | VERIFIED (iOS) / OVERRIDE (Android, deferred) | `apps/mobile/app.json`: `ios.bundleIdentifier: "gemba.filesend"`, `android.package: "gemba.filesend"`. `apps/mobile/ios/` prebuild output exists on disk (`GembaFilesend.xcworkspace`, `GembaFilesend.xcodeproj`, `Podfile`/`Podfile.lock`, gitignored per `.gitignore:76`) — physical evidence `expo prebuild --platform ios` + `expo run:ios` were actually executed in this environment, corroborating the orchestrator's direct observation of the app launching under `gemba.filesend` on iPhone 16 Pro Simulator. Fix commit `f8fbc57` (disable `typedRoutes`, which crashed `expo run:ios` in the npm-workspaces monorepo) is present in git log and reflected in the current `app.json` (`experiments.typedRoutes: false`). Android emulator launch not run in this environment — accepted-deferred (see overrides). |
| 6 | A manual web↔native round-trip confirms parity both directions (D-04) | OVERRIDE (deferred) | Not run as a literal manual click-through; superseded by the transitive automated proof in Truth 4 (see override rationale). |

**Score:** 6/6 truths verified (4 fully verified, 2 verified via explicit user-accepted override for the Android-emulator and manual-round-trip sub-items)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/crypto/src/crypto.native.ts` | react-native-quick-crypto AES-GCM/SHA-256 adapter, auth-tag concat/split | VERIFIED | Exists, substantive (127 lines), correct `getAuthTag`/`setAuthTag` order confirmed by direct read; wired via `index.ts` platform-resolution comment and Metro's `.native.ts` convention |
| `apps/mobile/app/harness.tsx` | On-device vector runner rendering PASS/FAIL + cross-decrypt | VERIFIED | Imports real `@gemba/crypto` + `@gemba/crypto/vectors`, runs 4 checks, renders exactly `"VECTORS PASS"` only when all pass; confirmed PASS on real device 2026-07-13 |
| `apps/mobile/.maestro/interop.yaml` | Maestro flow asserting rendered PASS | VERIFIED | `launchApp` → `tapOn: "Open interop harness"` → `assertVisible: "VECTORS PASS"` (15s timeout); `appId: gemba.filesend` matches `app.json` |
| `apps/mobile/eas.json` | Dev-client build profile targeting both platforms | VERIFIED | `development` profile: `ios.simulator: true`, `android.buildType: "apk"` |
| `packages/shared/src/index.ts` | Single-sourced client metadata contract | VERIFIED | `ClientMeta`/`validateClientMeta` exported, reused by web API routes per 05-SECURITY.md audit trail |
| Root `package.json` workspaces | npm workspaces monorepo | VERIFIED | `"workspaces": ["apps/*", "packages/*"]` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `apps/mobile/app/harness.tsx` | `@gemba/crypto` (`crypto.native.ts`) | import + Metro `.native.ts` resolution | WIRED | Metro resolves the real native adapter in the app bundle (confirmed by on-device run); jest resolves `web.ts` first (`jest.config.js`) so the test suite never touches the real binding — correctly separated per D-05 |
| `apps/mobile/app/harness.tsx` | `packages/crypto/src/vectors.ts` | single frozen-bytes source | WIRED | `harness.tsx` imports `expectedPackedBase64`/`expectedSha256Hex`/`expectedBase64Url`/fixed inputs directly from `@gemba/crypto/vectors` — same file `apps/web/src/golden-vectors.test.ts` imports; no second copy of expected bytes exists |
| `apps/mobile/.maestro/interop.yaml` | harness rendered text | `assertVisible "VECTORS PASS"` | WIRED | Confirmed present; real on-device run reported this text visible |
| `apps/web`, `apps/mobile` | `packages/crypto` | npm workspace resolution | WIRED | Both apps' `package.json` depend on `@gemba/crypto`; web/mobile test suites both import and pass against it |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| APP-01 | 05-01 | Monorepo restructure, single-sourced crypto package | SATISFIED | Workspaces + `packages/crypto`/`packages/shared` verified above |
| CRYPTO-01 | 05-02, 05-04 | Native AES-128-GCM byte-exact parity | SATISFIED | `crypto.native.ts` auth-tag handling verified by code read + on-device PASS |
| CRYPTO-02 | 05-02, 05-04 | Native SHA-256 + Base64URL parity | SATISFIED | Shared `encoding.ts` + native `sha256Hex`; on-device PASS |
| CRYPTO-03 | 05-02, 05-04 | Automated web↔native interop test (walking-skeleton gate) | SATISFIED | Transitive frozen-vector proof (web test suite + on-device harness), on-device run confirmed 2026-07-13; Android leg + manual round-trip accepted-deferred (override) |
| APP-02 | 05-03, 05-04 | Expo app launches on iOS simulator + Android emulator under `gemba.filesend` | SATISFIED (iOS); Android accepted-deferred (override) | iOS confirmed on-device 2026-07-13; `ios/` prebuild artifacts on disk corroborate; Android emulator run deferred to Phase 8 per user decision |

No orphaned requirements — all 5 requirement IDs mapped to this phase (APP-01, APP-02, CRYPTO-01..03) appear in at least one plan's `requirements:` frontmatter (05-01: APP-01; 05-02: APP-01, CRYPTO-01..03; 05-03: APP-02; 05-04: APP-02, CRYPTO-01..03).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER found in any phase-modified source file (`crypto.native.ts`, `crypto.web.ts`, `index.ts`, `encoding.ts`, `vectors.ts`, `harness.tsx`, `app.json`, `next.config.ts`) | — | none | — |
| `.planning/REQUIREMENTS.md` | top checkbox list (lines ~15-21) | Documentation inconsistency: the `- [ ]` checkbox list for CRYPTO-01/02/03 and APP-02 still shows unchecked, while the Traceability table further down (uncommitted working-tree change) shows "Complete" for the same IDs, dated 2026-07-13 | ⚠️ WARNING (info-level, non-blocking) | Cosmetic only — does not affect code correctness. Should be synced and committed before closing the phase so the two sections of REQUIREMENTS.md agree. |
| working tree | — | `.planning/REQUIREMENTS.md` and `apps/mobile/tsconfig.json` have uncommitted changes (traceability update; `tsconfig.json`'s benign `expo prebuild`-generated include/exclude reformat); `apps/mobile/.gitignore` and `apps/mobile/.omc/` are untracked | ℹ️ INFO | Should be committed/reviewed as part of closing this phase; `tsconfig.json` diff is a benign formatting/include-list sync from `expo prebuild`, re-confirmed mobile jest suite (3/3) still passes against it |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Mobile jest-expo core suite passes (shared packing math, no real native binding) | `npm run test --workspace=apps/mobile` | `Tests: 3 passed, 3 total` — verified suite imports only `@gemba/crypto`/`@gemba/crypto/vectors`, never `react-native-quick-crypto` directly | PASS |
| Web Vitest suite passes (incl. golden vectors) | `npm run test -- --run` (apps/web) | `Test Files 4 passed (4)`, `Tests 37 passed (37)` | PASS |
| `crypto.native.ts` calls `getAuthTag`/`setAuthTag` in correct order | direct file read | Confirmed: `getAuthTag()` after `cipher.final()` on encrypt; `setAuthTag()` before `decipher.update()`/`final()` on decrypt | PASS |
| App identifier consistent across iOS/Android/Maestro | `app.json` + `.maestro/interop.yaml` | `gemba.filesend` in all three locations | PASS |
| On-device Maestro/harness VECTORS PASS (real device, real crypto primitive) | orchestrator-observed `expo prebuild --platform ios` + `expo run:ios` on iPhone 16 Pro Simulator, Xcode 26.6, 2026-07-13 | "VECTORS PASS" with all 4 sub-assertions green | PASS (directly observed by orchestrator; corroborated in-repo by `apps/mobile/ios/` prebuild artifacts, Xcode/simctl tooling present on this machine, and fix commit `f8fbc57`) |

### Human Verification Required

None outstanding. The two remaining human-gated sub-items from the 05-04 plan (Android emulator confirmation, manual web↔native round-trip) have already been explicitly decided by the user (2026-07-13) and are recorded as accepted overrides above, deferred to Phase 8 (Android Release) rather than left as open human-verification asks.

### Gaps Summary

No blocking gaps. The walking-skeleton gate (CRYPTO-01/02/03, APP-02-iOS) is closed with real on-device evidence — not merely SUMMARY.md narrative:

- The auth-tag concat/split logic in `crypto.native.ts` was read directly and confirmed byte-correct.
- The harness and Maestro flow are wired to the single frozen-vector oracle shared with the web test suite (no second copy of expected bytes).
- The iOS on-device run is corroborated by physical evidence in the repo (`apps/mobile/ios/` prebuild output, present Xcode/simctl tooling, the `f8fbc57` typedRoutes fix commit needed to make `expo run:ios` work in this monorepo) in addition to the orchestrator's direct observation.
- Web and mobile automated test suites both independently re-verified green (37/37, 3/3).

Two items remain intentionally deferred per explicit user decision rather than failed: Android-emulator on-device confirmation (same crypto module as iOS, deferred to Phase 8's Android release build) and the manual round-trip click-through (superseded by the transitive automated byte-proof already covering both directions). Neither blocks Phase 6 (uploader) from starting.

**Minor housekeeping (non-blocking):** commit the pending `.planning/REQUIREMENTS.md` traceability update and sync its top checkbox list to match; review/commit or gitignore the `apps/mobile/.omc/` and confirm `apps/mobile/tsconfig.json`'s prebuild-driven diff is intentional before merging.

---

*Verified: 2026-07-13*
*Verifier: Claude (gsd-verifier)*
