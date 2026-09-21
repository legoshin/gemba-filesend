---
phase: 04-security-reliability-test-hardening
fixed_at: 2026-07-11T20:45:00Z
review_path: .planning/phases/04-security-reliability-test-hardening/04-REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 10
skipped: 0
status: all_fixed
---

# Phase 4: Code Review Fix Report

**Fixed at:** 2026-07-11T20:45:00Z
**Source review:** .planning/phases/04-security-reliability-test-hardening/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 10 (3 Critical, 5 Warning, 2 Info -- `--all` scope)
- Fixed: 10
- Skipped: 0

## Fixed Issues

### CR-01: `seedDownloadCounter` is not idempotent against upload-webhook retries

**Files modified:** `src/lib/redis.ts`
**Commit:** `60dd1e9`
**Applied fix:** Added `nx: true` to the seed `SET` call so a retried `onUploadCompleted` webhook is a no-op once `dl:{id}` already exists, instead of silently resetting the counter back to the full limit after downloads have started.

### CR-02: Password-attempt rate limiter applied to every download, not just password-protected ones

**Files modified:** `src/app/api/files/[id]/route.ts`
**Commit:** `9374ded`
**Applied fix:** Gated `checkPasswordAttemptLimit(id, ip)` behind `if (meta.passwordHash)` in both `handleBlobDownload` and `handleFsDownload`, so non-password files are no longer capped at 5/min and instead correctly fall under the 30/min download limit.

### CR-03: Blob-mode exhausted files were never cleaned up

**Files modified:** `src/app/api/files/[id]/route.ts`
**Commit:** `7ba0d2f`
**Applied fix:** Added a `remaining === 0` branch in `handleBlobDownload` that writes `downloadsRemaining: 0` back to metadata (via `blobWriteMeta`) purely for cron visibility, immediately after the Redis decrement and before the presigned URL is minted. Redis stays authoritative for the allow/deny decision -- this does not reintroduce the read-modify-write race REL-01 removed. `cleanupBlob()`/`cleanupFs()` in `src/app/api/cleanup/route.ts` required no changes: their existing `downloadsRemaining <= 0` branch was already correct, it just had no live data to act on until this write was restored.

### WR-01: Fail-open rate limiters swallowed Redis errors with zero observability

**Files modified:** `src/lib/rate-limit.ts`
**Commit:** `a313adf`
**Applied fix:** Added `console.error("rate-limit: enforce() failed, failing open", err)` in the catch path before returning `null`, matching the `console.error` precedent already established for SW-registration-failure logging (phase 03, WR-05) -- keeps the fail-open behavior but makes a sustained Upstash outage observable.

### WR-02: Self-heal reseed on a missing counter key can over-count under Redis key eviction

**Files modified:** `src/lib/redis.ts`
**Commit:** `086d031`
**Applied fix (documentation option):** Expanded the JSDoc on `decrementDownloadCounter` to explicitly document the tradeoff: the NX self-heal exists to cover the narrow legitimate race between `blobWriteMeta`/`fsWriteMeta` and the Redis seed call in `onUploadCompleted`, and cannot distinguish that case from a genuine mid-life eviction (where it would over-count by reseeding to the full limit). Documented as an accepted, low-probability residual risk per the review's "document if intentional" option, rather than implementing a fail-closed behavior change that risks rejecting the legitimate first-download race without additional state to disambiguate the two cases.

### WR-03: No unit tests for `rate-limit.ts`

**Files modified:** `src/lib/rate-limit.test.ts` (new)
**Commit:** `a19d41c`
**Applied fix:** Added a hermetic test suite using a fake `Ratelimit` class (`vi.mock("@upstash/ratelimit")`, mirroring the in-memory Redis fake pattern already used in `storage.test.ts`). Covers: allow-under-limit, 429 + `Retry-After` math (including the minimum-1-second clamp), the fail-open catch path, and the password-attempt limiter's `fileId:ip` identifier scoping (including that different files get independent limits). No live Upstash creds or network required. 6 new tests, all passing.

### WR-04: `clientIp()` duplicated verbatim across two files

**Files modified:** `src/lib/request-ip.ts` (new), `src/app/api/files/route.ts`, `src/app/api/files/[id]/route.ts`
**Commit:** `2f42db3`
**Applied fix:** Extracted the shared `clientIp()` helper into `src/lib/request-ip.ts` and imported it from both route files, removing the duplicated inline definitions.

### WR-05: IP-based rate limiting trusts `x-forwarded-for` with no documented deployment requirement

**Files modified:** `README.md`
**Commit:** `b74ff02`
**Applied fix:** Added a "Deployment Requirement: Trusted Proxy (Rate Limiting)" subsection under Security Model, documenting that `x-forwarded-for` is only trustworthy on Vercel (edge overwrites it) or behind a reverse proxy configured to strip/overwrite it, and explicitly warning that `next start` with no proxy in front makes every rate limiter trivially bypassable.

### IN-01: CSP omits `Referrer-Policy` / `Permissions-Policy`

**Files modified:** `next.config.ts`
**Commit:** `da8e7a7`
**Applied fix:** Added `Referrer-Policy: strict-origin-when-cross-origin` and a minimal `Permissions-Policy: camera=(), microphone=(), geolocation=()` to the existing headers array.

### IN-02: `@vitest/coverage-v8` installed but unused

**Files modified:** `package.json`
**Commit:** `e7dad01`
**Applied fix:** Added `"test:coverage": "vitest run --coverage"` script. Deliberately skipped adding hard coverage thresholds to `vitest.config.ts`: measured coverage across the currently-tested `src/lib`/`src/app/api` files is ~35% (statements), and the wider `src/` tree (React components, pages) has no tests at all, so an 80%-style threshold would fail `test:coverage` immediately rather than being enforceable. Raising coverage broadly is a larger effort outside this review's scope; flagging here per the instruction to document adaptations.

## Skipped Issues

None -- all 10 in-scope findings were fixed.

## Final Verification

- `npx tsc --noEmit`: **PASS** (no errors)
- `npx vitest run`: **PASS** (33/33 tests -- 27 pre-existing + 6 new `rate-limit.test.ts` tests)
- `npm run build`: **PASS** (Next.js 16.1.6 Turbopack build completed successfully, all routes generated)

---

_Fixed: 2026-07-11T20:45:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
