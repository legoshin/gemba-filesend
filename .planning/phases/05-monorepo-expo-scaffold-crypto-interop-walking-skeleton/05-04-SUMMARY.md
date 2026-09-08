---
phase: 05-monorepo-expo-scaffold-crypto-interop-walking-skeleton
plan: 04
subsystem: crypto
tags: [react-native-quick-crypto, aes-128-gcm, sha-256, expo-router, maestro, eas, jest-expo]

requires:
  - phase: 05-02
    provides: "@gemba/crypto shared core (packing/Base64URL/constants) + crypto.web.ts + frozen golden vectors (vectors.ts)"
  - phase: 05-03
    provides: "Expo mobile scaffold (expo-router, harness.tsx placeholder, jest-expo config, eas.json development profile) with react-native-quick-crypto installed"
provides:
  - "packages/crypto/src/crypto.native.ts: react-native-quick-crypto platform adapter with correct auth-tag concat (encrypt)/split (decrypt) — D-02b"
  - "apps/mobile/app/harness.tsx wired to run the frozen golden vectors against the REAL crypto.native.ts on-device, rendering VECTORS PASS/FAIL + per-vector rows + mandatory cross-decrypt check"
  - "apps/mobile/.maestro/interop.yaml Maestro flow asserting the rendered VECTORS PASS text"
  - "eas.json development profile hardened with android.buildType apk (directly installable on an emulator, alongside the existing ios.simulator config)"
affects: ["06-uploader", "07-downloader"]

tech-stack:
  added: []
  patterns:
    - "Native crypto adapter: local module-scoped CryptoKey type (opaque {raw} wrapper) — does not merge with the DOM CryptoKey global crypto.web.ts uses, but satisfies the same function signatures across both platform adapters"
    - "Auth-tag concat/split lives entirely inside crypto.native.ts (encryptRaw/decryptRaw); the shared core (index.ts) never learns about tag separateness"

key-files:
  created:
    - packages/crypto/src/crypto.native.ts
    - apps/mobile/.maestro/interop.yaml
  modified:
    - apps/mobile/app/harness.tsx
    - apps/mobile/eas.json

key-decisions:
  - "Auth-tag concat-on-encrypt / split-on-decrypt lives in crypto.native.ts only (encryptRaw/decryptRaw), matching crypto.web.ts's shape exactly — the shared core (index.ts/encoding.ts) stays primitive-agnostic per D-02b/RESEARCH Open Question #1"
  - "sha256Hex omits the inputEncoding argument to update() because that overload's .d.ts return type is Buffer (not Hash), which would break the .digest() chain — a quirk of react-native-quick-crypto's own type definitions, not a behavior change (both paths default to utf8)"
  - "eas.json development profile: added android.buildType 'apk' so the Android dev-client artifact is directly installable on an emulator without bundletool (the existing ios.simulator:true config already handled the iOS side)"

patterns-established:
  - "Native CryptoKey representation: module-local opaque {raw: Uint8Array} type, never a real WebCrypto CryptoKey — future native crypto work should follow the same shape"

requirements-completed: [APP-02, CRYPTO-01, CRYPTO-02, CRYPTO-03]

duration: ~15min
completed: 2026-07-12
---

# Phase 5 Plan 04: Native Crypto Adapter + On-Device Interop Harness Summary

**crypto.native.ts (react-native-quick-crypto, byte-exact auth-tag concat/split) wired into a real on-device harness + Maestro gate; on-device Maestro run and manual round-trip remain human-gated (CRYPTO-03 open)**

## Performance

- **Duration:** ~15 min (automatable tasks only)
- **Started:** 2026-07-12T12:53:00+01:00 (approx.)
- **Completed:** 2026-07-12T13:01:16+01:00
- **Tasks:** 2 of 3 completed (Task 3 is the human-gated checkpoint, see below)
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- `packages/crypto/src/crypto.native.ts` implements the full public async API matching `crypto.web.ts` exactly, using `react-native-quick-crypto`'s Node-style `createCipheriv`/`createDecipheriv`/`createHash`/`randomBytes`. Encrypt concatenates `getAuthTag()` onto the ciphertext; decrypt splits the last 16 bytes off as the tag and calls `setAuthTag()` before `final()` (D-02b) — the single highest-risk detail in this phase.
- `apps/mobile/app/harness.tsx` now runs all four golden-vector checks against the real native adapter on mount: (1) exact-byte encrypt match, (2) `sha256Hex` match, (3) `toBase64Url` match, (4) mandatory cross-decrypt (native decrypting the web-produced `expectedPackedBase64` bytes). Renders `"VECTORS PASS"` only if all four pass, `"VECTORS FAIL"` plus per-vector PASS/FAIL rows and failure detail otherwise.
- `apps/mobile/.maestro/interop.yaml` launches the app, taps into the harness route, and asserts the rendered `"VECTORS PASS"` text (15s timeout).
- `eas.json`'s `development` build profile now targets both platforms concretely: `ios.simulator: true` (already present) + newly added `android.buildType: "apk"` (directly installable on an emulator).

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement crypto.native.ts with correct auth-tag concat/split** - `20d51dc` (feat)
2. **Task 2: Wire the harness + author the Maestro flow** - `403154d` (feat)

**Plan metadata:** (this commit) - docs: complete plan

_Task 3 is `type="checkpoint:human-verify" gate="blocking-human"` — no code to commit; see "Checkpoint Handed to User" below._

## Files Created/Modified
- `packages/crypto/src/crypto.native.ts` - react-native-quick-crypto AES-128-GCM/SHA-256/CSPRNG adapter, matches `crypto.web.ts`'s public signatures; owns the auth-tag concat/split (D-02b)
- `apps/mobile/app/harness.tsx` - replaced the 05-03 placeholder with the real on-device vector runner + PASS/FAIL renderer
- `apps/mobile/.maestro/interop.yaml` - new Maestro flow asserting the rendered result
- `apps/mobile/eas.json` - `development` profile: added `android.buildType: "apk"`

## Decisions Made
- Auth-tag concat/split placed entirely inside `crypto.native.ts`'s `encryptRaw`/`decryptRaw` (mirroring `crypto.web.ts`'s function shapes exactly) rather than touching the shared core — resolves RESEARCH.md's Open Question #1 in favor of "adapter owns it" since that keeps the shared `packPayload`/`unpackPayload` primitive-agnostic.
- Native `CryptoKey` is a small local, module-scoped `{ raw: Uint8Array<ArrayBuffer> }` type (not the DOM `CryptoKey`, which quick-crypto's Node-shaped API has no equivalent for) — it shadows the global type only within this file (TS module scoping), so it never leaks into or conflicts with `crypto.web.ts`'s use of the real DOM `CryptoKey`.
- `sha256Hex` calls `.update(input)` without an explicit `"utf8"` second argument — react-native-quick-crypto's own `.d.ts` types that two-argument overload as returning `Buffer` (not `Hash`), which would break the `.digest()` chain at the type level; omitting it uses the same "utf8" default internally, so behavior is unchanged, this is purely a type-level workaround for the library's own overload definitions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `sha256Hex` type error from quick-crypto's own overload definitions**
- **Found during:** Task 1 (`tsc --noEmit` verification of `crypto.native.ts`)
- **Issue:** `createHash("sha256").update(input, "utf8").digest("hex")` failed to typecheck — `react-native-quick-crypto`'s `Hash.update()` overload with an explicit `inputEncoding` argument is typed to return `Buffer`, not `Hash`, so `.digest(...)` doesn't exist on the chained result (a quirk in the library's own `.d.ts`, not a behavior bug).
- **Fix:** Omit the second argument (`.update(input)`); the implementation defaults to `"utf8"` internally regardless, so output is unchanged.
- **Files modified:** `packages/crypto/src/crypto.native.ts`
- **Verification:** `npx tsc --noEmit --strict ...` on the file passes with 0 errors.
- **Committed in:** `20d51dc` (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added `android.buildType: "apk"` to eas.json's development profile**
- **Found during:** Task 2 (authoring the Maestro flow / confirming the dev-client build profile)
- **Issue:** The `development` profile only specified `ios.simulator: true`; without an explicit Android `buildType`, EAS defaults Android builds to an `.aab` (app bundle), which is not directly installable on an emulator (requires `bundletool` extraction) — this would silently break the Android half of Task 3's on-device gate.
- **Fix:** Added `"android": { "buildType": "apk" }` alongside the existing `ios.simulator` config, so both platforms produce an emulator/simulator-installable dev-client artifact.
- **Files modified:** `apps/mobile/eas.json`
- **Verification:** `node -e "JSON.parse(...)"` confirms valid JSON; profile now explicitly targets both platforms for the walking-skeleton gate.
- **Committed in:** `403154d` (Task 2 commit)

---

**3. [Rule 1 - Bug] Reverted REQUIREMENTS.md — CRYPTO-01/02/03 and APP-02 had already been marked `Complete` prematurely**
- **Found during:** state-update step (`requirements.mark-complete` returned `already_complete` for APP-02/CRYPTO-01/CRYPTO-02` before this plan's own human gate had run)
- **Issue:** `.planning/REQUIREMENTS.md` had all four of this plan's requirements (`CRYPTO-01`, `CRYPTO-02`, `CRYPTO-03`, `APP-02`) checked off `[x]` and marked "Complete" in the Traceability table, apparently from an earlier plan's (05-02/05-03) completion step. This directly contradicts this plan's own success criteria and Task 3's explicit instruction: "CRYPTO-03's on-device gate stays OPEN until the user confirms VECTORS PASS on a real device" — and APP-02/CRYPTO-01/CRYPTO-02 are equally gated on that same on-device run (D-05: jest-expo cannot execute the real native primitive, so only the Maestro/device run actually proves byte-for-byte native reproduction and a real simulator/emulator launch).
- **Fix:** Reverted all four checkboxes to `[ ]` and their Traceability status to `Pending (on-device gate open — 05-04 Task 3)`. `APP-01` (monorepo restructure) is unaffected — it has no on-device dependency and is legitimately complete.
- **Files modified:** `.planning/REQUIREMENTS.md`
- **Verification:** Re-read the file after edit; only `APP-01` remains `Complete` under Phase 5, matching the plan's actual state.
- **Committed in:** plan-metadata commit (this plan's `docs:` commit)

---

**Total deviations:** 3 auto-fixed (1 bug/type-fix, 1 missing-critical config, 1 requirements-tracking correction)
**Impact on plan:** All three fixes are corrections required for accuracy of the plan's own stated verification path and gating — no scope creep, no architectural changes. The requirements-tracking correction is important: it prevents Phase 6/7 (uploader/downloader) from appearing unblocked before the walking-skeleton gate is actually confirmed on a real device.

## Issues Encountered
None beyond the two auto-fixed items above.

## Verification Performed (no device required)

- `npx tsc --noEmit --strict --target esnext --lib dom,esnext --moduleResolution bundler --module esnext --esModuleInterop --skipLibCheck --resolveJsonModule packages/crypto/src/crypto.native.ts` → **0 errors**. (`packages/crypto` has no project-level `tsconfig.json`; this ad-hoc invocation mirrors the compiler options both `apps/web` and `apps/mobile` already use — `lib: dom+esnext`, `moduleResolution: bundler`, `strict: true` — so it is a faithful proxy for how the file will actually be typechecked when imported.)
- `cd apps/mobile && npx tsc --noEmit` → **0 errors** (whole `apps/mobile` project, including `harness.tsx`; per Metro/TS resolution notes below, this does not transitively typecheck `crypto.native.ts` itself — see "Known Limitation").
- `cd apps/mobile && npm run test` (jest-expo/node preset, `src/__tests__/core.test.ts`) → **3/3 passed**. Confirmed via `grep` that this suite imports only `@gemba/crypto` and `@gemba/crypto/vectors` — never `react-native-quick-crypto` or `crypto.native.ts` directly (D-05 compliance).
- `cd apps/web && npm run test` (Vitest) → **37/37 passed**, unaffected — confirms `crypto.native.ts` never entered the web bundle/test graph (D-02).
- `grep -q getAuthTag` and `grep -q setAuthTag` on `crypto.native.ts` → both present, in the correct encrypt/decrypt call order (verified by reading the file, not just grep: `getAuthTag()` called after `cipher.final()` on encrypt; `setAuthTag()` called before `decipher.update()`/`final()` on decrypt).
- `grep -q "VECTORS PASS"` on `harness.tsx` and `grep -q assertVisible` on `.maestro/interop.yaml` → both present.

**Known Limitation (documented, not a defect):** TypeScript's plain module resolution (used by both `apps/web`'s and `apps/mobile`'s `tsc`) always resolves `@gemba/crypto`'s internal `./crypto` import to `crypto.ts` (the platform-neutral fallback, which re-exports `crypto.web.ts`) — it has no awareness of Metro's platform-extension convention (`.native.ts` vs `.web.ts`). This means neither app's `tsc --noEmit` run transitively typechecks `crypto.native.ts` through the shared barrel; it is only exercised (a) directly, via the standalone `tsc` invocation above, and (b) at Metro bundle time for the real `apps/mobile` dev-client build. This is expected/documented behavior of the platform-adapter pattern (RESEARCH.md Pattern 1/2), not a gap introduced by this plan.

## User Setup Required

None beyond what Task 3 (below) already specifies — no new environment variables or dashboard configuration.

## Checkpoint Handed to User: Task 3 (EAS dev-client build + on-device Maestro gate + manual round-trip)

**This is a `type="checkpoint:human-verify" gate="blocking-human"` task per the plan — it cannot be automated from this environment** (no Expo account session, no full Xcode/Android SDK/Java/watchman/Maestro CLI on this machine — confirmed absent in 05-RESEARCH.md's Environment Availability table).

**What's already built and verified (above):** the byte-correct native adapter, the harness that runs the real vectors on-device, and the Maestro flow that will assert the result — everything that does NOT require a physical/virtual device or an EAS account.

**Exact commands for the user to run, in order:**

1. **Log in to EAS** (one-time, if not already authenticated):
   ```bash
   cd apps/mobile
   npx eas-cli login
   ```

2. **Build the dev client** for both platforms (uses the `development` profile in `eas.json`, now targeting iOS simulator + Android APK):
   ```bash
   npx eas-cli build --profile development --platform all
   ```
   (Or `--platform ios` / `--platform android` separately if preferred. If full Xcode + Android Studio + Java are provisioned locally instead, `npx expo prebuild` + `npx expo run:ios` / `npx expo run:android` is the local-build fallback — see 05-RESEARCH.md Pitfall 4.)

3. **Install + launch** the resulting build on the iOS simulator and the Android emulator. Confirm it launches under the `gemba.filesend` identifier (APP-02) and the landing screen ("Gemba Filesend" / "Mobile scaffold (Phase 5)") appears.

4. **Install Maestro** (if not already installed):
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

5. **Run the interop flow** against each running build:
   ```bash
   maestro test apps/mobile/.maestro/interop.yaml
   ```
   Confirm it reports success (asserts `"VECTORS PASS"` visible) on **both** the iOS simulator run and the Android emulator run (CRYPTO-03). If it reports `"VECTORS FAIL"` instead, open the app manually and read the per-vector failure detail rendered on the harness screen — report which check failed and the "got:" detail string shown.

6. **Manual round-trip (D-04):** encrypt a small test file using the deployed **web app** (`apps/web`, e.g. the existing `/upload` flow or a quick browser-console call to `@gemba/crypto`'s `encryptPacked`), then confirm the resulting packed ciphertext decrypts correctly when run through the native harness's `decryptPacked` (or an ad-hoc button/log in the harness, if convenient) — and the reverse: encrypt on native, decrypt on web. Confirm both directions succeed.

7. If EAS Workflows / Maestro Cloud isn't provisioned, running `maestro test` locally against a locally-running simulator/emulator (as in steps 2-3 above) fully satisfies this gate — no cloud dependency required.

**Resume signal:** Reply "approved" once Maestro asserts `VECTORS PASS` on both iOS and Android and the manual web↔native round-trip succeeds in both directions — or report the specific failing vector/direction/platform so it can be triaged.

**CRYPTO-03's on-device verification gate stays explicitly OPEN pending this confirmation.** No uploader/downloader work (Phase 6+) should begin until this checkpoint is approved.

## Next Phase Readiness
- `packages/crypto`'s native adapter is code-complete and passes every automatable check (tsc, jest-expo core suite, web test suite unaffected).
- The on-device Maestro gate and the manual round-trip are the only remaining walking-skeleton blockers — both require the human-run steps above.
- **Blocker for Phase 6+:** per the plan's own success criteria and CLAUDE.md's phase-gating rule, no uploader (Phase 6) or downloader (Phase 7) work should start until Task 3 is confirmed `VECTORS PASS` on both platforms plus the manual round-trip.

---
*Phase: 05-monorepo-expo-scaffold-crypto-interop-walking-skeleton*
*Completed: 2026-07-12 (Tasks 1-2; Task 3 pending human verification)*

## Self-Check: PASSED

- FOUND: packages/crypto/src/crypto.native.ts
- FOUND: apps/mobile/app/harness.tsx
- FOUND: apps/mobile/.maestro/interop.yaml
- FOUND: apps/mobile/eas.json
- FOUND commit: 20d51dc
- FOUND commit: 403154d
