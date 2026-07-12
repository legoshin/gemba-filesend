---
phase: 04-security-reliability-test-hardening
verified: 2026-07-11T21:43:00Z
status: human_needed
score: 7/7 must-haves verified (code/test/build level)
overrides_applied: 0
human_verification:
  - test: "Live Upstash rate-limit + atomic counter behavior at deploy"
    expected: "With UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN set in the deploy environment: (1) the (limit+1)-th upload/download from one IP within a minute returns 429 + Retry-After; (2) password guesses past RATE_LIMIT_PASSWORD_PER_MIN return 429 only for password-protected files; (3) the (N+1)-th download of a limit-N file returns 410 Gone; (4) N concurrent downloads against a live store yield exactly N successes."
    why_human: "No live Upstash credentials are provisioned in this environment (explicit, accepted user decision to execute now and defer this to deploy). The logic is proven correct against a hermetic in-memory fake (TEST-03) and a mocked Ratelimit (rate-limit.test.ts), but the actual Upstash REST integration (network behavior, real sliding-window semantics, real TTL/eviction behavior) cannot be exercised without live credentials."
  - test: "Manual cross-platform CSP regression check (web/PWA/Android TWA)"
    expected: "Public Sans font renders, next-themes toggle works with no console errors, /sw.js registers and reaches 'active', blob downloads succeed, and the Android TWA custom-tab flow is unaffected by frame-ancestors 'none' + X-Frame-Options: DENY."
    why_human: "04-01-SUMMARY.md documents automated headless-Chrome verification (zero CSP violations, correct font, SW active) as a substitute, but explicitly defers live Android TWA packaging/rendering and a live end-to-end Vercel Blob presigned-URL download to a real device/deployment session — these require infra outside this repo's automated harness."
---

# Phase 4: Security, Reliability & Test Hardening Verification Report

**Phase Goal:** The app's responses are hardened with security headers and rate limiting, the download-counter race condition is fixed, and the crypto/password/counter/metadata logic is covered by automated unit tests.
**Verified:** 2026-07-11T21:43:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | App responses include CSP, HSTS, X-Frame-Options, X-Content-Type-Options headers (SC1/SEC-01) | VERIFIED | `next.config.ts` lines 9-58: `headers()` returns a single `/(.*)` entry setting all four required headers plus (post-review-fix) `Referrer-Policy` and `Permissions-Policy`. CSP allowlists `fonts.googleapis.com` (style-src), `fonts.gstatic.com` (font-src, T-03-07 carry-forward honored), and `*.blob.vercel-storage.com` (img-src/connect-src). `frame-ancestors 'none'` + `X-Frame-Options: DENY` present. |
| 2 | Repeated upload/download requests from one IP are throttled past a threshold (SC2/SEC-02) | VERIFIED | `src/lib/rate-limit.ts`: three sliding-window limiters (`checkUploadLimit`, `checkDownloadLimit`, `checkPasswordAttemptLimit`) via `@upstash/ratelimit`, wired into `src/app/api/files/route.ts` POST (line 214) and `src/app/api/files/[id]/route.ts` GET (line 188-189). 429 + `Retry-After` on breach (`enforce()` lines 74-96). Password limiter correctly gated behind `if (meta.passwordHash)` in both storage paths (CR-02 fix confirmed present at lines 57-60/136-139 of `[id]/route.ts`) — no longer throttles password-less downloads at 5/min. |
| 3 | Concurrent downloads against a limit-N file never exceed N — counter race fixed and verified by a concurrency test (SC3/REL-01) | VERIFIED | Atomic `decrementDownloadCounter` (`src/lib/redis.ts` lines 104-114) replaces the old RMW in both `handleBlobDownload`/`handleFsDownload`; fails CLOSED (503) on Redis error. `seedDownloadCounter` now idempotent (`{ nx: true }`, CR-01 fix confirmed at line 79 of `redis.ts`) so a retried upload webhook cannot reset an in-flight counter. `src/lib/storage.test.ts` "REL-01 regression" test (lines 184-212) fires 20 parallel decrements against a seeded limit of 5 via a hermetic in-memory fake and asserts `exactly 5` succeed — confirmed passing independently (`npx vitest run` → 33/33 PASS). |
| 4 | Automated unit tests exist and pass for crypto round-trip/packed format, password hash/validate, counter decrement+limit (incl. concurrency fix), metadata serialization/validation (SC4/TEST-01..04) | VERIFIED | `src/lib/crypto.test.ts` (12 tests, TEST-01/02), `src/lib/storage.test.ts` (15 tests, TEST-03/04), `src/lib/rate-limit.test.ts` (6 tests, added during review-fix for WR-03 coverage). Independently re-ran `npx vitest run` → **33/33 PASS**, `npx tsc --noEmit` → **0 errors**. All behaviors specified in the plan (round-trip, packed format/IV uniqueness, too-short rejection, wrong-key/tampered-ciphertext throw, password stability/match/mismatch, validateClientMeta branch matrix, StoredMeta JSON round-trip, sequential + parallel counter regression) are present and asserted, not just smoke-tested. |
| 5 | Blob-mode exhausted files remain reapable by the cleanup cron (dual-mode parity, CR-03 fix) | VERIFIED | `src/app/api/files/[id]/route.ts` lines 84-92: `remaining === 0` branch writes `downloadsRemaining: 0` back to metadata (cron-visibility only, does not reintroduce the RMW race — Redis still decides allow/deny). `src/app/api/cleanup/route.ts` `cleanupBlob()`/`cleanupFs()` both retain their pre-existing `downloadsRemaining <= 0` branch (lines 53, 94), which now has live data to act on again in both storage backends. |
| 6 | The api/cleanup cron endpoint stays exempt from rate limiting | VERIFIED | `grep -rF "checkDownloadLimit\|checkUploadLimit\|checkPasswordAttemptLimit" src/app/api/cleanup/route.ts` → no matches; `src/app/api/cleanup/route.ts` unchanged except being unaffected by this phase's other files, `CRON_SECRET` auth (`isAuthorized()`) intact. |
| 7 | In-memory/per-instance-only rate limiting is not used; one shared Upstash store backs both SEC-02 and REL-01 (D-01/D-03/D-10) | VERIFIED | `src/lib/redis.ts` `getRedisClient()` is the single singleton consumed by both `src/lib/rate-limit.ts` (`buildLimiter` line 40) and the counter primitives — D-10 "one store" confirmed by source inspection; dev-only in-memory shim is explicitly documented as non-authoritative (concurrency proven by the hermetic fake, not the shim). |

**Score:** 7/7 truths verified at the code/test/build level.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `next.config.ts` | Security headers via `headers()` | VERIFIED | 61 lines, all 4 required + 2 bonus headers present, CSP allowlists confirmed |
| `src/lib/redis.ts` | Shared client + atomic counter primitives | VERIFIED | Exports `getRedisClient`, `seedDownloadCounter` (NX-idempotent), `decrementDownloadCounter`; `dl:{id}` key convention confirmed |
| `src/lib/rate-limit.ts` | Per-IP sliding-window limiters | VERIFIED | Exports `checkUploadLimit`, `checkDownloadLimit`, `checkPasswordAttemptLimit`; 429+Retry-After; fail-open with logged catch (WR-01 fix) |
| `src/lib/request-ip.ts` | Shared `clientIp()` helper (WR-04 fix) | VERIFIED | New file, imported by both route files, de-duplicating the prior copy-pasted implementation |
| `src/app/api/files/route.ts` | Upload rate-limit guard + counter seed | VERIFIED | `checkUploadLimit` at top of `POST()`; `seedDownloadCounter` in both blob and direct-upload paths |
| `src/app/api/files/[id]/route.ts` | Download+password guards + atomic DECR | VERIFIED | `checkDownloadLimit` in `GET()`; `checkPasswordAttemptLimit` gated by `meta.passwordHash`; `decrementDownloadCounter` replacing RMW; 410 exhausted / 503 counter-unavailable |
| `src/lib/crypto.test.ts` | TEST-01/02 coverage | VERIFIED | 12 tests covering round-trip, packed format, IV uniqueness, rejection paths, password hash stability |
| `src/lib/storage.test.ts` | TEST-03/04 coverage | VERIFIED | 15 tests covering validateClientMeta matrix, StoredMeta round-trip, sequential + parallel (REL-01) counter regression |
| `src/lib/rate-limit.test.ts` | Rate-limiter unit coverage (WR-03 fix) | VERIFIED | 6 tests, hermetic `vi.mock` of `@upstash/ratelimit`, covers allow/429/Retry-After clamp/fail-open/password-scoping |
| `vitest.config.ts` | Vitest config, node env, no polyfill | VERIFIED | Present, `@` alias added post-hoc to resolve `@/` imports |
| `.env.example` | Documents new env vars | VERIFIED | Present per 04-02-SUMMARY, `.gitignore` opt-in confirmed |
| `README.md` | Trusted-proxy deployment requirement (WR-05 fix) | VERIFIED | "Deployment Requirement: Trusted Proxy (Rate Limiting)" section present at line 140 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `next.config.ts` CSP style-src | `fonts.googleapis.com` | allowlist entry | WIRED | Confirmed in `cspDirectives` array |
| `next.config.ts` CSP font-src | `fonts.gstatic.com` | allowlist entry | WIRED | Confirmed |
| `src/app/api/files/[id]/route.ts` | `decrementDownloadCounter` | atomic DECR replacing RMW | WIRED | `meta.downloadsRemaining - 1` string confirmed absent (grep returns none); atomic call present in both handlers |
| `src/lib/rate-limit.ts` | `@upstash/ratelimit` slidingWindow | shared client | WIRED | `Ratelimit.slidingWindow(limit, "1 m")` over `getRedisClient()` |
| `src/app/api/files/route.ts` | `seedDownloadCounter` | seed after writeMeta, both paths | WIRED | Confirmed at line 139 (blob) and line 208 (direct) |
| `src/lib/storage.test.ts` | `decrementDownloadCounter` (redis.ts) | injected in-memory fake | WIRED | `RedisLike` type imported, fake implements exact `{set, decr}` surface |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite passes | `npx vitest run` | PASS (33) FAIL (0) | PASS |
| Type-check passes | `npx tsc --noEmit` | "No errors found" | PASS |
| Debt markers absent in modified files | `grep -n -E "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER"` across all 9 phase-touched files | No matches (exit 1) | PASS |
| `npm run build` (orchestrator-reported) | `npm run build` | "compiled successfully, all routes generated" | PASS (accepted from orchestrator evidence, not independently re-run — non-destructive to re-verify tsc/vitest instead) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SEC-01 | 04-01 | Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) | SATISFIED | `next.config.ts` headers() block, verified above |
| SEC-02 | 04-02 | Per-IP rate limiting on upload/download/password endpoints | SATISFIED | `src/lib/rate-limit.ts` + wiring in both route files, CR-02 fix confirmed |
| REL-01 | 04-02 | Download-counter race fixed via atomic counter | SATISFIED | `src/lib/redis.ts` atomic DECR + NX-idempotent seed (CR-01 fix), TEST-03 regression test passing |
| TEST-01 | 04-03 | Unit tests for crypto encrypt/decrypt round-trip + packed format | SATISFIED | `src/lib/crypto.test.ts` |
| TEST-02 | 04-03 | Unit tests for password hashing/validation | SATISFIED | `src/lib/crypto.test.ts` (sha256Hex describe block) |
| TEST-03 | 04-03 | Tests for counter decrement + limit enforcement (concurrency) | SATISFIED | `src/lib/storage.test.ts` REL-01 regression test |
| TEST-04 | 04-03 | Unit tests for metadata serialization/validation | SATISFIED | `src/lib/storage.test.ts` validateClientMeta + StoredMeta round-trip tests |

No orphaned requirements — all 7 IDs declared across the three plans (`04-01: [SEC-01]`, `04-02: [SEC-02, REL-01]`, `04-03: [TEST-01, TEST-02, TEST-03, TEST-04]`) match exactly the 7 IDs listed in the phase brief and in `.planning/REQUIREMENTS.md` (all marked `[x]` / "Complete" for Phase 4).

### Anti-Patterns Found

None. No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers, no empty-implementation stubs, no hardcoded-empty-data patterns found in any of the 9 files touched by this phase's three plans plus the review-fix commits.

### Code Review Cycle

A full code review (`04-REVIEW.md`) found 3 CRITICAL, 5 WARNING, 2 INFO issues after tracing the actual request flow (not just reading the diff in isolation) — including two real correctness regressions (CR-02: password limiter throttling non-password downloads at 5/min instead of 30/min; CR-03: blob-mode exhausted files silently un-reapable by the cleanup cron). All 10 findings were verified fixed in the codebase during this verification pass:
- CR-01 (seed idempotency): `{ nx: true }` present in `redis.ts` line 79 — CONFIRMED
- CR-02 (password limiter scope): `if (meta.passwordHash)` gate present in both handlers — CONFIRMED
- CR-03 (blob cron visibility): `remaining === 0` write-back present — CONFIRMED
- WR-01 (fail-open logging): `console.error` present in `rate-limit.ts` catch path — CONFIRMED
- WR-02 (eviction tradeoff): documented in JSDoc, not code-changed (accepted as-is per review-fix) — CONFIRMED
- WR-03 (rate-limit tests): `src/lib/rate-limit.test.ts` exists, 6 tests, independently verified passing — CONFIRMED
- WR-04 (clientIp dedup): `src/lib/request-ip.ts` exists and is imported by both route files — CONFIRMED
- WR-05 (trusted-proxy doc): README.md section present — CONFIRMED
- IN-01 (Referrer-Policy/Permissions-Policy): both present in `next.config.ts` — CONFIRMED
- IN-02 (coverage script): `test:coverage` script present in `package.json` — CONFIRMED

### Human Verification Required

#### 1. Live Upstash rate-limit + atomic counter behavior at deploy

**Test:** Set `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` in the deploy environment (Upstash Console → Redis DB → REST API). Then: (a) burst >10 uploads/min from one IP, (b) burst >30 downloads/min from one IP, (c) burst >5 password guesses/min against one password-protected file, (d) upload a file with a download limit of N and fire N+1 (or more, concurrently) downloads.
**Expected:** (a)/(b)/(c) return 429 with a `Retry-After` header once past threshold; (d) the (N+1)-th (or any download beyond N under concurrency) returns 410 Gone, and exactly N downloads ever succeed.
**Why human:** No live Upstash credentials exist in this dev/CI environment — this was an explicit, accepted user decision ("execute now anyway," documented in 04-02-SUMMARY.md and 04-03-SUMMARY.md) to defer live-infra verification to deploy time. The code path is proven correct via a hermetic in-memory fake (unit tests) and a mocked `Ratelimit` class, but the real network/REST/TTL-eviction behavior of Upstash itself cannot be exercised without live credentials.

#### 2. Manual cross-platform CSP regression check (web/PWA/Android TWA)

**Test:** Load `/`, `/upload`, `/download` on a real deployment across web, installed PWA, and the packaged Android TWA. Toggle light/dark/system theme manually. Perform a real end-to-end upload → share link → download against a live Vercel Blob store.
**Expected:** No CSP console violations, Public Sans font renders in all three contexts, `/sw.js` reaches `active`, theme toggle works, and the Android TWA custom-tab flow renders correctly (no clickjacking-related breakage from `frame-ancestors 'none'` + `X-Frame-Options: DENY`).
**Why human:** 04-01-SUMMARY.md documents a strong automated proxy (headless-Chrome/Puppeteer verification: zero console errors, correct computed font-family, SW active) but explicitly defers three items to a real device/deployment session: live Android TWA packaging/rendering, a manual theme-toggle click, and a live end-to-end presigned-URL blob download — none of which are exercisable from this local, non-deployed dev harness.

### Gaps Summary

No BLOCKER-level gaps. All 7 observable truths mapped to the roadmap's 4 success criteria and the phase's 7 requirement IDs are VERIFIED at the code, type-check, and automated-test level, and the phase's own code-review cycle (3 critical + 5 warning + 2 info findings) was fully closed with fixes independently confirmed present in the current codebase — not just claimed in REVIEW-FIX.md.

Status is `human_needed` (not `passed`) solely because two categories of runtime behavior — live Upstash REST behavior and live cross-platform (TWA/PWA) rendering — cannot be exercised in this local, credential-less, non-deployed verification environment. Both were explicit, documented, accepted deferrals by the user during execution (not oversights), and both have strong automated proxies already in place (hermetic fakes/mocks for Upstash; headless-Chrome CSP/font/SW checks for cross-platform). These are routed to human verification rather than treated as gaps.

---

*Verified: 2026-07-11T21:43:00Z*
*Verifier: Claude (gsd-verifier)*
