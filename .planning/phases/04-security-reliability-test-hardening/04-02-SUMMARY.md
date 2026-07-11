---
phase: 04-security-reliability-test-hardening
plan: 02
subsystem: api-security
tags: [rate-limiting, upstash-redis, atomic-counter, sec-02, rel-01]

# Dependency graph
requires:
  - phase: 04-security-reliability-test-hardening
    provides: "04-01 hardened header baseline (no direct code dependency)"
provides:
  - "Shared Upstash Redis client (getRedisClient) backing both rate limiting and the atomic download counter (D-10)"
  - "Per-IP sliding-window rate limiters (upload/download/password) returning 429 + Retry-After (SEC-02)"
  - "Atomic Redis download counter on dl:{id} replacing the metadata read-modify-write race (REL-01)"
  - "Injectable-client counter primitives (seedDownloadCounter/decrementDownloadCounter) for hermetic concurrency testing in 04-03"
affects: [04-03]

# Tech tracking
tech-stack:
  added:
    - "@upstash/redis 1.38.0 — shared REST Redis client"
    - "@upstash/ratelimit 2.0.8 — sliding-window per-IP limiter"
  patterns:
    - "Env-gated Redis dispatcher (creds present → real Upstash; absent → in-memory dev shim), mirroring getStorageMode()"
    - "Rate limiters fail OPEN (availability); atomic counter fails CLOSED (503) — deliberate opposite policies"
    - "Redis is the live download-counter authority; metadata downloadsRemaining is display/expiry only (D-09)"

key-files:
  created:
    - src/lib/redis.ts
    - src/lib/rate-limit.ts
    - .env.example
  modified:
    - src/app/api/files/route.ts
    - "src/app/api/files/[id]/route.ts"
    - package.json
    - package-lock.json
    - .gitignore

key-decisions:
  - "D-10 honored: ONE shared getRedisClient() serves both the limiter and the counter — no second store"
  - "Counter fails CLOSED (503 on Redis outage) while limiters fail OPEN (allow) — the REL-01 invariant must never be broken by an outage (T-04-10)"
  - "Decremented value is NOT written back to metadata (D-09): Redis dl:{id} is the sole live authority"
  - "NX self-heal on DECR: set(key, limit, {nx:true, ex}) before decr so a TTL-evicted key can never under-count"
  - "Local-dev fallback: no Upstash creds → in-memory shim (counter) + allow-all (limiters), mirroring isAuthorized()"

requirements-completed: [SEC-02, REL-01]

# Metrics
duration: ~18min
completed: 2026-07-11
---

# Phase 4 Plan 2: Rate Limiting + Atomic Download Counter Summary

**Per-IP sliding-window rate limiting (upload/download/password → 429 + Retry-After) and a race-free atomic Redis download counter (`dl:{id}` DECR → 410 Gone) shipped over ONE shared Upstash store, replacing the metadata read-modify-write; code- and build-complete, with live-Upstash runtime verification deferred to deploy.**

## Performance

- **Duration:** ~18 min
- **Tasks:** 3 (1 blocking-human checkpoint + 2 code tasks)
- **Files created:** 3 · **modified:** 5

## Accomplishments

- **`src/lib/redis.ts`** — env-gated shared Upstash client (`getRedisClient`, singleton) mirroring `getStorageMode()`; when creds are unset it returns a documented single-instance in-memory shim so local dev works. Exports the counter primitives `seedDownloadCounter(id, limit, ttlSeconds, client?)` and `decrementDownloadCounter(id, limit, ttlSeconds, client?)` on the exact `dl:{id}` key, with a race-safe `{ nx: true, ex }` self-heal before the atomic `decr`. The optional injectable `client` last-arg makes REL-01 hermetically testable in Plan 04-03. Named exports only, no default.
- **`src/lib/rate-limit.ts`** — three sliding-window limiters (`checkUploadLimit`, `checkDownloadLimit`, `checkPasswordAttemptLimit`) built on `Ratelimit.slidingWindow(limit, "1 m")` over the shared client, each returning `Promise<Response | null>` (null = continue, `429` + `Retry-After` = short-circuit), matching the existing `checkPassword()` contract. Thresholds are env-tunable (`RATE_LIMIT_UPLOAD_PER_MIN`=10, `RATE_LIMIT_DOWNLOAD_PER_MIN`=30, `RATE_LIMIT_PASSWORD_PER_MIN`=5). Limiters **fail open** and are dev-disabled (allow-all) when creds are unset.
- **`src/app/api/files/route.ts`** — upload rate-limit guard at the top of `POST()` before the storage dispatch; `dl:{id}` seeded to the download limit (TTL aligned to file expiry) symmetrically in **both** the blob `onUploadCompleted` path and the fs direct-upload path (dual-mode parity).
- **`src/app/api/files/[id]/route.ts`** — download rate-limit guard in `GET()` and a password-attempt guard before each `checkPassword()`; the metadata read-modify-write (`meta.downloadsRemaining - 1` + write-back) in **both** download paths replaced with an atomic `decrementDownloadCounter` → `410 Gone` when the result goes negative. The counter **fails closed** (`503`) on Redis outage so the download-limit invariant is never violated. Orphaned `blobWriteMeta`/`fsWriteMeta` imports removed.
- **`.env.example`** — documents all new env vars (Upstash creds + thresholds) alongside the existing storage/cron vars; `.gitignore` given a `!.env.example` opt-in (the ignore comment already invited this).
- **Cron endpoint untouched** — `src/app/api/cleanup/route.ts` stays exempt from rate limiting (grep-confirmed), keeping its `CRON_SECRET` auth.

## Task Commits

1. **Dependencies** (`@upstash/ratelimit` + `@upstash/redis`, checkpoint-approved) — `2ec2bb4` (chore)
2. **Task 2: Redis client + rate-limit helper + upload guard (SEC-02)** — `db8e9ae` (feat)
3. **Task 3: atomic counter + download/password guards (REL-01, SEC-02)** — `b423cbd` (feat)
4. **`.env.example` env-var docs** — `5a3f611` (docs)

**Plan metadata:** (final commit) — `docs(04-02): complete rate-limiting + atomic-counter plan`

## Encryption Boundary

Untouched. No change to the AES key path — the decryption key remains in the URL fragment and never reaches the server. The counter and limiters operate only on file ids and IPs.

## Deviations from Plan

**None functional.** Two minor, in-scope adjustments:
- **[Rule 3 - Blocking] `.gitignore` `!.env.example` opt-in** — `.env.example` was blocked by the `.env*` ignore rule. The rule's own comment ("can opt-in for committing if needed") invited the negation; added it so the secret-free template is tracked, per the coordinator's instruction to document the env vars.
- **[Rule 1 - Orphan cleanup] Removed `blobWriteMeta`/`fsWriteMeta` imports** in the download route — my own change (dropping the counter write-back per D-09) orphaned them; removed to keep tsc/lint clean.

## Verification

- `npx tsc --noEmit` → **0 errors**.
- `npm run lint` → **0 errors** (4 pre-existing warnings in unrelated files: `last-ndc.ts`, `Radio.jsx`, `icon-data.js` — out of scope).
- `npm run build` → **success**, all 9 routes compile (a pre-existing multi-lockfile workspace-root warning is unrelated to this plan).
- Source assertions all pass: `dl:{id}` key + `{ nx: true` self-heal in redis.ts; three `slidingWindow` limiters with `429` + `Retry-After`; `seedDownloadCounter` in both upload paths; `decrementDownloadCounter` in the download route with the RMW string `meta.downloadsRemaining - 1` **gone** and no counter write-back to metadata; `503` fail-closed + `410` exhausted present; no limiter import in `cleanup/route.ts`.

## Deferred — Human Action (live Upstash verification at deploy)

Live Upstash credentials are **not** provisioned in this environment (intentionally deferred by explicit user decision — "execute now anyway"). All code-level and build-level acceptance criteria are satisfied now. The following runtime criteria require a live store and must be verified at deploy time:

> **Set `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`** (Upstash Console → Redis DB → REST API; free tier suffices) **and verify:** (1) the (limit+1)-th upload/download from one IP within a minute returns `429` + `Retry-After`; (2) password guesses past `RATE_LIMIT_PASSWORD_PER_MIN` return `429`; (3) the (N+1)-th download of a limit-N file returns `410 Gone`; (4) N concurrent downloads yield exactly N successes. Also set the optional `RATE_LIMIT_*` threshold vars if non-default limits are wanted.

Note: without the creds, local dev runs with rate limiting disabled (allow-all) and the counter on an in-memory single-instance shim — sufficient for functional dev, but concurrency correctness is proven by the hermetic in-memory fake in Plan 04-03, not by the dev shim.

## Next Phase Readiness

Plan 04-03 (tests) can inject the in-memory fake via the optional `client` arg on `seedDownloadCounter`/`decrementDownloadCounter` to fire N parallel DECRs and assert the limit is never exceeded — the direct regression test for the REL-01 fix. No blockers.

---
*Phase: 04-security-reliability-test-hardening*
*Completed: 2026-07-11*

## Self-Check: PASSED

- FOUND: src/lib/redis.ts
- FOUND: src/lib/rate-limit.ts
- FOUND: .env.example
- FOUND: commit 2ec2bb4 (deps), db8e9ae (Task 2), b423cbd (Task 3), 5a3f611 (.env.example)
