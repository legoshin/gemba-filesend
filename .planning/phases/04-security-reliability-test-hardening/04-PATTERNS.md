# Phase 4: Security, Reliability & Test Hardening - Pattern Map

**Mapped:** 2026-07-11
**Files analyzed:** 8 (3 new lib files, 1 new config, 2 new test files, 3 modified)
**Analogs found:** 8 / 8 (all files have at least a role-match analog; no true "no analog" cases — this phase introduces net-new infra with the closest existing shape noted per file)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/redis.ts` (NEW) | config/client-singleton | request-response | `src/lib/storage.ts` (`getStorageMode()` env dispatcher) | role-match |
| `src/lib/rate-limit.ts` (NEW) | middleware/utility | request-response | `src/app/api/cleanup/route.ts` `isAuthorized()` (env-gated guard helper) | role-match |
| `next.config.ts` (MODIFIED) | config | request-response | N/A — currently empty; Next.js `headers()` API is the pattern | no existing analog (see below) |
| `src/app/api/files/route.ts` (MODIFIED) | route/controller | request-response + file-I/O | itself (existing dual-mode POST handler) | exact (in-place modification) |
| `src/app/api/files/[id]/route.ts` (MODIFIED) | route/controller | request-response + streaming | itself (existing dual-mode GET handler) | exact (in-place modification) |
| `vitest.config.ts` (NEW) | config | N/A | `next.config.ts`, `postcss.config.mjs` (root-level config file conventions) | role-match |
| `src/lib/crypto.test.ts` (NEW) | test | transform | `src/lib/crypto.ts` (module under test, pure leaf functions) | exact (co-located test) |
| `src/lib/storage.test.ts` (NEW) | test | CRUD/transform | `src/lib/storage.ts` + `validateClientMeta()` in `src/app/api/files/route.ts` | exact (co-located test) |

## Pattern Assignments

### `src/lib/redis.ts` (config/client-singleton, request-response)

**Analog:** `src/lib/storage.ts` (env-based dispatcher pattern) + `src/app/api/cleanup/route.ts` (env var presence check)

**Env dispatcher pattern** — `src/lib/storage.ts` lines 1-8:
```typescript
// Storage-mode dispatcher: Vercel Blob in production (when token is set),
// local filesystem for development.

export type StorageMode = "blob" | "fs";

export function getStorageMode(): StorageMode {
  return process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "fs";
}
```
Apply the same shape to Redis: a single exported client getter, gated on env var presence, with a documented fallback for local dev (per CONTEXT.md D-14 discretion — single-instance fallback acceptable when `UPSTASH_REDIS_REST_URL`/`TOKEN` are unset, since concurrency correctness is verified via the hermetic fake in tests, not local dev).

**Env var presence check** — `src/app/api/cleanup/route.ts` lines 105-113:
```typescript
function isAuthorized(req: NextRequest): boolean {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>. The secret is
  // provisioned automatically when a cron is configured. In local dev (no
  // CRON_SECRET set), allow manual triggering so the route is testable.
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
```
Mirror this "env var absent → permissive dev fallback, documented inline" convention for the Redis client and rate-limit thresholds (env-tunable per D-02).

**No named exports beyond what's needed** — module exports a single client instance getter (leaf module, same style as `blob-storage.ts`/`server-storage.ts`: no default export, all named).

---

### `src/lib/rate-limit.ts` (middleware/utility, request-response)

**Analog:** `src/app/api/cleanup/route.ts` `isAuthorized()` guard pattern (above) + the storage layer's "pure function returning a decision" shape.

**Core pattern to follow:** a small set of named async functions (e.g. `checkUploadLimit(ip)`, `checkDownloadLimit(ip)`, `checkPasswordAttemptLimit(fileId, ip)`) each returning a structured result the caller can branch on — mirroring how `checkPassword()` in `src/app/api/files/[id]/route.ts` (lines 24-35) returns `Response | null` for the caller to short-circuit on:
```typescript
async function checkPassword(
  meta: StoredMeta,
  provided: string | null,
): Promise<Response | null> {
  if (!meta.passwordHash) return null;
  if (!provided) return new Response("password required", { status: 401 });
  const candidate = await sha256Hex(provided + (meta.salt ?? ""));
  if (candidate !== meta.passwordHash) {
    return new Response("invalid password", { status: 403 });
  }
  return null;
}
```
Rate-limit helper should follow the identical "return null to continue, return a Response to short-circuit" contract, so call sites in both API routes stay a one-line `if (limited) return limited;` guard — no new control-flow idiom introduced.

**429 + Retry-After response** — no existing analog in this codebase (first non-2xx/4xx-from-validation rejection with a custom header); follow the existing structured-response conventions used elsewhere in the same file (plain `Response`/`NextResponse.json` with explicit status codes — see Shared Patterns below) and add the `Retry-After` header per D-02.

---

### `next.config.ts` (config, request-response) — SEC-01

**Current state** (full file, 8 lines):
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```
No existing analog for `headers()` in this repo — this is genuinely net-new. Constraints to honor from CONTEXT.md:
- D-05 (MUST): CSP `style-src` must allowlist `fonts.googleapis.com`; `font-src` must allowlist `fonts.gstatic.com` (carried forward from Phase 3 T-03-07 — breaking this breaks the Public Sans production font).
- D-05: `img-src`/`connect-src` must allowlist `*.blob.vercel-storage.com` (Vercel Blob CDN, used for downloads — see `presignedUrl` in `src/app/api/files/[id]/route.ts` lines 79-86).
- D-06: HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `frame-ancestors 'none'`.
- D-04/D-07: pragmatic enforced CSP, not nonce-based/Report-Only.
- Must not break `/sw.js` registration (service worker at `public/sw.js`, referenced in `src/app/layout.tsx:61-68`) or the Android TWA custom-tab flow (frame-ancestors/X-Frame-Options are TWA-safe per CONTEXT.md Specifics).

---

### `src/app/api/files/route.ts` (route/controller, request-response + file-I/O) — SEC-02 + REL-01 seed

**Existing imports block** — lines 1-10:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import {
  generateId,
  writeBlobFromWebStream,
  writeMeta as fsWriteMeta,
} from "@/lib/server-storage";
import { writeMeta as blobWriteMeta, blobPathnamePrefix } from "@/lib/blob-storage";
import { getStorageMode, type StoredMeta } from "@/lib/storage";
import { sha256Hex, randomSaltBase64 } from "@/lib/crypto";
```
New imports (`rateLimit`/`checkUploadLimit` from `@/lib/rate-limit`, Redis client from `@/lib/redis`) should be added in the same grouped style (project-lib imports last, grouped by concern).

**Validation type-guard pattern** — `validateClientMeta()` lines 39-65 — this is the canonical "type guard over untrusted client payload" pattern in the codebase. Any new validation (e.g. on rate-limit config or Redis key params) should follow this same generic type-predicate shape, not manual `if` chains scattered elsewhere.

**Error handling pattern** — lines 134-137 (blob path) and lines 171-177 (direct path):
```typescript
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : "unknown";
  return NextResponse.json({ error: message }, { status: 400 });
}
```
Reuse this exact `unknown` → `instanceof Error` narrowing + `{ error: message }` JSON envelope for any new Redis-related error paths (e.g. Redis unreachable).

**Where the REL-01 Redis counter seed goes:** both `onUploadCompleted` (blob path, line 114-130) and the direct-upload handler (line 158-192, after `fsWriteMeta` call) — seed `dl:{id}` to `downloadsRemaining` right after the existing `writeMeta`/`fsWriteMeta` call, so both storage modes stay symmetric (matches the existing dual-mode-parity convention already used throughout this file and `storage.ts`).

**Where SEC-02 upload rate-limit goes:** top of `POST()` (line 194), before dispatching to `handleBlobUpload`/`handleDirectUpload` — single guard clause, consistent with how `getStorageMode()` dispatch already reads as the first decision in `POST()`.

---

### `src/app/api/files/[id]/route.ts` (route/controller, request-response + streaming) — SEC-02 + REL-01 fix

**The exact read-modify-write counter being replaced** — blob path lines 55-60:
```typescript
// Decrement first so concurrent requests see the lower count. The blob
// itself is left alone — actual cleanup happens on the next request that
// observes downloadsRemaining <= 0 (above), which means the just-issued
// presigned URL stays valid for its TTL window.
const remaining = meta.downloadsRemaining - 1;
await blobWriteMeta({ ...meta, downloadsRemaining: remaining });
```
fs path lines 109-110 (same shape):
```typescript
const remaining = meta.downloadsRemaining - 1;
await fsWriteMeta({ ...meta, downloadsRemaining: remaining });
```
**REL-01 fix:** replace both blocks with an atomic `DECR` on `dl:{id}` (Redis), rejecting with `410 Gone` if the result goes negative — matching the existing `410` convention already used for `expired`/`exhausted` two lines above (lines 43-50, 95-102):
```typescript
if (meta.expiresAt < Date.now()) {
  await blobDeleteEntry(meta);
  return new Response("expired", { status: 410 });
}
if (meta.downloadsRemaining <= 0) {
  await blobDeleteEntry(meta);
  return new Response("exhausted", { status: 410 });
}
```
Per D-09, the Blob/fs metadata `downloadsRemaining` stays for display/expiry only — Redis `dl:{id}` becomes the sole authority for the decrement-and-reject decision. The `meta.downloadsRemaining <= 0` checks above should stay (initial/display-time short-circuit) but the authoritative post-decrement gate moves to the atomic Redis result.

**checkPassword() pattern** (lines 24-35, shown in full above under rate-limit) — this is also the exact place SEC-02 password-attempt rate limiting composes: call `checkPasswordAttemptLimit(id, ip)` immediately before or wrapping `checkPassword()`, returning the same `Response | null` contract so the call site (`const pwFail = await checkPassword(...)`) pattern is unchanged, just given an extra guard clause above it.

**Where SEC-02 download rate-limit goes:** top of `GET()` (lines 130-137), same dispatch-guard placement as the upload route.

---

### `vitest.config.ts` (NEW, config)

No existing test config in repo (D-11: Vitest is the project's first test runner). Follow root-config conventions already established by `next.config.ts` / `postcss.config.mjs` — minimal, single default export, ESM. Add `"test": "vitest"` (or `"test": "vitest run"`) to `package.json` `scripts` alongside existing `dev`/`build`/`lint` entries (package.json lines 5-10). Register `vitest` + `@vitest/coverage-v8` (or similar) as new devDependencies, same list style as existing devDependencies block.

### `src/lib/crypto.test.ts` (NEW, test)

**Analog:** `src/lib/crypto.ts` itself — pure leaf-module functions, no mocking needed (D-12: use Node's built-in `globalThis.crypto.subtle`, no polyfill). Test targets per TEST-01/02:
- `encryptPacked`/`decryptPacked` round-trip (lines 32-59) — assert packed format is `[12-byte IV][ciphertext+tag]` and decrypt inverts encrypt.
- `sha256Hex`/`randomSaltBase64` (lines 61-71) — password hash/validate round-trip (hash(password+salt) matches on correct password, mismatches on wrong password) — mirrors the exact composition used in `checkPassword()` in `src/app/api/files/[id]/route.ts` (lines 24-35), which is the "spec" for correct usage.
- Co-locate as `crypto.test.ts` next to `crypto.ts` (same directory), following the "each module exports a cohesive set of related functions" / one-file-per-concern convention already used throughout `src/lib/`.

### `src/lib/storage.test.ts` (NEW, test)

**Analog:** `validateClientMeta()` in `src/app/api/files/route.ts` (lines 39-65) — this is the TEST-04 target for metadata validation. Test cases should exercise every branch of the type-guard (missing fields, out-of-range `size`/`downloadsRemaining`/`expiresAt`, boundary values at `MAX_DOWNLOADS`/`MAX_BLOB_BYTES`/`MAX_EXPIRY_MS`) — same style as how the guard itself enumerates each field. Also cover `StoredMeta` shape from `src/lib/storage.ts` (lines 10-23) for serialization round-trip (JSON.stringify/parse preserves all fields, matching `writeMeta`/`readMeta` behavior in both `blob-storage.ts` and `server-storage.ts`).

**Counter/concurrency test (TEST-03)** lives here or in a sibling `rate-limit.test.ts`/`redis.test.ts` — per D-13, use an in-memory Redis fake (no live Upstash), fire N parallel DECRs against a seeded `dl:{id}` key, and assert the counter never goes negative and no more than the seeded limit's worth of decrements succeed. This is the direct regression test for the REL-01 fix replacing the read-modify-write blocks identified above.

---

## Shared Patterns

### Error narrowing (`unknown` → `instanceof Error`)
**Source:** `src/app/api/files/route.ts` lines 134-137, 171-177
**Apply to:** all new/modified route handlers and the Redis client wrapper — any new catch block around Redis calls should use this exact narrowing, never a bare `any`.
```typescript
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : "unknown";
  return NextResponse.json({ error: message }, { status: 400 });
}
```

### Structured status-code responses
**Source:** `src/app/api/files/[id]/route.ts` lines 42-53, 94-101 (410 Gone for expired/exhausted), lines 28-34 (401/403 for password)
**Apply to:** rate-limit rejections (429 + Retry-After header) and the atomic-counter rejection (410 Gone) — same plain `Response`/`NextResponse.json` construction with explicit HTTP status, no wrapper library.

### Env-gated dispatch with dev fallback
**Source:** `src/lib/storage.ts` lines 1-8, `src/app/api/cleanup/route.ts` lines 105-113
**Apply to:** `src/lib/redis.ts` (Upstash creds present → real client; absent → documented single-instance dev fallback) and `src/lib/rate-limit.ts` (thresholds read from env with sane defaults, per D-02's "env-tunable config").

### Dual-mode parity (blob vs fs)
**Source:** every existing route file (`route.ts`, `[id]/route.ts`, `cleanup/route.ts`) dispatches on `getStorageMode()` and implements the same operation twice, once per backend.
**Apply to:** the REL-01 Redis counter seed/decrement must be added symmetrically to both the blob path and the fs path in both modified route files — never only one.

### Named exports only, no default export
**Source:** `src/lib/crypto.ts`, `src/lib/storage.ts`, `src/lib/blob-storage.ts`, `src/lib/server-storage.ts` — all leaf modules export a cohesive set of related named functions.
**Apply to:** `src/lib/redis.ts` and `src/lib/rate-limit.ts` should follow the same convention (e.g. `export function getRedisClient()`, `export async function checkUploadLimit(...)` — no default export).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `next.config.ts` `headers()` block | config | request-response | `next.config.ts` is currently an empty stub; no prior security-header config exists anywhere in the repo. Use Next.js 16 `headers()` API directly per official docs, respecting the CSP allowlist constraints from D-05/D-06 (font domains + Blob CDN + frame-ancestors). |
| Rate-limit 429/Retry-After shape | utility | request-response | First use of a custom `Retry-After` header in this codebase; no prior analog for header-bearing error responses (existing 401/403/410 responses carry no custom headers). Follow `@upstash/ratelimit`'s own recommended response shape (per D-01) rather than inventing one. |

## Metadata

**Analog search scope:** `src/lib/`, `src/app/api/`, `next.config.ts`, `postcss.config.mjs`, `package.json`
**Files scanned:** `next.config.ts`, `src/lib/blob-storage.ts`, `src/lib/server-storage.ts`, `src/lib/storage.ts`, `src/lib/crypto.ts`, `src/app/api/files/route.ts`, `src/app/api/files/[id]/route.ts`, `src/app/api/cleanup/route.ts`, `package.json`
**Pattern extraction date:** 2026-07-11
