---
phase: 05-monorepo-expo-scaffold-crypto-interop-walking-skeleton
reviewed: 2026-07-12T12:40:00Z
depth: standard
files_reviewed: 33
files_reviewed_list:
  - packages/crypto/src/crypto.native.ts
  - packages/crypto/src/crypto.web.ts
  - packages/crypto/src/crypto.ts
  - packages/crypto/src/encoding.ts
  - packages/crypto/src/index.ts
  - packages/crypto/src/vectors.ts
  - packages/crypto/package.json
  - packages/shared/src/index.ts
  - packages/shared/package.json
  - apps/web/src/lib/crypto.test.ts
  - apps/web/src/lib/storage.test.ts
  - apps/web/src/golden-vectors.test.ts
  - apps/web/src/app/api/files/route.ts
  - apps/web/src/app/api/files/[id]/route.ts
  - apps/web/src/app/upload/page.tsx
  - apps/web/src/app/download/page.tsx
  - apps/web/next.config.ts
  - apps/web/vitest.config.ts
  - apps/web/package.json
  - apps/web/src/app/globals.css
  - apps/mobile/app/harness.tsx
  - apps/mobile/app/_layout.tsx
  - apps/mobile/app/index.tsx
  - apps/mobile/src/__tests__/core.test.ts
  - apps/mobile/.maestro/interop.yaml
  - apps/mobile/app.config.ts
  - apps/mobile/app.json
  - apps/mobile/metro.config.js
  - apps/mobile/babel.config.js
  - apps/mobile/jest.config.js
  - apps/mobile/eas.json
  - apps/mobile/index.js
  - apps/mobile/tsconfig.json
  - apps/mobile/package.json
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-07-12T12:40:00Z
**Depth:** standard
**Files Reviewed:** 33
**Status:** issues_found

## Summary

Reviewed the monorepo crypto-extraction + Expo walking-skeleton phase, with primary focus on the client-side-encryption invariant (the AES key must never reach the server) and web↔native byte parity.

**The core crypto is correct and was verified, not assumed:**

- **Native auth-tag handling (`crypto.native.ts`) is correct.** On encrypt, `cipher.getAuthTag()` is called after `final()` and concatenated as `[ciphertext][tag]`; on decrypt, the last 16 bytes are split off and `setAuthTag()` is called before `update()/final()` — matching Node's GCM contract and Web Crypto's auto-appended layout. Key is 16 bytes (`AES_KEY_BITS/8`), IV is 12 bytes, and all randomness routes through quick-crypto's `randomBytes` (CSPRNG), never `Math.random`.
- **Golden vectors are byte-exact and genuinely gating.** I re-ran the Web Crypto reference oracle against the frozen inputs: the packed output equals `expectedPackedBase64` exactly (71 bytes = 12 IV + 43 plaintext + 16 tag) and `sha256Hex` matches. The web test (`golden-vectors.test.ts`) and native harness (`harness.tsx`) assert exact bytes AND include the cross-decrypt direction (native decrypts web-produced bytes) — strong enough to catch an off-by-16 packing bug. No weak/round-trip-only assertions were found where byte-equality was needed.
- **Platform resolution is correctly pinned for web/Node.** `next.config.ts` and `vitest.config.ts` both prefer `.web.ts` and never list `.native.ts` in `resolveExtensions`, so `crypto.native.ts` (and its `react-native-quick-crypto` import) can never bleed into the web/Node bundle.
- **Key never leaves the client.** Upload generates the key client-side and embeds it only in the URL fragment (`#${keyB64}`); only `passwordHash`/`salt` are sent to the server. Download reads the key from `url.hash` and decrypts in-browser. The web import re-pointing (`@/lib/crypto` → `@gemba/crypto`) is behavior-preserving.
- No hardcoded secrets, no injection vectors, no `eval`/dangerous sinks introduced. Expo config (`app.json`) has the correct `react-native-quick-crypto` plugin and the `gemba.filesend` identifier consistent across iOS/Android and the Maestro `appId`.

The findings below are quality/robustness/test-reliability issues, not correctness breaks in the shipped crypto path.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: Mobile jest suite does not pin adapter resolution and its own comment misstates what it tests

**File:** `apps/mobile/jest.config.js:8-12`, `apps/mobile/src/__tests__/core.test.ts:20-28,39-61`
**Issue:** The suite's header comment claims it "unit-tests ONLY the shared pure-TS core (Base64URL codec, `[iv][ciphertext+tag]` packing layout)" and "MUST NOT import react-native-quick-crypto or crypto.native.ts". In reality, tests 2 and 3 call `importKeyBase64`, `encryptPackedWithIv`, and `decryptPacked`, which route through the platform-resolved `./crypto` adapter (`crypto.subtle`), i.e. real AES-GCM — not pure TS. More importantly, unlike `next.config.ts`/`vitest.config.ts` (which explicitly set `resolveExtensions` to prefer `.web.ts` so the native adapter can never resolve), `jest.config.js` sets no module resolution and relies entirely on the `jest-expo/node` preset's defaults landing on `crypto.ts`→`crypto.web`. If a future `jest-expo` default applies native-platform resolution, this suite would silently either (a) load `crypto.native.ts` and fail on the RN native module, or (b) test a different adapter than the maintainer believes. The resolution invariant that is enforced-and-documented for web/Node is left implicit here.
**Fix:** Either explicitly pin the resolver (mirror the `.web.ts` preference) in `jest.config.js`, e.g.:
```js
module.exports = {
  preset: "jest-expo/node",
  rootDir: __dirname,
  testMatch: ["<rootDir>/src/__tests__/**/*.test.ts"],
  moduleFileExtensions: ["web.ts", "web.tsx", "ts", "tsx", "js", "jsx", "json"],
};
```
and correct the comment to say it exercises the web/fallback adapter's AES-GCM (not "pure-TS core only").

### WR-02: `@gemba/crypto/vectors` subpath relies on package `exports` being honored by every consumer's bundler

**File:** `packages/crypto/package.json:7-13`, consumed by `apps/mobile/src/__tests__/core.test.ts:8-15`, `apps/mobile/app/harness.tsx:12-22`, `apps/web/src/golden-vectors.test.ts:10-20`
**Issue:** The subpath `@gemba/crypto/vectors` resolves to `./src/vectors.ts` only via the `"exports"` map. The package `"main"` points at `./src/index.ts`, so any consumer whose resolver does not honor `exports` (older Metro without package-exports enabled, or a jest/tsc config that ignores `exports`) would resolve `@gemba/crypto/vectors` to the nonexistent `packages/crypto/vectors` rather than `src/vectors.ts`, breaking both the mobile core test and the on-device harness. This is load-bearing for the interop gate but depends on an implicit tooling capability rather than being made robust.
**Fix:** Low-effort hardening: keep the `exports` map, but confirm Metro package-exports is enabled for this Expo SDK (or add `unstable_enablePackageExports` in `metro.config.js`), and add a CI assertion that `require.resolve("@gemba/crypto/vectors")` succeeds under each toolchain (vitest, jest-expo, Metro). Alternatively mirror `vectors.ts` availability via a stable path both with and without `exports` support.

## Info

### IN-01: `fromBase64Url` silently mis-decodes out-of-range/invalid characters instead of rejecting them

**File:** `packages/crypto/src/encoding.ts:46-69`
**Issue:** `lookup` is an `Int16Array(128)`. For any input char with `charCodeAt >= 128` (non-ASCII), `lookup[code]` is `undefined`, and the guard `if (value === -1) continue;` does not skip it — `buffer = (buffer << 6) | undefined` coerces `undefined` to `0`, so an invalid character is decoded as bit value `0` (equivalent to `A`) rather than being ignored or rejected. Inputs are app-generated Base64URL today (always ASCII), so this is not currently exploitable, but it violates the "never trust external data / fail fast" boundary rule for a decoder that also parses the URL-fragment key and server-supplied packed bytes.
**Fix:** Guard the index and reject/skip explicitly, e.g. `const code = cleaned.charCodeAt(i); const value = code < 128 ? lookup[code] : -1; if (value === -1) continue;` — or throw on invalid input if strict validation is preferred.

### IN-02: `decryptPacked` boundary is looser than a valid AES-GCM ciphertext

**File:** `packages/crypto/src/encoding.ts:89-100` (`unpackPayload`)
**Issue:** `unpackPayload` only rejects `packed.byteLength <= IV_BYTES` (≤12). A payload of 13–27 bytes passes unpacking but cannot be a valid GCM ciphertext (minimum is 12 IV + 16 tag = 28 bytes for empty plaintext). The web adapter then throws an opaque `OperationError` and the native adapter throws "ciphertext too short to contain an auth tag" — divergent error surfaces for the same malformed input. The download page separately guards `< 28` (`download/page.tsx:260`), so end users are covered, but the shared primitive's contract is inconsistent across platforms.
**Fix:** Optionally tighten `unpackPayload` to require `packed.byteLength >= IV_BYTES + GCM_TAG_BYTES` and throw a single shared message, so web and native fail identically on short payloads.

### IN-03: Non-constant-time password-hash comparison (pre-existing, carried through the import re-point)

**File:** `apps/web/src/app/api/files/[id]/route.ts:35-38`
**Issue:** `checkPassword` compares `candidate !== meta.passwordHash` with a plain `!==`, which is not constant-time. Because the compared values are salted SHA-256 hex digests (not the password itself, and the salt is random per file), the practical timing-attack risk is low. This is pre-existing behavior preserved by the extraction, not introduced this phase — noted for completeness since the file was in scope.
**Fix:** If hardened later, use a constant-time comparison (`crypto.timingSafeEqual` over equal-length buffers).

### IN-04: Native adapter's local `CryptoKey` type is structurally different from the DOM `CryptoKey` used in `index.ts` signatures

**File:** `packages/crypto/src/crypto.native.ts:40-42`, `packages/crypto/src/index.ts:36-42`
**Issue:** `index.ts` types `exportKeyBase64(key: CryptoKey)` / `importKeyBase64(): Promise<CryptoKey>` against the ambient global (DOM) `CryptoKey`, while the native adapter's runtime key is `{ raw: Uint8Array }` (a module-local `interface CryptoKey`). This works only because keys flow through opaquely and types are erased at the Metro/native boundary (plain `tsc` resolves `crypto.ts`→`crypto.web`, so type-checking sees the DOM type). It is sound today but brittle: a change that makes `index.ts` import the adapter's key type, or a native tsconfig without the DOM lib, could surface a type mismatch. Worth a short comment documenting the intentional erasure reliance.
**Fix:** Add a note in `index.ts` that `CryptoKey` is the platform-resolved adapter's key type at runtime, or introduce a shared `type PlatformCryptoKey` re-exported from `./crypto` and use it in the barrel signatures.

---

_Reviewed: 2026-07-12T12:40:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
