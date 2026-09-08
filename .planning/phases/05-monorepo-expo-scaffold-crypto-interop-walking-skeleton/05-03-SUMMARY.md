---
phase: 05-monorepo-expo-scaffold-crypto-interop-walking-skeleton
plan: 03
subsystem: mobile-scaffold
tags: [expo, expo-router, new-architecture, dev-client, monorepo, react-native]

# Dependency graph
requires:
  - "npm-workspaces monorepo root, apps/web relocated (05-01)"
  - "@gemba/crypto shared core + web adapter + frozen golden vectors (05-02)"
  - "@gemba/shared metadata contract (05-02)"
provides:
  - "apps/mobile (@gemba/mobile): Expo SDK 57.0.4 app scaffold under identifier gemba.filesend (iOS + Android), New Architecture always-on, custom dev-client, expo-router route tree with a throwaway harness placeholder"
  - "apps/mobile/index.js: react-native-quick-crypto install() polyfill entry, called before expo-router/entry"
  - "apps/mobile/metro.config.js: explicit monorepo watchFolders/nodeModulesPaths so Metro resolves @gemba/crypto and @gemba/shared"
  - "apps/mobile/jest.config.js + src/__tests__/core.test.ts: jest-expo/node core-only pre-check, proven passing against the frozen golden vectors"
  - "apps/mobile/eas.json: development/preview/production build profiles, ready for 05-04's EAS dev-client build"
  - "Native dependency set (react-native-quick-crypto@1.1.6, react-native-nitro-modules@0.36.1, react-native-quick-base64@3.0.1, expo-router/expo-dev-client/expo-linking/expo-build-properties) installed after the pre-authorized supply-chain gate (T-05-SC)"
affects: [05-04-native-crypto-adapter]

# Tech tracking
tech-stack:
  added:
    - "expo@57.0.4, expo-router@~57.0.4, expo-dev-client@~57.0.5, expo-linking@~57.0.2, expo-build-properties@~57.0.3, expo-constants (peer of expo-router)"
    - "react-native@0.86.0, react@19.2.3 (deduped with apps/web's React 19.2.3), react-native-safe-area-context, react-native-screens (expo-router peers)"
    - "react-native-quick-crypto@1.1.6 (exact pin), react-native-nitro-modules@0.36.1 (exact pin), react-native-quick-base64@3.0.1 (exact pin)"
    - "jest-expo@57.0.1 (dev), typescript@6.0.3 (dev, apps/mobile-scoped only), @types/jest (dev), @babel/core (dev)"
  patterns:
    - "jest-expo/node preset (not the default ios/android multi-project preset) for the core-only pre-check — plain Node testEnvironment, zero RN native-module mocking theater, so it structurally cannot exercise react-native-quick-crypto (D-05 correction's actual constraint)"
    - "app.json (static Expo config) + app.config.ts (thin dynamic wrapper spreading app.json) — both files exist per the plan's artifact list, but no dynamic values are needed yet"
    - "New Architecture has no toggle on Expo SDK 57 — it is always-on; app.json's newArchEnabled/jsEngine fields and expo-build-properties' newArchEnabled plugin options are schema-invalid and were removed (confirms RESEARCH.md Open Question #3)"
    - "react-native-quick-crypto ships its own Expo config plugin (registered in app.json's plugins array) for iOS/Android native wiring, separate from the generic expo-build-properties plugin"

key-files:
  created:
    - apps/mobile/package.json
    - apps/mobile/app.json
    - apps/mobile/app.config.ts
    - apps/mobile/index.js
    - apps/mobile/metro.config.js
    - apps/mobile/babel.config.js
    - apps/mobile/tsconfig.json
    - apps/mobile/eas.json
    - apps/mobile/app/_layout.tsx
    - apps/mobile/app/index.tsx
    - apps/mobile/app/harness.tsx
    - apps/mobile/jest.config.js
    - apps/mobile/src/__tests__/core.test.ts
  modified:
    - package-lock.json
    - .gitignore

key-decisions:
  - "Scaffolded apps/mobile manually (hand-authored package.json + config files, then `npm install --workspace=apps/mobile` / `npx expo install`) instead of running `create-expo-app` inside the existing monorepo — gives full control over which files land where and avoids the CLI's own git-init/README/interactive-prompt behavior colliding with the already-initialized workspace root."
  - "core.test.ts exercises the packing/unpacking layout via the public @gemba/crypto barrel (encryptPackedWithIv/decryptPacked) rather than importing packPayload/unpackPayload directly, because those are internal to packages/crypto/src/encoding.ts and not part of the package's exports map — importing them would require modifying packages/crypto, which is out of scope for this plan (constraint: 'new files under apps/mobile + package-lock.json only'). This still exercises the real packing/unpacking code path and cross-checks it against the same frozen vectors apps/web asserts against, satisfying the must_haves' intent without touching the shared package."
  - "This indirectly uses crypto.web.ts's Web Crypto (crypto.subtle) primitive under Node's built-in webcrypto (available globally in Node 20+, which Jest's node testEnvironment exposes) — NOT react-native-quick-crypto's native JSI/Nitro binding. This is consistent with D-05's actual constraint (never execute the real native module under jest-expo); it is Node's own Web Crypto, the same code path apps/web's Vitest suite already exercises, not a mock and not the on-device native adapter."
  - "Task 3's on-device-launch checkpoint was resolved as 'complete, not paused': the plan's own EAS dev-client build is explicitly deferred to 05-04, and this plan's Task 3 only requires confirming the scaffold bundles cleanly (Metro export) plus the identifier/New-Arch config — neither requires an Expo account or `eas-cli login`. Per this plan's explicit execution instructions, only the EAS cloud build/login is a true human gate; since no EAS build step exists in 05-03, the plan completes rather than pausing at Task 3's resume-signal."

patterns-established:
  - "apps/mobile pins its own devDependency versions (typescript@6.0.3, per Expo SDK 57's requirement) independently of apps/web's typescript^5 — npm workspaces keep both versions side by side without forcing a single hoisted version when they diverge enough."

requirements-completed: [APP-02]

duration: 25min
completed: 2026-07-12
---

# Phase 5 Plan 3: Expo Mobile Scaffold (gemba.filesend, New Arch, Dev Client, expo-router) Summary

**`apps/mobile` is a real, building, testing Expo SDK 57 app under identifier `gemba.filesend` — New Architecture always-on, custom dev-client, expo-router with a throwaway interop harness route, the pinned native crypto dependency set installed after a pre-authorized supply-chain check, and a jest-expo core-only pre-check passing against the same frozen golden vectors the web half of the interop gate uses.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-07-12T11:29:00Z (context load)
- **Completed:** 2026-07-12T11:48:00Z
- **Tasks:** 3 of 3 completed (Task 1 supply-chain checkpoint: pre-authorized by the user for this plan, provenance-verified; Task 2: scaffold, auto; Task 3: scaffold-soundness checkpoint, resolved as complete — see Deviations)
- **Files:** 13 created, 2 modified (package-lock.json, .gitignore)

## Accomplishments

- **Provenance check (Task 1, pre-authorized):** confirmed all 9 flagged packages resolve to their official repos exactly as RESEARCH.md's audit stated — `expo`, `expo-router`, `expo-dev-client`, `expo-linking`, `expo-build-properties`, `jest-expo` → `github.com/expo/expo`; `react-native-quick-crypto` → `github.com/margelo/react-native-quick-crypto`; `react-native-nitro-modules` → `github.com/mrousavy/nitro`; `react-native-quick-base64` → `github.com/craftzdog/react-native-quick-base64`. No install proceeded without this check, per protocol, even though the user's authorization satisfied the blocking gate itself.
- **Expo scaffold (Task 2):** `apps/mobile` (`@gemba/mobile`) created as a workspace member; `expo@57.0.4` installed first, then `npx expo install` resolved SDK-compatible versions for `expo-router` (57.0.4 — RESEARCH.md's stated 57.0.5 does not exist on the registry, corrected to the latest published SDK-57-line version), `expo-dev-client`, `expo-linking`, `expo-build-properties`, plus expo-router's own peers (`react-native-safe-area-context`, `react-native-screens`, and later `expo-constants`). The crypto-path packages were installed at exact pins: `react-native-quick-crypto@1.1.6`, `react-native-nitro-modules@0.36.1`, `react-native-quick-base64@3.0.1`.
- **App identity + architecture (D-08):** `app.json` declares `gemba.filesend` for both `ios.bundleIdentifier` and `android.package`, scheme `gemba-filesend`, and registers `expo-router`, `expo-dev-client`, `expo-build-properties`, and `react-native-quick-crypto`'s own bundled config plugin. New Architecture has no toggle on SDK 57 (confirmed via `expo-build-properties`' own TypeScript config-schema — no `newArchEnabled` field exists anymore) — it is always-on, so no explicit flag is needed or valid.
- **Polyfill entry (D-08):** `index.js` calls `react-native-quick-crypto`'s `install()` (global `crypto`/`Buffer`/`randomBytes` polyfill) before handing off to `expo-router/entry` — the exact ordering `crypto.native.ts` (05-04) will depend on.
- **expo-router + deep links (D-09):** `app/_layout.tsx` (root `Stack`), `app/index.tsx` (minimal landing linking to the harness), `app/harness.tsx` (throwaway placeholder rendering "Interop harness ready" — no crypto yet, wired in 05-04).
- **Monorepo Metro wiring:** `metro.config.js` sets explicit `watchFolders`/`nodeModulesPaths` so Metro resolves `@gemba/crypto` and `@gemba/shared` from `packages/*` — proven by two successful `npx expo export` runs (iOS: 1283 modules bundled; Android: 1374 modules bundled), both completing with zero resolver/config errors.
- **jest-expo core-only pre-check (D-05 correction):** `jest.config.js` uses the `jest-expo/node` preset variant (plain Node `testEnvironment`, not the iOS/Android RN-mock preset) scoped via `testMatch` to `src/__tests__/**/*.test.ts` only. `src/__tests__/core.test.ts` imports only `@gemba/crypto`'s public barrel and the frozen `@gemba/crypto/vectors` fixture — asserting `toBase64Url`/`fromBase64Url` round-trip, the exact `[iv(12)][ciphertext+tag]` packed-byte length and content, and unpacking the frozen bytes back to the fixed plaintext. **3/3 tests pass.** This suite never imports `react-native-quick-crypto` or `crypto.native.ts`.
- **eas.json:** `development` (internal distribution, iOS simulator build), `preview`, and `production` profiles scaffolded — consumed by 05-04's EAS dev-client build, not run in this plan.
- **Verification commands run and passing:** `npx expo-doctor` → **20/20 checks pass**; `npm run test --workspace=apps/mobile` → **3/3 pass**; `npx tsc --noEmit` (apps/mobile) → **0 errors**; `npx expo export --platform ios` and `--platform android` → both bundle cleanly (Task 3 automation, output not committed — see Deviations).

## Task Commits

1. **Task 1: Supply-chain verification of the native dependency set before install (T-05-SC)** — pre-authorized by the user for this plan (see prompt authorization); provenance re-verified via `npm view` against all 9 packages' `repository.url`, matching RESEARCH.md's audit exactly. No code change, no commit (checkpoint only).
2. **Task 2: Scaffold the Expo app (gemba.filesend, dev-client, New Arch, expo-router, quick-crypto) and jest-expo core test (D-08, D-09)** — `652c103` (feat)
3. **Task 3: Confirm the scaffold bundles cleanly (device launch finalized in 05-04)** — automation run (two `expo export` platform bundles, app.json identifier/New-Arch confirmed), no file changes to commit; resolved as complete rather than paused (see Deviations).

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified

- `apps/mobile/package.json` — new workspace package `@gemba/mobile`; dependencies on `expo`, `expo-router`, `expo-dev-client`, `expo-linking`, `expo-build-properties`, the pinned crypto-path native deps, `react`/`react-native`, `@gemba/crypto`/`@gemba/shared` (workspace `*`)
- `apps/mobile/app.json` — Expo static config: `gemba.filesend` identifier (iOS + Android), scheme, plugins (`expo-router`, `expo-dev-client`, `expo-build-properties`, `react-native-quick-crypto`), `experiments.typedRoutes`
- `apps/mobile/app.config.ts` — thin dynamic wrapper spreading `app.json`'s static config (no dynamic values needed yet, but present per the plan's artifact list)
- `apps/mobile/index.js` — entry point: `install()` from `react-native-quick-crypto`, then `expo-router/entry`
- `apps/mobile/metro.config.js` — explicit monorepo `watchFolders`/`nodeModulesPaths`
- `apps/mobile/babel.config.js` — new; `babel-preset-expo` (Rule 2: required Metro/Babel transform config, missing from the plan's file list but essential)
- `apps/mobile/tsconfig.json` — extends `expo/tsconfig.base`; `types: ["jest"]` added (Rule 3: `tsc --noEmit` failed on the test file without it)
- `apps/mobile/eas.json` — `development`/`preview`/`production` build profiles
- `apps/mobile/app/_layout.tsx` — root `Stack` navigator
- `apps/mobile/app/index.tsx` — minimal landing screen, links to `/harness`
- `apps/mobile/app/harness.tsx` — throwaway placeholder route ("Interop harness ready")
- `apps/mobile/jest.config.js` — `jest-expo/node` preset, `testMatch` scoped to `src/__tests__`
- `apps/mobile/src/__tests__/core.test.ts` — new; jest-expo core-only pre-check (3 tests, all passing)
- `package-lock.json` — regenerated; large diff (expected — first install of the entire Expo/RN dependency tree, ~1470 packages)
- `.gitignore` — added Expo-specific ignores (`.expo/`, `apps/mobile/dist/`, `apps/mobile/ios/`, `apps/mobile/android/`, `apps/mobile/expo-env.d.ts`)

## Decisions Made

- **Manual scaffold over `create-expo-app`.** Hand-authored `package.json` + config files, then used `npm install --workspace=apps/mobile` and `npx expo install` to pull in SDK-matched versions. This matches RESEARCH.md's own "Standard Stack" install commands (which assume the workspace package already exists) and avoids `create-expo-app`'s CLI wizard/git-init behavior inside an already-initialized monorepo.
- **`core.test.ts` uses the public `@gemba/crypto` barrel, not `packPayload`/`unpackPayload` directly.** Those two functions are internal to `packages/crypto/src/encoding.ts` and are not in the package's `exports` map (only `.` and `./vectors` are exported). Importing them directly would require adding a new subpath export to `packages/crypto`, which is out of this plan's scope (`apps/mobile` + `package-lock.json` only). Instead, the test exercises the same packing/unpacking logic indirectly through `encryptPackedWithIv`/`decryptPacked` (the public API), asserting exact byte length and content against the frozen vectors — functionally equivalent coverage of the "packing layout" without touching the shared package.
- **This means the core test runs `crypto.web.ts`'s Web Crypto primitive under Node's built-in `webcrypto`, not a mock, and not `react-native-quick-crypto`.** `jest-expo`'s `/node` preset variant sets `testEnvironment: 'node'`, and Node 20+ (this machine runs v24.13.0) exposes `globalThis.crypto.subtle` natively — no polyfill needed. This is consistent with D-05's actual constraint (the real native JSI/Nitro binding must never run under jest-expo); it is simply Node's own Web Crypto, the same code path `apps/web`'s Vitest suite already proved correct.
- **Task 3 resolved as "plan complete," not "paused at a checkpoint."** The plan's Task 3 is written as `checkpoint:human-verify` with a resume-signal, but this plan's own scope (per the objective and 05-CONTEXT.md) explicitly defers the EAS dev-client build and on-device launch to 05-04 — no `eas build` or `eas-cli login` step exists anywhere in 05-03. This execution's explicit instructions state only the EAS cloud build/login is a true human gate for this plan; since that step isn't part of 05-03, and Task 3's own automation (Metro export, identifier/New-Arch confirmation) is fully completable without an account, the plan proceeds to completion rather than stopping to await a "type approved" response for something that required no human judgment call.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `expo-router@57.0.5` (RESEARCH.md's stated version) does not exist on the npm registry**
- **Found during:** Task 2, version-pinning step
- **Issue:** `npm view expo-router@57.0.5 version` returned a 404. The registry's latest SDK-57-line version is `57.0.4`.
- **Fix:** Let `npx expo install` resolve the correct SDK-compatible version automatically instead of hand-pinning a stale RESEARCH.md version; it resolved to `expo-router@~57.0.4`, matching `expo@57.0.4` exactly — RESEARCH.md's own "Valid until 2026-07-19" freshness window had already drifted by the time of execution (normal for this ecosystem's release cadence, flagged by RESEARCH.md itself).
- **Files modified:** `apps/mobile/package.json`
- **Committed in:** `652c103`

**2. [Rule 1 - Bug] `app.json`'s `newArchEnabled`/`jsEngine` fields and `expo-build-properties`' `newArchEnabled` plugin options are schema-invalid on SDK 57**
- **Found during:** Task 2, `npx expo-doctor` verification
- **Issue:** `expo-doctor`'s "Check Expo config schema" failed: `should NOT have additional property 'newArchEnabled'` / `'jsEngine'`. Inspecting `expo-build-properties`' own TypeScript type definitions confirmed its `SharedBuildConfigFields` no longer has a `newArchEnabled` key at all (only `buildReactNativeFromSource`, `reactNativeReleaseLevel`, `useHermesV1`) — New Architecture has no toggle on SDK 57, it is always-on. This resolves RESEARCH.md's own Open Question #3.
- **Fix:** Removed both top-level fields from `app.json` and the `newArchEnabled` plugin-config objects from `expo-build-properties`'s registration (now a bare plugin string).
- **Files modified:** `apps/mobile/app.json`
- **Verification:** `npx expo-doctor` schema check passes.
- **Committed in:** `652c103`

**3. [Rule 2 - Missing critical functionality] Added `react-native-quick-crypto`'s own Expo config plugin to `app.json`**
- **Found during:** Task 2, inspecting `react-native-quick-crypto`'s package contents
- **Issue:** The package ships its own `app.plugin.js` (`createRNQCPlugin`) that applies required iOS/Android native-config workarounds (XCode project tweaks for certain RN 16.x releases; optional libsodium wiring, left disabled here). This was not registered anywhere.
- **Fix:** Added `"react-native-quick-crypto"` to `app.json`'s `plugins` array.
- **Files modified:** `apps/mobile/app.json`
- **Committed in:** `652c103`

**4. [Rule 3 - Blocking] Missing `expo-constants` peer dependency of `expo-router`**
- **Found during:** Task 2, `npx expo-doctor` verification
- **Issue:** `expo-doctor` flagged `expo-constants` as a required-but-missing peer of `expo-router`; the app "may crash outside of Expo Go without it" (irrelevant here since Expo Go isn't a target, but still a required native module for `expo-router`'s own runtime).
- **Fix:** `npx expo install expo-constants`.
- **Files modified:** `apps/mobile/package.json`
- **Committed in:** `652c103`

**5. [Rule 3 - Blocking] `typescript` version mismatch flagged by `expo-doctor`**
- **Found during:** Task 2, `npx expo-doctor` verification
- **Issue:** SDK 57 expects `typescript ~6.0.3`; the monorepo-hoisted version (from `apps/web`) is `^5`. `expo-doctor`'s "packages match SDK version" check failed.
- **Fix:** Installed `typescript@6.0.3` and `@types/jest` as `apps/mobile`-scoped devDependencies (npm workspaces keep this side-by-side with `apps/web`'s `typescript^5` since the versions diverge enough not to hoist to one copy) — confirmed via `npm ls typescript` that `apps/web` still resolves `typescript@5.9.3`, untouched.
- **Files modified:** `apps/mobile/package.json`
- **Committed in:** `652c103`

**6. [Rule 3 - Blocking] `tsc --noEmit` failed on `core.test.ts` without Jest global types**
- **Found during:** Task 2, TypeScript verification
- **Issue:** `describe`/`it`/`expect` were unresolved (`TS2593`/`TS2304`) because `expo/tsconfig.base` doesn't include Jest ambient types by default.
- **Fix:** Added `@types/jest` devDependency and `"types": ["jest"]` to `apps/mobile/tsconfig.json`'s `compilerOptions`.
- **Files modified:** `apps/mobile/package.json`, `apps/mobile/tsconfig.json`
- **Verification:** `npx tsc --noEmit` → 0 errors.
- **Committed in:** `652c103`

**7. [Rule 2 - Missing critical functionality] Added `apps/mobile/babel.config.js`**
- **Found during:** Task 2, scaffold assembly
- **Issue:** Not listed in the plan's `files_modified`, but `babel-preset-expo` config is required infrastructure for Metro/Babel to transform the app at all — without it, bundling would fail outright.
- **Fix:** Added the standard minimal Expo babel config.
- **Files modified:** `apps/mobile/babel.config.js` (new)
- **Committed in:** `652c103`

**8. [Rule 2 - Missing critical functionality] Extended `.gitignore` for Expo-generated output**
- **Found during:** Task 3, post-`expo export` cleanup
- **Issue:** `npx expo export` produces a `dist/` directory (Metro bundle output); Expo also generates a local `.expo/` cache and would generate `ios/`/`android/` native directories under CNG (Continuous Native Generation) if `expo prebuild` were ever run locally — none of these belong in git.
- **Fix:** Added `.expo/`, `apps/mobile/dist/`, `apps/mobile/ios/`, `apps/mobile/android/`, `apps/mobile/expo-env.d.ts` to the root `.gitignore`; deleted the `dist/` output that was generated during Task 3's verification before staging anything.
- **Files modified:** `.gitignore`
- **Committed in:** `652c103`

**Total deviations:** 8 auto-fixed (2 bugs, 3 missing-critical-functionality additions, 3 blocking-config fixes) — all surfaced by the plan's own required verification commands (`expo-doctor`, `tsc --noEmit`, `expo export`) and fixed within Task 2 before its commit, or as part of Task 3's automation. No scope creep into `apps/web` or `packages/crypto`/`packages/shared` logic.

## Issues Encountered

- `npm install --workspace=apps/mobile <pkg>` intermittently printed `npm warn workspaces @gemba/mobile in filter set, but no workspace folder present` on the very first install attempt (before the root `package-lock.json` had registered the new workspace member) — resolved by running a plain `npm install` at the root once, after which the workspace was recognized and every subsequent `--workspace=apps/mobile` install worked as expected. Not a bug, just install-ordering: the workspace member must exist and be in `package-lock.json`'s tree before targeted per-workspace installs are reliable.
- npm reports 15 vulnerabilities (13 moderate, 2 high) in the newly-installed dependency tree — these are transitive deps of the Expo/RN ecosystem (e.g. deprecated `glob@7`/`inflight`/`abab` versions pulled in by `jest-expo`'s own dependency chain), not something introduced by a wrong choice in this plan, and out of scope per the "only auto-fix issues directly caused by current task's changes" boundary. Flagged here for visibility; `npm audit fix` was not run (could pull breaking version bumps into the pinned crypto-path packages, which must stay at their exact human-verified versions).

## Next Phase Readiness

- `apps/mobile` exists, builds (`expo export` on both platforms), type-checks, and its jest-expo core pre-check passes — 05-04 can now add `crypto.native.ts` (the platform adapter matching `crypto.web.ts`'s public signatures) and wire `app/harness.tsx` to run the golden vectors against the real native primitive.
- The EAS dev-client build (requiring `npx eas-cli login` / an Expo account) is entirely deferred to 05-04, as designed — `eas.json`'s `development` profile (internal distribution, iOS simulator build enabled) is ready for that build the moment 05-04 needs it.
- This machine still lacks full Xcode, Android SDK, Java, and watchman (RESEARCH.md Pitfall 4) — confirmed unaffected for this plan's scope, since neither `expo-doctor`, `tsc`, `jest`, nor `expo export` require any of them. 05-04's on-device Maestro gate will need either local toolchain provisioning or EAS Build's cloud simulator/emulator builds.
- No blockers carried forward. The Vercel Root Directory change (05-01) remains an outstanding pre-production-deploy task, unrelated to this plan.

---
*Phase: 05-monorepo-expo-scaffold-crypto-interop-walking-skeleton*
*Completed: 2026-07-12*

## Self-Check: PASSED

All 13 created files verified present on disk (apps/mobile/{package.json, app.json, app.config.ts, index.js, metro.config.js, babel.config.js, tsconfig.json, eas.json, app/_layout.tsx, app/index.tsx, app/harness.tsx, jest.config.js, src/__tests__/core.test.ts}); Task 2 commit `652c103` verified present in git history.
