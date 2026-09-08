# Phase 5: Monorepo, Expo Scaffold & Crypto-Interop Walking Skeleton - Pattern Map

**Mapped:** 2026-07-12
**Files analyzed:** 20 (creates + moves + modifies)
**Analogs found:** 9 exact/role-match / 20 total (11 net-new, no in-repo analog — Expo scaffold)

## Correction to CONTEXT.md canonical refs

**CONTEXT.md/RESEARCH.md both state the metadata contract (`ClientMeta`, `validateClientMeta`, `MAX_*`) lives in `src/lib/storage.ts`. It does not.** Verified by reading both files:

- `src/lib/storage.ts` only exports `StorageMode`, `getStorageMode()`, and the `StoredMeta` interface (server-side storage record shape, includes `blobUrl` — blob-mode-only, not client-facing).
- `validateClientMeta`, `MAX_DOWNLOADS`, `MAX_EXPIRY_MS`, `MAX_BLOB_BYTES`, and the `ClientPayload`/`UploadMetaPayload` interfaces actually live in **`src/app/api/files/route.ts`** (lines 18-68).

**Planner action needed:** the hoist-to-shared-package task (D-03) must extract from `src/app/api/files/route.ts`, not `src/lib/storage.ts`. `StoredMeta`/`getStorageMode` in `storage.ts` are server-storage internals (they know about `blobUrl`) and should likely stay in `apps/web` rather than move to the shared package — only the client-validatable subset (`validateClientMeta` + `MAX_*` + a `ClientMeta` type matching `ClientPayload`'s shape minus `password`/`id`) belongs in the shared package.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `packages/crypto/src/index.ts` | utility (shared core) | transform | `src/lib/crypto.ts` (pure-TS parts: constants, Base64URL, packing) | exact |
| `packages/crypto/src/crypto.web.ts` | utility (platform adapter) | transform | `src/lib/crypto.ts` (crypto.subtle call sites) | exact |
| `packages/crypto/src/crypto.native.ts` | utility (platform adapter) | transform | `src/lib/crypto.ts` (same public API, ported to `react-native-quick-crypto`) | role-match (new primitive, same contract) |
| `packages/crypto/src/vectors.ts` (golden vectors fixture) | fixture/config | transform | `src/lib/__tests__/crypto.test.ts` (existing round-trip assertions, not byte-fixed vectors) | role-match |
| `packages/shared-meta/src/index.ts` (or folded into `packages/crypto`) | model/validation | CRUD (bounds-check) | `src/app/api/files/route.ts` lines 18-68 (`validateClientMeta`, `MAX_*`) — **NOT `storage.ts`, see correction above** | exact |
| `apps/web/src/lib/crypto.ts` (re-export shim, post-move) | utility | transform | itself, relocated; becomes a thin re-export of `packages/crypto` | exact (self-relocation) |
| `apps/web/src/app/api/files/route.ts` (modified) | route/controller | request-response | itself, relocated + re-pointed to import `validateClientMeta`/`MAX_*` from shared package | exact (self-relocation + import swap) |
| `apps/web/src/app/api/files/[id]/route.ts` (modified import) | route/controller | request-response | same file, only import path changes | exact (self-relocation) |
| `apps/web/src/app/api/files/[id]/meta/route.ts` (modified import) | route/controller | request-response | same file, only import path changes | exact (self-relocation) |
| `apps/web/src/app/upload/page.tsx` (modified import) | component | request-response | same file, only import path changes | exact (self-relocation) |
| `apps/web/src/app/download/page.tsx` (modified import) | component | request-response | same file, only import path changes | exact (self-relocation) |
| `apps/web/vitest.config.ts` / crypto test suite (extended) | test | transform | `src/lib/__tests__/crypto.test.ts` (existing 33-test suite, extend with golden vectors) | exact |
| `apps/web/next.config.ts` (modified: `turbopack.resolveExtensions`) | config | transform | itself, `next.config.ts` (existing `headers()` CSP config, additive) | exact (self-modify) |
| root `package.json` (workspaces) | config | — | itself (`ffsend-web` → rename + add `"workspaces"`) | exact (self-modify) |
| `apps/mobile/app.json` / `app.config.ts` | config | — | none in repo | **no analog** |
| `apps/mobile/app/*` (expo-router routes incl. harness screen) | route/component | request-response | none in repo (no RN/Expo code exists) | **no analog** |
| `apps/mobile/metro.config.js` | config | — | none in repo | **no analog** |
| `apps/mobile/package.json`, `index.js` (quick-crypto install) | config | — | none in repo | **no analog** |
| `apps/mobile/jest-expo` config + shared-core unit test | test | transform | `src/lib/__tests__/crypto.test.ts` (structure/assertions to mirror for the pure-TS subset only) | partial match (assertion style only, not runner) |
| Maestro flow (`.maestro/*.yaml`) | test (E2E) | event-driven | none in repo (Playwright not used here; no existing E2E flow files) | **no analog** |

## Pattern Assignments

### `packages/crypto/src/index.ts` (utility, transform)

**Analog:** `src/lib/crypto.ts` (full file, 87 lines — see below, lift verbatim except the two `crypto.subtle`-touching functions)

**What moves verbatim into the shared core** (`src/lib/crypto.ts` lines 4-5, 69-86):
```typescript
const AES_KEY_BITS = 128;
const IV_BYTES = 12;

export function randomSaltBase64(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(16)));
}

export function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const bin = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
```

**Note on `randomSaltBase64`/`toBase64Url`:** these call `crypto.getRandomValues`/`btoa`/`atob`, which are Web/Node globals, not RN globals. React Native does NOT have `btoa`/`atob` or `crypto.getRandomValues` built in — confirm during implementation whether these need to move into the platform adapters instead of the shared core (RESEARCH.md's Open Question #1 raises the analogous ambiguity for auth-tag packing; the same ambiguity applies here for base64/random). Recommend: `toBase64Url`/`fromBase64Url` should operate on bytes only (already do) so they're portable if `btoa`/`atob` are polyfilled or replaced with a manual byte→base64 loop; `randomSaltBase64` needs `crypto.getRandomValues`, which `react-native-quick-crypto`'s `install()` polyfill is expected to provide globally (per RESEARCH.md A5) — verify this during the native adapter task.

**Packed-format constants/layout** (`src/lib/crypto.ts` lines 31-46, 48-59) — the byte-layout logic (`[iv][ciphertext+tag]`) is shared-core-eligible per RESEARCH.md Open Question #1; keep the IV-generation + packing/slicing math here, delegate only the raw encrypt/decrypt primitive call to the adapter.

### `packages/crypto/src/crypto.web.ts` (utility, transform)

**Analog:** `src/lib/crypto.ts` lines 7-29, 32-58, 61-67 (the `crypto.subtle` call sites) — near-verbatim port, only the import path for shared constants/packing changes:
```typescript
export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: AES_KEY_BITS },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function encryptPacked(data: ArrayBuffer, key: CryptoKey): Promise<Uint8Array<ArrayBuffer>> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  const out = new Uint8Array(new ArrayBuffer(IV_BYTES + ciphertext.byteLength));
  out.set(iv, 0);
  out.set(new Uint8Array(ciphertext), IV_BYTES);
  return out;
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
```
Web Crypto appends the 16-byte GCM tag automatically — no concat/split needed on this side (confirmed in RESEARCH.md Critical Finding).

### `packages/crypto/src/crypto.native.ts` (utility, transform — NEW, no in-repo analog for the primitive, but MUST match `crypto.web.ts`'s public signatures exactly)

**Reference implementation from RESEARCH.md Code Examples (not an in-repo file — cite as the pattern to follow):**
```typescript
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "react-native-quick-crypto";

export async function encryptPacked(data: ArrayBuffer, key: CryptoKey /* adapt to native key type */): Promise<Uint8Array> {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-128-gcm", keyBuffer, iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(data)), cipher.final()]);
  const authTag = cipher.getAuthTag(); // 16 bytes, SEPARATE from ciphertext — must concat manually
  return Buffer.concat([iv, encrypted, authTag]);
}

export async function decryptPacked(packed: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
  const buf = Buffer.from(packed);
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(buf.length - 16);
  const ctOnly = buf.subarray(IV_BYTES, buf.length - 16);
  const decipher = createDecipheriv("aes-128-gcm", keyBuffer, iv);
  decipher.setAuthTag(tag); // MUST be called before update/final
  return Buffer.concat([decipher.update(ctOnly), decipher.final()]);
}

export async function sha256Hex(input: string): Promise<string> {
  return createHash("sha256").update(input, "utf8").digest("hex");
}
```
**This is the highest-risk file in the phase** (RESEARCH.md Critical Finding #1 / Pitfall #2) — the concat-on-encrypt/split-on-decrypt logic is mandatory and must produce byte-identical output to `crypto.web.ts` for the same key+IV+plaintext. No in-repo file to copy this from; `src/lib/crypto.ts` is the *target* contract, not a source pattern for this file's internals.

### `packages/shared-meta` or folded metadata module (model/validation, CRUD)

**Analog:** `src/app/api/files/route.ts` lines 18-68 (NOT `src/lib/storage.ts` — see correction above):
```typescript
export const MAX_DOWNLOADS = 100;
export const MAX_EXPIRY_MS = 365 * 24 * 3600_000;
export const MAX_BLOB_BYTES = 15 * 1024 ** 3; // 15 GiB

export function validateClientMeta<T extends {
  name?: unknown; type?: unknown; size?: unknown;
  downloadsRemaining?: unknown; expiresAt?: unknown;
}>(obj: T): obj is T & {
  name: string; type: string; size: number;
  downloadsRemaining: number; expiresAt: number;
} {
  return (
    typeof obj.name === "string" &&
    typeof obj.type === "string" &&
    typeof obj.size === "number" &&
    obj.size > 0 &&
    obj.size <= MAX_BLOB_BYTES &&
    typeof obj.downloadsRemaining === "number" &&
    obj.downloadsRemaining >= 1 &&
    obj.downloadsRemaining <= MAX_DOWNLOADS &&
    typeof obj.expiresAt === "number" &&
    obj.expiresAt > Date.now() &&
    obj.expiresAt <= Date.now() + MAX_EXPIRY_MS
  );
}
```
Extract this block + the `ClientPayload`/`UploadMetaPayload` interface shapes (lines 22-40) as the `ClientMeta` type. Framework-free already (no Next.js imports in the block itself) — hoists without logic change, matching D-03's stated ease. Leave `src/lib/storage.ts`'s `StoredMeta`/`getStorageMode`/`StorageMode` where they are (server-only, `blobUrl` field is not client-safe) unless planner decides otherwise.

### `apps/web/next.config.ts` (config, transform)

**Analog:** itself, `next.config.ts` (60 lines, read in full) — additive change only, append `turbopack` key alongside existing `headers()`:
```typescript
const nextConfig: NextConfig = {
  turbopack: {
    resolveExtensions: [".web.ts", ".web.tsx", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
  },
  async headers() { /* existing CSP config from Phase 4 — do not remove, lines 25-57 */ },
};
```
Preserve the existing CSP/HSTS/`X-Frame-Options` headers block verbatim (Phase 4 SEC-01 hardening) — this file's only change is the additive `turbopack` key.

### Existing Vitest crypto suite (test, transform)

**Analog:** `src/lib/__tests__/crypto.test.ts` (existing structure, extend — not replace):
```typescript
import { describe, expect, it } from "vitest";
import { decryptPacked, encryptPacked, generateKey, randomSaltBase64, sha256Hex } from "@/lib/crypto";

const IV_BYTES = 12;
const GCM_TAG_BYTES = 16;

describe("crypto: encryptPacked / decryptPacked round-trip (TEST-01)", () => {
  it("produces [12-byte IV][ciphertext+tag] with the correct total length", async () => {
    const key = await generateKey();
    const plaintext = bufferOf([1, 2, 3, 4, 5]);
    const packed = await encryptPacked(plaintext, key);
    expect(packed.byteLength).toBe(IV_BYTES + plaintext.byteLength + GCM_TAG_BYTES);
  });
  // ... more round-trip assertions
});
```
Follow this file's `describe`/`it.each` style and byte-length assertion pattern for the new golden-vector test (fixed key/IV/plaintext → exact expected bytes), added as a new `describe` block in the same file (or a sibling `golden-vectors.test.ts` in the same `__tests__` dir) after the move to `apps/web`. Import path changes from `@/lib/crypto` to the shared workspace package once extracted.

---

## Shared Patterns

### Named exports only, no default exports
**Source:** `src/lib/crypto.ts`, `src/lib/storage.ts` — every exported symbol in both files is a named export.
**Apply to:** `packages/crypto/src/*`, `packages/shared-meta/src/*` — the shared packages must follow the same convention (already explicitly noted in CONTEXT.md "Established Patterns").

### Explicit return types on exported functions
**Source:** `src/lib/crypto.ts` — every exported function has an explicit `Promise<T>` or concrete return type (e.g. `Promise<CryptoKey>`, `Uint8Array<ArrayBuffer>`).
**Apply to:** All new shared-package functions, both `crypto.web.ts` and `crypto.native.ts` (D-01 requires identical public signatures across both).

### Async-first public API even where native op is sync
**Source:** RESEARCH.md Code Examples (`sha256Hex` in `crypto.native.ts` wraps a sync `createHash` call to preserve the shared async interface) — mirrors the existing async convention already established by `crypto.web.ts`'s `crypto.subtle` calls.
**Apply to:** `crypto.native.ts` — every exported function must return a `Promise`, even when the underlying `react-native-quick-crypto` call is synchronous, to keep both platform adapters interchangeable behind one shared-core import.

### `@/*` path alias preserved post-move
**Source:** `tsconfig.json` (`@/*` → `./src/*`) — used throughout `src/app/**` and `src/lib/**`.
**Apply to:** `apps/web/tsconfig.json` after the move — alias stays scoped to `apps/web/src/*`; imports of the shared package become bare workspace-package imports (e.g. `@gemba/crypto`), never `@/`.

### CSP/security headers must survive the move untouched
**Source:** `next.config.ts` lines 9-22, 24-57 (Phase 4 SEC-01 hardening — CSP, HSTS, X-Frame-Options, Permissions-Policy).
**Apply to:** `apps/web/next.config.ts` — this is a hard constraint from CLAUDE.md ("Redesign and hardening must not weaken the client-side-encryption model") and Phase 4's own closed threat model; the monorepo move must not regress it.

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/mobile/app.json` / `app.config.ts` | config | — | No Expo/RN code exists in this repo prior to this phase; use RESEARCH.md "Recommended Project Structure" + `gemba.filesend` identifier (D-08) |
| `apps/mobile/app/*` (expo-router routes, harness screen) | route/component | request-response | No RN/Expo screens exist; use RESEARCH.md Pattern 1 (Metro platform resolution) + D-09 (expo-router scaffold now) |
| `apps/mobile/metro.config.js` | config | — | No Metro config exists; use RESEARCH.md Pattern 3 (`expo/metro-config` auto-detect, override only if needed) |
| `apps/mobile/package.json`, `index.js` | config | — | New package; use RESEARCH.md Standard Stack install commands |
| jest-expo config + shared-core-only native test | test | transform | No jest-expo config exists; mirror `src/lib/__tests__/crypto.test.ts` assertion style but scope to pure-TS packing logic only (RESEARCH.md Critical Finding: jest-expo cannot exercise the real native module) |
| Maestro flow (`.maestro/*.yaml`) | test (E2E) | event-driven | No E2E test tooling exists in this repo (no Playwright either); use RESEARCH.md "Recommended (revised) test architecture for CRYPTO-03" as the reference pattern, not an in-repo analog |
| `packages/crypto/src/crypto.native.ts` (the native primitive itself) | utility | transform | No RN/native-crypto code exists in this repo; `src/lib/crypto.ts` defines the *target contract* (byte layout, function signatures) but not the native implementation pattern — use RESEARCH.md Code Examples + Critical Finding (auth-tag concat/split) as the reference |

## Metadata

**Analog search scope:** `src/lib/` (crypto.ts, storage.ts, `__tests__/`), `src/app/api/files/` (route.ts, `[id]/route.ts`, `[id]/meta/route.ts`), `src/app/upload/`, `src/app/download/`, root `next.config.ts`, root `package.json`, `tsconfig.json`.
**Files scanned:** 10 read in full (small files, single-pass reads); 1 grep sweep across `src/app` for `validateClientMeta`/`MAX_*`/`ClientMeta` usage.
**Pattern extraction date:** 2026-07-12
