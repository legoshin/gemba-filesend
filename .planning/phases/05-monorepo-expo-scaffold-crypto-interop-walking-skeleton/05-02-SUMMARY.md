---
phase: 05-monorepo-expo-scaffold-crypto-interop-walking-skeleton
plan: 02
subsystem: crypto, shared-metadata-contract
tags: [monorepo, crypto, npm-workspaces, turbopack, vitest, aes-gcm]

# Dependency graph
requires:
  - "npm-workspaces monorepo root, apps/web relocated (05-01)"
provides:
  - "@gemba/crypto: shared crypto core (constants, manual Base64URL codec, [iv][ciphertext+tag] packing) + Web Crypto adapter (crypto.web.ts) + frozen golden vectors (vectors.ts)"
  - "@gemba/shared: hoisted metadata contract (MAX_DOWNLOADS/MAX_EXPIRY_MS/MAX_BLOB_BYTES, validateClientMeta, ClientMeta type)"
  - "Platform-extension resolution wired for both Turbopack (next.config.ts) and Vitest (vitest.config.ts), preferring .web.ts and excluding any .native.ts entry"
  - "apps/web fully re-pointed to both packages; no source imports crypto from @/lib/crypto anymore"
  - "Web half of the CRYPTO-03 interop gate: byte-exact golden-vector assertions + cross-decrypt, passing"
affects: [05-03-expo-scaffold, 05-04-native-crypto-adapter]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared core (encoding.ts) + platform-neutral fallback (crypto.ts) + platform adapter (crypto.web.ts) split inside @gemba/crypto, avoiding a circular import between the barrel (index.ts) and the adapter"
    - "package.json exports map with a 'react-native' condition entry (Metro) alongside 'default' (Turbopack/Node), plus a dedicated './vectors' subpath export for the fixture"
    - "next.config.ts transpilePackages + turbopack.resolveExtensions (.web.ts first, no .native.ts) so raw-TypeScript workspace packages build correctly and the web bundle can never resolve a future native-only adapter"
    - "vitest.config.ts resolve.extensions mirrors the same platform-extension order for Node-env test resolution"

key-files:
  created:
    - packages/crypto/package.json
    - packages/crypto/src/index.ts
    - packages/crypto/src/encoding.ts
    - packages/crypto/src/crypto.ts
    - packages/crypto/src/crypto.web.ts
    - packages/crypto/src/vectors.ts
    - packages/shared/package.json
    - packages/shared/src/index.ts
    - apps/web/src/golden-vectors.test.ts
  modified:
    - apps/web/next.config.ts
    - apps/web/vitest.config.ts
    - apps/web/src/app/api/files/route.ts
    - apps/web/src/app/api/files/[id]/route.ts
    - apps/web/src/app/upload/page.tsx
    - apps/web/src/app/download/page.tsx
    - apps/web/src/lib/crypto.test.ts
    - apps/web/src/lib/storage.test.ts
    - package-lock.json
  deleted:
    - apps/web/src/lib/crypto.ts

key-decisions:
  - "Split @gemba/crypto into three internal files (encoding.ts, crypto.ts, crypto.web.ts) instead of authoring everything directly in index.ts as the action text literally suggested: encoding.ts holds platform-free constants/Base64URL/packing so both index.ts (barrel) and crypto.web.ts (adapter) can import it without a circular dependency; crypto.ts is a platform-neutral fallback re-export of crypto.web.ts so TypeScript's own module resolution (which has no concept of Turbopack's resolveExtensions or Metro's platform extensions) always resolves './crypto' successfully. This satisfies the interface_contracts' internal-primitive split (packPayload/unpackPayload/encryptPackedWithIv/getRandomBytes) while keeping index.ts as the single public-API entry point."
  - "Deleted apps/web/src/lib/crypto.ts outright rather than turning it into a re-export shim — the plan's acceptance criteria explicitly required 'no apps/web source imports crypto from @/lib/crypto anymore,' and a shim still existing unused would be dead code (CLAUDE.md surgical-changes / reuse-first rules)."
  - "Added a '@gemba/crypto/vectors' package.json export map entry so golden-vectors.test.ts can import the fixture as its own module (matching the plan's 'import vectors.ts and @gemba/crypto' language) without exposing an unbounded subpath wildcard."
  - "Renamed vectors.ts's exported constant names from an initial UPPER_SNAKE_CASE draft to camelCase (fixedKeyBase64Url, expectedPackedBase64, expectedSha256Hex, expectedBase64Url) to literally match the plan's must_haves.artifacts 'contains: expectedPackedBase64' check and the interface_contracts naming."

patterns-established:
  - "Golden-vector generation is a throwaway Vitest test (written, run once via the vitest CLI directly bypassing the rtk proxy's output-summarizing wrapper, output captured, then deleted) — not a checked-in generator script — since the frozen values are meant to never be regenerated casually."

requirements-completed: [APP-01, CRYPTO-01, CRYPTO-02, CRYPTO-03]

duration: 20min
completed: 2026-07-12
---

# Phase 5 Plan 2: Shared Crypto Core, Metadata Contract & Web Interop Gate Summary

**`@gemba/crypto` (shared core + Web Crypto adapter) and `@gemba/shared` (metadata contract) now single-source what used to live only in `apps/web`; the web half of the byte-exact crypto interop gate (frozen golden vectors + cross-decrypt) passes, locking the exact bytes the native adapter must reproduce in 05-04.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-12T12:01:00Z (context load)
- **Completed:** 2026-07-12T12:20:55Z (Task 3 commit)
- **Tasks:** 3 of 3 completed
- **Files:** 9 created, 9 modified, 1 deleted

## Accomplishments

- `@gemba/crypto` workspace package: platform-free core (`encoding.ts` — constants, a manual (no `btoa`/`atob`) Base64URL codec, `[iv][ciphertext+tag]` pack/unpack), a Web Crypto adapter (`crypto.web.ts`, no manual auth-tag concat/split since GCM handles that automatically), a platform-neutral fallback (`crypto.ts`) so `tsc`/Node resolve correctly even without bundler-level platform-extension config, and the public barrel (`index.ts`: `generateKey`, `exportKeyBase64`, `importKeyBase64`, `encryptPacked`, `decryptPacked`, `sha256Hex`, `randomSaltBase64`, plus `encryptPackedWithIv` for deterministic vector generation)
- `@gemba/shared` workspace package: `MAX_DOWNLOADS`/`MAX_EXPIRY_MS`/`MAX_BLOB_BYTES`, `validateClientMeta` (byte-identical predicate), and a `ClientMeta` type — hoisted verbatim from `apps/web/src/app/api/files/route.ts` per the 05-PATTERNS.md correction (not `storage.ts`)
- Every `apps/web` crypto import re-pointed to `@gemba/crypto`; `apps/web/src/lib/crypto.ts` deleted (no shim, no duplicate implementation)
- `apps/web/next.config.ts`: `transpilePackages: ["@gemba/crypto", "@gemba/shared"]` (raw-TS workspace packages need this or Turbopack's type-check fails) + `turbopack.resolveExtensions` preferring `.web.ts` with **no** `.native.ts` entry (D-02); Phase 4 CSP/HSTS/X-Frame-Options headers verified byte-identical, untouched
- `apps/web/vitest.config.ts`: mirrored `resolve.extensions` so Node-env Vitest also resolves the web adapter
- Frozen golden vectors (`packages/crypto/src/vectors.ts`): fixed 16-byte key, 12-byte IV, 43-byte plaintext → frozen `expectedPackedBase64` (71 bytes), `expectedSha256Hex`, `expectedBase64Url` — generated once against the real `crypto.web.ts` (the reference oracle) and hard-frozen as literals
- `apps/web/src/golden-vectors.test.ts`: asserts exact byte-equality (not just round-trip) for the packed ciphertext, the SHA-256 hex, and the Base64URL encoding, **and** cross-decrypts the frozen packed bytes back to the fixed plaintext — the assertion the interop gate exists to enforce (catches an off-by-16 auth-tag bug)
- Full verification: `npm run build --workspace=apps/web` succeeds, `npm run test --workspace=apps/web` passes **37/37** (33 pre-existing + 4 new golden-vector tests), `npm run lint --workspace=apps/web` is **0 errors** (1 pre-existing, unrelated `icon-data.js` warning)

## Task Commits

1. **Task 1: Create @gemba/crypto — shared core + web adapter + platform resolution (D-01, D-02)** - `541eb5a` (feat)
2. **Task 2: Create @gemba/shared and re-point every web import (D-03, D-02)** - `bcc0417` (feat)
3. **Task 3: Freeze golden vectors and prove the web byte-equality + cross-decrypt gate (CRYPTO-03, D-04)** - `f626991` (test)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified

- `packages/crypto/package.json` — new workspace package `@gemba/crypto`; `exports` map with a `react-native` condition (Metro) + `default` (Turbopack/Node), and a `./vectors` subpath export
- `packages/crypto/src/encoding.ts` — new; platform-free constants (`AES_KEY_BITS`, `IV_BYTES`, `GCM_TAG_BYTES`), manual `toBase64Url`/`fromBase64Url` (no `btoa`/`atob`), `packPayload`/`unpackPayload`
- `packages/crypto/src/crypto.ts` — new; platform-neutral fallback re-export of `./crypto.web` (resolved by `tsc`/Node; overridden by Turbopack's `resolveExtensions` and, in 05-04, Metro's platform resolution)
- `packages/crypto/src/crypto.web.ts` — new; Web Crypto adapter (`generateKey`, `importKeyRaw`, `exportKeyRaw`, `encryptRaw`, `decryptRaw`, `sha256Hex`, `getRandomBytes`) — no manual auth-tag concat/split
- `packages/crypto/src/index.ts` — new; public barrel (`exportKeyBase64`, `importKeyBase64`, `randomSaltBase64`, `encryptPackedWithIv`, `encryptPacked`, `decryptPacked`, plus re-exports)
- `packages/crypto/src/vectors.ts` — new; frozen golden vectors (fixed key/IV/plaintext/password/salt/bytes + expected packed/hash/base64url outputs)
- `packages/shared/package.json` — new workspace package `@gemba/shared`
- `packages/shared/src/index.ts` — new; `MAX_DOWNLOADS`, `MAX_EXPIRY_MS`, `MAX_BLOB_BYTES`, `validateClientMeta`, `ClientMeta`
- `apps/web/src/golden-vectors.test.ts` — new; the web half of the CRYPTO-03 interop gate
- `apps/web/next.config.ts` — added `transpilePackages` + `turbopack.resolveExtensions`; headers/CSP block unchanged
- `apps/web/vitest.config.ts` — added `resolve.extensions` mirroring the Turbopack order
- `apps/web/src/app/api/files/route.ts` — imports `sha256Hex`/`randomSaltBase64` from `@gemba/crypto`, `MAX_BLOB_BYTES`/`validateClientMeta` from `@gemba/shared`; local `MAX_DOWNLOADS`/`MAX_EXPIRY_MS`/`validateClientMeta` definitions removed
- `apps/web/src/app/api/files/[id]/route.ts` — `sha256Hex` from `@gemba/crypto`
- `apps/web/src/app/upload/page.tsx` — `encryptPacked`/`exportKeyBase64`/`generateKey`/`randomSaltBase64`/`sha256Hex` from `@gemba/crypto`
- `apps/web/src/app/download/page.tsx` — `decryptPacked`/`importKeyBase64` from `@gemba/crypto`
- `apps/web/src/lib/crypto.test.ts` — re-pointed to `@gemba/crypto`
- `apps/web/src/lib/storage.test.ts` — re-pointed `MAX_*`/`validateClientMeta` import to `@gemba/shared` (was `@/app/api/files/route`)
- `apps/web/src/lib/crypto.ts` — **deleted** (logic now lives only in `@gemba/crypto`)
- `package-lock.json` — regenerated to link both new workspace packages

## Decisions Made

- **Three-file split inside `@gemba/crypto`** (`encoding.ts` / `crypto.ts` / `crypto.web.ts`) instead of authoring everything directly in `index.ts` as the plan's action-text prose literally described. Reason: `index.ts` re-exports the platform primitive from `./crypto`, and `crypto.web.ts` needs the shared constants/Base64URL helpers — putting all of that directly in `index.ts` would create a circular import (`index.ts` → `./crypto` → `index.ts`). `encoding.ts` breaks the cycle; `crypto.ts` exists so plain `tsc`/Node resolution (which knows nothing about Turbopack's `resolveExtensions` or Metro's platform-extension convention) can still resolve `./crypto` successfully before/without bundler-level config — this is what let `npm run build --workspace=apps/web`'s TypeScript pass. This preserves every acceptance criterion (index.ts is still the single public-API entry point; the packing/salt logic exists exactly once) while being robust to how each tool actually resolves modules.
- **Deleted `apps/web/src/lib/crypto.ts`** rather than converting it into a re-export shim (the plan explicitly offered either option, "whichever is the smaller diff"). Chose deletion because the plan's own acceptance criterion states no source should import crypto from `@/lib/crypto` anymore — a shim satisfying that criterion in letter but still existing unused would leave dead/duplicate code, contradicting the surgical-changes and reuse-first rules.
- **Added a `@gemba/crypto/vectors` subpath export** rather than importing `vectors.ts` via a relative path or re-exporting it from the main barrel — matches the plan's explicit "import vectors.ts and @gemba/crypto" framing (two distinct imports) as a real workspace-package subpath rather than a raw `../../` path traversal into another package's `src/`.
- **camelCase vector constant names** (`expectedPackedBase64`, `expectedSha256Hex`, `expectedBase64Url`, `fixedKeyBase64Url`, etc.) — an initial UPPER_SNAKE_CASE draft was renamed to match the plan's `must_haves.artifacts` literal `contains: "expectedPackedBase64"` check and the interface_contracts' own naming.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `transpilePackages` to `next.config.ts`**
- **Found during:** Task 2 build verification
- **Issue:** `npm run build --workspace=apps/web` failed to compile because Turbopack does not transpile TypeScript source shipped by workspace packages (`@gemba/crypto`, `@gemba/shared`) by default — they're resolved via a workspace symlink into `node_modules`, and Next.js only transpiles the app's own files unless a package is explicitly opted in.
- **Fix:** Added `transpilePackages: ["@gemba/crypto", "@gemba/shared"]` to `apps/web/next.config.ts`, alongside the existing (unrelated) `turbopack.root`/`resolveExtensions` config.
- **Files modified:** `apps/web/next.config.ts`
- **Verification:** `npm run build --workspace=apps/web` compiles successfully.
- **Committed in:** `bcc0417`

**2. [Rule 1 - Bug] Fixed `Uint8Array<ArrayBuffer>` vs `Uint8Array<ArrayBufferLike>` type mismatches**
- **Found during:** Task 2 build verification
- **Issue:** After adding `transpilePackages`, Next's TypeScript build step failed inside `packages/crypto/src/crypto.web.ts`: bare `Uint8Array` parameter/return annotations widen to `Uint8Array<ArrayBufferLike>` in the current `lib.dom.d.ts`, which is not assignable to the `BufferSource`/`ArrayBufferView<ArrayBuffer>` types `crypto.subtle.importKey`/`encrypt`/`decrypt` expect.
- **Fix:** Made the `Uint8Array<ArrayBuffer>` generic explicit on `importKeyRaw`'s param, `exportKeyRaw`'s/`encryptRaw`'s/`getRandomBytes`'s return types, `encryptRaw`/`decryptRaw`'s `iv`/`ciphertext` params, `unpackPayload`'s return shape (`encoding.ts`), and `encryptPackedWithIv`'s `iv` param (`index.ts`) — matching the explicit-generic convention the original `apps/web/src/lib/crypto.ts` already used before this extraction.
- **Files modified:** `packages/crypto/src/crypto.web.ts`, `packages/crypto/src/encoding.ts`, `packages/crypto/src/index.ts`
- **Verification:** `npm run build --workspace=apps/web` compiles with zero type errors.
- **Committed in:** `bcc0417`

**3. [Rule 1 - Bug] Removed unused `MAX_DOWNLOADS`/`MAX_EXPIRY_MS` imports from `route.ts`**
- **Found during:** Task 2 lint verification
- **Issue:** After hoisting `validateClientMeta` (and its internal use of `MAX_DOWNLOADS`/`MAX_EXPIRY_MS`) into `@gemba/shared`, `route.ts` no longer used those two imports directly (only `MAX_BLOB_BYTES` is referenced directly in `route.ts`'s own code), producing two `@typescript-eslint/no-unused-vars` warnings.
- **Fix:** Removed the two unused imports; kept `MAX_BLOB_BYTES` and `validateClientMeta`.
- **Files modified:** `apps/web/src/app/api/files/route.ts`
- **Verification:** `npm run lint --workspace=apps/web` reports 0 errors, 0 new warnings (1 pre-existing unrelated warning in `icon-data.js` remains).
- **Committed in:** `bcc0417`

**Total deviations:** 3 auto-fixed (1 blocking-config, 2 bugs) — all surfaced by the plan's own required verification commands (`npm run build`, `npm run lint`) and fixed within the same task before its commit. No scope creep; no application/crypto logic changed beyond the type annotations needed for the build to type-check.

## Issues Encountered

None beyond the three auto-fixed items above. The `rtk` shell hook summarizes/truncates some command output (notably `console.log` inside a Vitest run) — worked around by invoking the resolved `vitest` binary directly (`/Users/lego/dev/gemba-filesend/node_modules/.bin/vitest run ... --reporter=verbose`) for the one-time golden-vector generation step.

## Next Phase Readiness

- `@gemba/crypto` and `@gemba/shared` exist as real, tested, building workspace packages — 05-03 (Expo scaffold) can add `apps/mobile` and depend on `@gemba/crypto` immediately.
- 05-04 (native crypto adapter) has an exact contract to implement against: `crypto.native.ts` must export the same public primitive surface as `crypto.web.ts` (`generateKey`, `importKeyRaw`, `exportKeyRaw`, `encryptRaw`, `decryptRaw`, `sha256Hex`, `getRandomBytes`), and must reproduce `packages/crypto/src/vectors.ts`'s frozen bytes exactly — no ambiguity remains about the auth-tag concat/split responsibility (D-02b) since the web adapter's "no manual tag handling" boundary is already proven correct by the passing cross-decrypt test.
- No blockers. The Vercel Root Directory change flagged by 05-01 remains outstanding for the next production deploy (unaffected by this plan).

---
*Phase: 05-monorepo-expo-scaffold-crypto-interop-walking-skeleton*
*Completed: 2026-07-12*

## Self-Check: PASSED

All created files verified present on disk (`packages/crypto/{package.json,src/index.ts,src/encoding.ts,src/crypto.ts,src/crypto.web.ts,src/vectors.ts}`, `packages/shared/{package.json,src/index.ts}`, `apps/web/src/golden-vectors.test.ts`); `apps/web/src/lib/crypto.ts` confirmed deleted; all three task commits (`541eb5a`, `bcc0417`, `f626991`) verified present in git history.
