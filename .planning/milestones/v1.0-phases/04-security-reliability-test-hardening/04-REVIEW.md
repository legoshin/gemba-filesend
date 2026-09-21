---
phase: 04-security-reliability-test-hardening
reviewed: 2026-07-11T21:16:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - next.config.ts
  - src/lib/redis.ts
  - src/lib/rate-limit.ts
  - src/app/api/files/route.ts
  - src/app/api/files/[id]/route.ts
  - src/lib/crypto.test.ts
  - src/lib/storage.test.ts
  - vitest.config.ts
  - .env.example
  - package.json
  - .gitignore
findings:
  critical: 3
  warning: 5
  info: 2
  total: 10
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-07-11T21:16:00Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Reviewed the SEC-01 (CSP/HSTS headers), SEC-02 (Upstash rate limiting), and REL-01 (atomic Redis download counter) changes plus their tests. The CSP in `next.config.ts` is well-scoped and correctly allowlists the Google Fonts domains and `*.blob.vercel-storage.com`; the `unsafe-inline` script/style directives are covered by real inline usage (`Script` SW registration, `style={{...}}` in `progress.tsx`) so the policy won't break anything at runtime. The hermetic Redis-fake tests for the atomic counter (`storage.test.ts`) correctly prove the DECR-based design never over-issues downloads under concurrency.

However, three BLOCKER-level correctness bugs were found by tracing the actual request flow against the diff (`git diff c293bf0..HEAD`), not just reading the new code in isolation:

1. The password brute-force rate limiter is applied to **every** download request, not just password-protected ones — throttling normal (no-password) file downloads to 5/min instead of the intended 30/min.
2. `seedDownloadCounter` is not idempotent (`SET` without `NX`), so a retried `onUploadCompleted` webhook (a documented Vercel Blob behavior) silently resets the download counter back to the full limit after downloads have already started, defeating the exact over-issuing bug REL-01 was built to close.
3. Removing the metadata read-modify-write (in favor of the Redis-only counter) silently broke the cleanup cron's ability to detect exhausted files in both storage backends, and blob mode additionally lost its per-request exhaustion cleanup that fs mode still has — so fully-downloaded files in blob mode now persist until natural expiry (up to 365 days) instead of being reaped promptly.

## Critical Issues

### CR-01: `seedDownloadCounter` is not idempotent against upload-webhook retries, allowing the download counter to be reset to full after downloads have started

**File:** `src/lib/redis.ts:67-74` (called from `src/app/api/files/route.ts:132-142`)
**Issue:** `seedDownloadCounter` does an unconditional `redis.set(counterKey(id), limit, { ex: ttlSeconds })` — no `nx: true`. It is invoked from `onUploadCompleted` in `handleBlobUpload`, which is a server-to-server webhook callback from Vercel Blob after the client's direct PUT finishes. Vercel Blob may retry this webhook callback on timeout/non-200 response (standard webhook resilience). If the webhook fires twice for the same upload — once seeding `dl:{id}` to `limit`, then some downloads happen decrementing it, then the retry fires — the retry's unconditional `set` silently resets `dl:{id}` back to the full `limit`, allowing more downloads than the uploader configured. This defeats the exact invariant REL-01 exists to protect (`decrementDownloadCounter` is correctly race-free, but its correctness is worthless if the seed itself can be replayed).
**Fix:**
```ts
// src/lib/redis.ts
export async function seedDownloadCounter(
  id: string,
  limit: number,
  ttlSeconds: number,
  redis: RedisLike = getRedisClient(),
): Promise<void> {
  // NX: only seed if absent. A retried onUploadCompleted webhook must be a
  // no-op once downloads may already have been decremented.
  await redis.set(counterKey(id), limit, { nx: true, ex: ttlSeconds });
}
```

### CR-02: Password-attempt rate limiter is applied to every download, not just password-protected ones

**File:** `src/app/api/files/[id]/route.ts:55-58` (`handleBlobDownload`) and `:123-126` (`handleFsDownload`)
**Issue:** `checkPasswordAttemptLimit(id, ip)` runs unconditionally before `checkPassword(meta, ...)`, even when `meta.passwordHash` is `undefined` (no password set on the share). Since the default `RATE_LIMIT_PASSWORD_PER_MIN` is 5 (vs. `RATE_LIMIT_DOWNLOAD_PER_MIN` = 30 already enforced by `checkDownloadLimit` in the outer `GET` handler), any file shared **without** a password is silently capped at 5 downloads/min/IP instead of the intended 30 — e.g. a link shared in a group chat, or multiple people behind the same NAT/corporate IP, will start getting spurious 429s attributed to a limiter that was only meant to throttle password brute-forcing.
**Fix:**
```ts
if (meta.passwordHash) {
  const pwLimited = await checkPasswordAttemptLimit(id, ip);
  if (pwLimited) return pwLimited;
}
const pwFail = await checkPassword(meta, req.headers.get("x-password"));
if (pwFail) return pwFail;
```
Apply the same change in both `handleBlobDownload` and `handleFsDownload`.

### CR-03: Blob-mode exhausted files are no longer cleaned up — cleanup cron's `downloadsRemaining <= 0` check is now permanently dead code

**File:** `src/app/api/files/[id]/route.ts:51` / `:119` (dead checks), and the removal of the metadata write in `git diff c293bf0..HEAD -- "src/app/api/files/[id]/route.ts"` (also affects `src/app/api/cleanup/route.ts`, out of this diff's scope but directly broken by it)
**Issue:** Before this phase, `handleBlobDownload`/`handleFsDownload` wrote the decremented `downloadsRemaining` back to metadata on every download (`await blobWriteMeta({ ...meta, downloadsRemaining: remaining })`). That write was the only thing that made two things work: (a) the `if (meta.downloadsRemaining <= 0)` guard at the top of both handlers, and (b) the cleanup cron's `else if (meta.downloadsRemaining <= 0)` branch in `src/app/api/cleanup/route.ts` (both `cleanupBlob()` and `cleanupFs()`).
Now that Redis is the sole authority and metadata is never rewritten post-upload, `meta.downloadsRemaining` is frozen at its original upload-time value (always `>= 1` per `validateClientMeta`) for the file's entire life. Consequently:
- The `meta.downloadsRemaining <= 0` checks in both download handlers can never be true again (dead code).
- The cleanup cron's exhausted-file branch can never fire again in **either** storage backend — it will only ever catch files via the (unaffected) expiry check.
- `handleFsDownload` still has a compensating path (`if (remaining === 0) nodeStream.on("close", () => void fsDeleteEntry(id))`), so fs-mode exhausted files are still reaped promptly.
- `handleBlobDownload` has **no** equivalent — there is no `remaining === 0` branch at all, only `remaining < 0`. A blob-mode file is now deleted only when someone makes an *extra* download attempt past the limit (pushing the counter negative) or when it naturally expires (`MAX_EXPIRY_MS` = up to 365 days). A file downloaded exactly the configured number of times and never touched again will sit fully-consumed in Vercel Blob storage for up to a year.

This is a real regression (not a pre-existing gap): it silently removes a previously-working, cron-backed safety net, and it produces divergent behavior between the two storage backends for the same scenario (violates the project's stated storage-abstraction/dual-mode-parity design).
**Fix:** Either (a) restore a best-effort metadata write purely for cron visibility (Redis stays authoritative for the allow/deny decision, so this doesn't reintroduce the race), or (b) add an explicit `remaining === 0` branch in `handleBlobDownload` that flags the entry for cleanup without invalidating the presigned URL that was just issued (deletion must be deferred past `PRESIGN_TTL_MS`, since immediately `del()`-ing the blob would break the URL just handed to the client):
```ts
if (remaining === 0) {
  // Last legitimate download: mark exhausted for the cleanup cron so a
  // blob-mode file that's never revisited still gets reaped, without
  // invalidating the presigned URL we're about to hand back (still valid
  // for PRESIGN_TTL_MS against the live blob object).
  await blobWriteMeta({ ...meta, downloadsRemaining: 0 });
}
```
and update `cleanupBlob()`/`cleanupFs()` in `src/app/api/cleanup/route.ts` accordingly (or, if metadata is intentionally never to be rewritten again, replace their `downloadsRemaining <= 0` branch with a Redis-backed check).

## Warnings

### WR-01: Fail-open rate limiters swallow all Redis errors with zero logging/observability

**File:** `src/lib/rate-limit.ts:79-91`
**Issue:** `enforce()` catches any error from `limiter.limit(identifier)` and always returns `null` (allow), per the documented "availability over strictness" tradeoff. That tradeoff is reasonable, but combined with the project's "no console" convention, a sustained Upstash outage silently disables **all** rate limiting — including the password brute-force guard — with no signal anywhere that this happened. There's no way to distinguish "no attacker activity" from "the limiter has been down for six hours" in production.
**Fix:** At minimum, increment a lightweight counter/metric (or use whatever structured error-reporting the project already has, if any) on the catch path so an outage of this specific security control is observable, even without `console.log`.

### WR-02: Self-heal reseed on a missing counter key resets to the full limit, which can over-count under Redis key eviction

**File:** `src/lib/redis.ts:83-93`
**Issue:** `decrementDownloadCounter` does `redis.set(key, limit, { nx: true, ex: ttlSeconds })` before every `decr`, explicitly to avoid under-counting if the key is missing (TTL/eviction). The flip side isn't addressed: if `dl:{id}` is evicted early (e.g., Upstash under memory pressure with an eviction policy, or any other reason the key vanishes before the file's natural expiry), the very next download silently reseeds the counter back to the **original full limit** — effectively resetting the download-limit invariant for a security control whose entire purpose is bounding exposure. Under-counting (refusing a legitimate download) is a much safer failure mode for a security-relevant limit than over-counting (granting more downloads than configured).
**Fix:** Document this tradeoff explicitly if intentional, or consider failing closed (reject) rather than reseeding to the full limit when the key is unexpectedly absent before `ttlSeconds` describes it should still exist (i.e., only self-heal generously the first time / when there's no other way to know the true remaining count).

### WR-03: No unit tests for `rate-limit.ts` despite this being a "test hardening" phase

**File:** `src/lib/rate-limit.ts` (no corresponding `rate-limit.test.ts`)
**Issue:** `storage.test.ts` establishes a hermetic in-memory Redis fake and thoroughly tests `redis.ts`'s counter logic (including a real concurrency regression test), but no analogous tests exist for `checkUploadLimit`/`checkDownloadLimit`/`checkPasswordAttemptLimit` — e.g. the 429 + `Retry-After` math in `enforce()`, the fail-open catch path, or `intEnv()`'s fallback parsing. Given SEC-02 is a security-critical feature added in a phase explicitly about test hardening, this is a coverage gap.
**Fix:** Add `src/lib/rate-limit.test.ts` injecting a fake `Ratelimit`-like object (or testing `intEnv`/`enforce` in isolation) to cover the 429 path, `Retry-After` calculation, and the fail-open catch.

### WR-04: `clientIp()` is duplicated verbatim across two files

**File:** `src/app/api/files/route.ts:212-219` and `src/app/api/files/[id]/route.ts:167-173`
**Issue:** The exact same function (plus a near-identical doc comment) is copy-pasted into both route files rather than extracted into a shared helper. Any future correction (e.g., switching to a different trusted-IP header, or handling IPv6/port suffixes) now has to be made in two places and can easily drift.
**Fix:** Extract to `src/lib/request-ip.ts`:
```ts
export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
```
and import it from both route files.

### WR-05: IP-based rate limiting trusts `x-forwarded-for` with no runtime guard against non-Vercel deployments

**File:** `src/app/api/files/route.ts:212-219`, `src/app/api/files/[id]/route.ts:167-173`
**Issue:** Both comments assert `x-forwarded-for` "is not client-spoofable in production," which is true specifically because Vercel's edge network overwrites the header — but nothing in the code enforces or checks that assumption. If this app is ever run outside Vercel's edge (e.g., `next start` behind a bare reverse proxy, or no proxy at all, or a different provider that doesn't scrub incoming `x-forwarded-for`), every rate limit — upload, download, and the password brute-force guard — becomes trivially bypassable by an attacker simply rotating the header value per request. Given `getStorageMode()` already supports a non-Vercel-Blob (filesystem) deployment path, this isn't a purely hypothetical scenario for this codebase.
**Fix:** At minimum, document this as a hard deployment requirement (Vercel only, or behind a proxy that is known to strip/overwrite `x-forwarded-for`) somewhere more visible than a code comment (e.g., README/deploy docs), since the security guarantee of every rate limiter in this phase rests on it.

## Info

### IN-01: CSP omits `Referrer-Policy` / `Permissions-Policy`

**File:** `next.config.ts:9-49`
**Issue:** Out of scope for this phase's explicit requirements (CSP/HSTS/X-Frame-Options/nosniff), but while hardening security headers it would be low-cost to also set `Referrer-Policy: strict-origin-when-cross-origin` and a minimal `Permissions-Policy`.
**Fix:** Add both headers to the same `headers` array if a follow-up hardening pass is planned.

### IN-02: `@vitest/coverage-v8` is installed but no coverage script/threshold exists

**File:** `package.json:11,34`
**Issue:** The coverage provider was added as a dependency but `package.json` only has `"test": "vitest run"` — there's no `test:coverage` script or configured coverage thresholds in `vitest.config.ts`, so the dependency is currently unused and the project's 80% coverage convention isn't enforceable in CI.
**Fix:**
```json
"test:coverage": "vitest run --coverage"
```
and optionally add `coverage: { thresholds: { lines: 80, ... } }` to `vitest.config.ts`.

---

_Reviewed: 2026-07-11T21:16:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
