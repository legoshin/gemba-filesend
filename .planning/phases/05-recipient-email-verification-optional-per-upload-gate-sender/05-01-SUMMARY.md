---
phase: 05-recipient-email-verification-optional-per-upload-gate-sender
plan: 01
subsystem: server-verification-spine
tags: [redis, verification, download-gate, tracer]
dependency-graph:
  requires: []
  provides:
    - src/lib/verification.ts (generateSixDigitCode, storeVerificationCode, verifyCode, issueVerifyToken, isVerifyTokenValid)
    - StoredMeta.recipientEmails
    - checkVerification() gate in GET /api/files/[id]
    - meta.verifyRequired
  affects:
    - "05-02 (request-code/verify-code endpoints will call storeVerificationCode/verifyCode/issueVerifyToken)"
    - "05-03 (upload/download UI will read/write recipientEmails and verifyRequired, send x-verify-token)"
tech-stack:
  added: []
  patterns:
    - "Hermetic RedisLike injection (redis?: RedisLike = getRedisClient()) for unit-testable Redis-backed domain logic, mirroring decrementDownloadCounter"
    - "Absolute expiresAt inside a JSON payload as the authoritative expiry, with Redis TTL as a GC backstop only"
key-files:
  created:
    - src/lib/verification.ts
    - src/lib/verification.test.ts
  modified:
    - src/lib/storage.ts
    - src/lib/redis.ts
    - src/app/api/files/[id]/route.ts
    - src/app/api/files/[id]/meta/route.ts
decisions:
  - "D-05-10 honored: verification domain lives in a new src/lib/verification.ts, composing getRedisClient(), keeping redis.ts a pure shared-client + counter module"
  - "Redis dev-shim widened to store values as-is (not stringified) to mirror @upstash/redis's automatic JSON de/serialization for object payloads (the code's {codeHash,attempts,expiresAt} JSON)"
  - "checkVerification() lives in route.ts (not verification.ts), exported alongside checkPassword() for hermetic unit testing without HTTP, per plan Task 2"
metrics:
  duration: "~35 min"
  completed: 2026-09-08
actuals:
  tokens: 5172
  tasks: 2
  commits: 2
status: complete
---

# Phase 5 Plan 01: Server verification spine + download gate Summary

Built the server-side verification domain (6-digit code lifecycle + reusable verify-token) and wired an authorization gate into the single ciphertext-access route (`GET /api/files/[id]`) in both blob and fs storage modes, positioned before the download counter so a failed/missing verification never consumes a download.

## What Was Built

**Task 1 — Verification domain + widened Redis + recipientEmails metadata (tracer):**
- `src/lib/storage.ts`: added `StoredMeta.recipientEmails?: string[]` — presence + non-empty length IS the verification-required flag (D-05-11), no separate boolean.
- `src/lib/redis.ts`: widened `RedisLike` from `Pick<Redis, "set" | "decr">` to also include `"get" | "del"`; extended the in-memory dev shim to implement both, storing values as-is (object payloads round-trip unchanged) to mirror `@upstash/redis`'s automatic JSON de/serialization.
- `src/lib/verification.ts` (new): `generateSixDigitCode()` (crypto.getRandomValues % 1e6, zero-padded), `storeVerificationCode()`/`verifyCode()` (sha256Hex-hashed code, absolute `expiresAt` inside the payload enforced in app code, 5-attempt lockout, Redis TTL as GC backstop only), `issueVerifyToken()`/`isVerifyTokenValid()` (24-byte CSPRNG token via `toBase64Url`, 30-min reusable TTL, bound to a single file id). All functions accept a trailing optional `redis: RedisLike` for hermetic testing.
- `src/lib/verification.test.ts` (new): 6 tests covering code round-trip/consumption, wrong-code + lockout, absolute-expiry independent of Redis TTL, token issue/validate id-binding, and fail-closed Redis-error propagation.

**Task 2 — Gate insertion + meta field:**
- `src/app/api/files/[id]/route.ts`: added exported `checkVerification(id, meta, token, redis?)` next to `checkPassword()`. Returns `null` when ungated, 401 with no token, 503 on a Redis error (fail closed), 403 for an invalid/wrong-file token, `null` when valid. Called in both `handleBlobDownload` and `handleFsDownload`, immediately before `checkPassword()` and therefore before `decrementDownloadCounter()`.
- `src/app/api/files/[id]/meta/route.ts`: added `verifyRequired: Boolean(meta.recipientEmails?.length)` to the response; emails are never serialized to any client.
- Extended `verification.test.ts` with 6 `checkVerification` cases (ungated, no-token 401, wrong-token 403, cross-file-token 403, valid-token allow, Redis-error 503).

## Deviations from Plan

None — plan executed exactly as written, including the "del" widening choice explicitly called out in the task action (preferred over a poison-value `set`).

## Verification

- `npm run test` — 45/45 tests pass (4 test files), including all `verification.test.ts` cases.
- `npm run build` — Next.js production build succeeds; all routes (including `/api/files/[id]`, `/api/files/[id]/meta`) compile and typecheck clean.
- Manual read-through confirms `checkVerification` precedes `checkPassword`/`decrementDownloadCounter` in both `handleBlobDownload` and `handleFsDownload`.

## Threat Flags

None — all new surface (the `x-verify-token` header check, the widened Redis surface, `recipientEmails` metadata) was already anticipated and dispositioned in the plan's `<threat_model>` (T-05-03 through T-05-08); no new surface introduced outside that register.

## Self-Check: PASSED

- FOUND: src/lib/verification.ts
- FOUND: src/lib/verification.test.ts
- FOUND: src/lib/storage.ts (recipientEmails field present)
- FOUND: src/lib/redis.ts (get/del on RedisLike + dev shim)
- FOUND: src/app/api/files/[id]/route.ts (checkVerification exported, called in both handlers)
- FOUND: src/app/api/files/[id]/meta/route.ts (verifyRequired field)
- FOUND commit 8f43a26 (Task 1)
- FOUND commit 9c6e311 (Task 2)
