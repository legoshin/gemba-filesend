---
phase: 05-monorepo-expo-scaffold-crypto-interop-walking-skeleton
fixed_at: 2026-07-12T14:00:00Z
review_path: .planning/phases/05-monorepo-expo-scaffold-crypto-interop-walking-skeleton/05-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 5: Code Review Fix Report

**Fixed at:** 2026-07-12T14:00:00Z
**Source review:** .planning/phases/05-monorepo-expo-scaffold-crypto-interop-walking-skeleton/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (Critical + Warning; Info findings IN-01..04 intentionally left untouched)
- Fixed: 2
- Skipped: 0

## Fixed Issues

### WR-01: Mobile jest suite does not pin adapter resolution and its own comment misstates what it tests

**Files modified:** `apps/mobile/jest.config.js`, `apps/mobile/src/__tests__/core.test.ts`
**Commit:** f862d63
**Applied fix:**
- Added `moduleFileExtensions: ["web.ts", "web.tsx", "ts", "tsx", "js", "jsx", "json"]` to `jest.config.js`, mirroring the `.web.ts`-first preference that `apps/web/next.config.ts` (`turbopack.resolveExtensions`) and `apps/web/vitest.config.ts` (`resolve.extensions`) already enforce. The barrel's `./crypto` import now deterministically resolves to `crypto.web.ts`, so `crypto.native.ts` (and its `react-native-quick-crypto` import) can never resolve into this Node jest run regardless of future `jest-expo` platform-default changes. (Jest's `moduleFileExtensions` are specified without leading dots — unlike Turbopack/Vitest — so `"web.ts"` is used, not `".web.ts"`.)
- Corrected the misleading header comment in `jest.config.js` and the JSDoc in `core.test.ts`: the suite exercises the shared pure-TS core (test 1) **plus** the web/fallback adapter's real AES-GCM via `globalThis.crypto.subtle` (tests 2–3 through `importKeyBase64`/`encryptPackedWithIv`/`decryptPacked`), not "pure-TS core only, no crypto adapter". The "MUST NOT load crypto.native.ts / react-native-quick-crypto" invariant is preserved and is now explicitly enforced by the pinned resolver rather than left implicit.
- Tests were not weakened — the byte-exact golden-vector assertions are unchanged.

### WR-02: `@gemba/crypto/vectors` subpath relies on package `exports` being honored by every consumer's bundler

**Files modified:** `apps/mobile/metro.config.js`, `packages/crypto/package.json`
**Commit:** e23e32d
**Applied fix:**
- Added `config.resolver.unstable_enablePackageExports = true` to `apps/mobile/metro.config.js` so Metro honors `@gemba/crypto`'s `exports` map explicitly, independent of whether the running Expo SDK / Metro version enables package-exports by default. This directly protects the upcoming on-device interop gate (`apps/mobile/app/harness.tsx` imports `@gemba/crypto/vectors`), which would otherwise silently resolve to the nonexistent `packages/crypto/vectors` and fail on-device.
- Hardened the `./vectors` entry in `packages/crypto/package.json` from a bare string to a condition map (`react-native` + `default`, both `./src/vectors.ts`), mirroring the `.` entry so condition-aware resolvers across every toolchain resolve it consistently. The golden vectors themselves were not touched.

## Verification (performed without a device)

All commands run inside an isolated git worktree with a fresh workspace `npm install` (workspace symlinks point at the worktree's own edited packages, so the results reflect the fixes):

| Command | Result |
|---------|--------|
| `npm test --workspace=apps/mobile` (jest-expo/node) | PASS — 1 suite, 3 tests. Confirms the `.web.ts`-pinned resolver still lands on `crypto.web.ts` and the golden-vector assertions pass. |
| `npm run test --workspace=apps/web` (vitest run) | PASS — 4 files, 37 tests. Confirms no regression in the web/Node crypto + storage + golden-vector suites. |
| `npx tsc --noEmit` (in `apps/mobile`) | PASS — "No errors found". |
| `node -e "require.resolve('@gemba/crypto/vectors', {paths:['apps/mobile']})"` | Resolves to `packages/crypto/src/vectors.ts` — confirms the `exports`-based subpath resolves correctly under an `exports`-honoring resolver. |
| `node -c` on `metro.config.js` / `jest.config.js`, `JSON.parse` on `packages/crypto/package.json` | All OK. |

**Not verifiable without a device:** WR-02's on-device Metro behavior (the actual `@gemba/crypto/vectors` import on-device inside the Expo/Metro bundler) remains gated by the Maestro interop run in 05-04. The fix removes the implicit dependency on Metro's default package-exports setting; final confirmation is the on-device interop gate.

**Untouched (per instructions):** apps/web crypto logic, `crypto.native.ts` auth-tag logic, and the golden vectors themselves were not modified. Info findings IN-01..IN-04 were left for a future hardening pass.

---

_Fixed: 2026-07-12T14:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
