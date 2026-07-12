---
phase: 04
slug: security-reliability-test-hardening
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-12
---

# Phase 04 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register origin: plan-time (authored in `04-01-PLAN.md`…`04-03-PLAN.md` `<threat_model>` blocks). Verified against implemented code by `/gsd-secure-phase`.
>
> This audit was run **after** a full code-review cycle (`04-REVIEW.md` → `04-REVIEW-FIX.md`, 3 CRITICAL + 5 WARNING + 2 INFO, all fixed). Two fixes changed the mitigation actually verified below: CR-01 (idempotent `seedDownloadCounter`, T-04-08) and CR-02 (password limiter gated on `meta.passwordHash`, T-04-06).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|----------------|
| Browser → app responses | Response headers (CSP/HSTS/X-Frame-Options/nosniff) set server-side, enforced by the browser | No secret data; policy only |
| Browser → third-party font CDN | Static requests to fonts.googleapis.com / fonts.gstatic.com | None sensitive |
| Browser → Vercel Blob CDN | Presigned download fetch to `*.blob.vercel-storage.com` | Encrypted ciphertext only (key stays in URL fragment, never sent) |
| Client → upload/download/password API | Untrusted requests of arbitrary volume and arbitrary `x-forwarded-for` | File bytes/metadata, password guesses, IP-derived rate-limit identity |
| API → Upstash Redis (REST) | Server-side only; limiter + counter state | Rate-limit counters, `dl:{id}` download counter — never exposed to the browser |
| Vercel Cron → api/cleanup | Authenticated maintenance traffic | `CRON_SECRET` bearer token |
| Test process → crypto/counter modules | Hermetic in-process test execution | No network, no live credentials |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation / Evidence | Status |
|-----------|----------|-----------|-------------|------------------------|--------|
| T-04-01 | Tampering/Spoofing (clickjacking) | app pages framed | mitigate | `next.config.ts:18` `"frame-ancestors 'none'"` in CSP array; `next.config.ts:39-41` `X-Frame-Options: DENY` header. Both present on the single `/(.*)` `headers()` entry applied to every response. | closed |
| T-04-02 | Info Disclosure (protocol downgrade/MITM) | http↔https | mitigate | `next.config.ts:34-37` `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`. Exact value matches plan spec. | closed |
| T-04-03 | Spoofing (MIME sniffing) | served responses | mitigate | `next.config.ts:42-44` `X-Content-Type-Options: nosniff`. | closed |
| T-04-04 | Tampering (XSS) | rendered pages | mitigate | `next.config.ts:10-11` `default-src 'self'` + scoped `script-src 'self' 'unsafe-inline'`. Residual `'unsafe-inline'` is a documented, deliberate acceptance (D-04; nonce/strict-dynamic CSP is D-07, explicitly deferred) — see Accepted Risks Log AR-04-01. | closed |
| T-04-05 | DoS (self-inflicted — CSP breaks fonts/theme/SW/TWA/download) | Public Sans / next-themes / sw.js / blob | mitigate | `next.config.ts:12` `fonts.googleapis.com` (style-src), `:13` `fonts.gstatic.com` (font-src) — T-03-07 carry-forward honored; `:14-15` `*.blob.vercel-storage.com` on img-src/connect-src; `:16` `worker-src 'self'`. 04-01-SUMMARY.md records headless-Chrome verification of zero CSP console violations across `/`, `/upload`, `/download`, correct Public Sans `font-family`, and active service-worker registration. | closed |
| T-04-06 | Spoofing/Elevation (password brute-force) | `checkPassword` on `api/files/[id]` | mitigate | `src/lib/rate-limit.ts:112-117` `checkPasswordAttemptLimit(fileId, ip)` (sliding window, `RATE_LIMIT_PASSWORD_PER_MIN`, 429 + `Retry-After` via `enforce()`). Gated correctly (CR-02): `src/app/api/files/[id]/route.ts:57-60` (`handleBlobDownload`) and `:136-139` (`handleFsDownload`) both wrap the limiter call in `if (meta.passwordHash) { ... }` — confirmed NOT applied to password-less downloads, which fall under the 30/min `checkDownloadLimit` instead. **Residual (see T-04-10):** during a Redis outage this limiter fails OPEN by explicit, documented design — see note below. | closed |
| T-04-07 | DoS (endpoint abuse) | upload + download endpoints | mitigate | `src/app/api/files/route.ts:214` `checkUploadLimit(clientIp(req))` at the top of `POST()`, before storage dispatch. `src/app/api/files/[id]/route.ts:188` `checkDownloadLimit(ip)` at the top of `GET()`, before storage dispatch. Both return 429 + `Retry-After` on breach (`rate-limit.ts` `enforce()`). | closed |
| T-04-08 | Tampering (TOCTOU counter race) | download-counter read-modify-write | mitigate | `src/lib/redis.ts:73-80` `seedDownloadCounter` uses `{ nx: true, ex: ttlSeconds }` (CR-01 — idempotent against retried upload webhooks). `src/lib/redis.ts:104-114` `decrementDownloadCounter` performs an atomic NX-self-heal + `decr`. Both download handlers (`[id]/route.ts:70-83`, `:149-162`) call it and reject with 410 when `remaining < 0`; no write-back of the decremented value to metadata (D-09). `src/lib/storage.test.ts:184-212` fires 20 parallel decrements against a seeded limit of 5 and asserts `expect(allowed.length).toBe(limit)` — exactly 5 succeed, never more. | closed |
| T-04-09 | Spoofing (x-forwarded-for spoofing) | IP derivation | mitigate | `src/lib/request-ip.ts:9-11` `clientIp()` takes the first XFF hop, single shared implementation (WR-04 dedup) imported by both route files. `README.md:140-153` "Deployment Requirement: Trusted Proxy (Rate Limiting)" documents that this is only trustworthy on Vercel (edge overwrites the header) or behind a proxy configured to strip/overwrite it, and explicitly warns non-Vercel/no-proxy deployment makes every limiter bypassable — residual accepted and documented (WR-05 fix), not silently assumed. | closed |
| T-04-10 | DoS (Redis outage) | limiter + counter under Redis failure | mitigate | `src/lib/rate-limit.ts:87-95` `enforce()` catch path: `console.error(...)` then `return null` (fail OPEN, now observable per WR-01). `src/lib/redis.ts` + both route files: `decrementDownloadCounter` throw is caught and returns `503` (fail CLOSED) — confirmed at `[id]/route.ts:77-79` and `:156-158`. Deliberate, documented opposite policies confirmed present exactly as declared. | closed |
| T-04-11 | Elevation (limiter on cron / cron bypass) | api/cleanup | accept | `grep -rn "checkDownloadLimit\|checkUploadLimit\|checkPasswordAttemptLimit\|rate-limit" src/app/api/cleanup/route.ts` → no matches (confirmed). `src/app/api/cleanup/route.ts:105-113` `isAuthorized()` still gates on `CRON_SECRET` bearer auth, unchanged. Entry added to Accepted Risks Log (AR-04-02) by this audit. | closed |
| T-04-SC | Tampering (supply chain) | `@upstash/ratelimit` + `@upstash/redis` install | mitigate | `04-02-PLAN.md` Task 1 blocking-human checkpoint (never auto-approvable) required npmjs.com publisher/typosquat verification before install; `04-02-SUMMARY.md` records checkpoint-approved commit `2ec2bb4`. `package.json` confirms `"@upstash/ratelimit": "^2.0.8"`, `"@upstash/redis": "^1.38.0"` present. | closed |
| T-04-12 | Tampering (supply chain) | `vitest` + `@vitest/coverage-v8` install | mitigate | `04-03-PLAN.md` Task 1 blocking-human checkpoint; `04-03-SUMMARY.md` records checkpoint-approved commit `a13351e`. `package.json` confirms `"vitest": "^4.1.10"`, `"@vitest/coverage-v8": "^4.1.10"` present. | closed |
| T-04-13 | Info Disclosure (tests hit live Redis / leak creds) | TEST-03 counter test | mitigate | `src/lib/storage.test.ts:146-162` `createFakeRedis()` — plain in-memory `Map`-backed fake implementing exactly `{set, decr}`; injected as the `client` arg into `seedDownloadCounter`/`decrementDownloadCounter`. No import of `@upstash/redis`, no reference to `UPSTASH_*` env vars, no network call anywhere in the file. | closed |
| T-04-14 | Repudiation (false-green tests) | TEST-03 concurrency assertion | mitigate | `src/lib/storage.test.ts:184-212` "REL-01 regression" test: seeds limit=5, fires 20 parallel decrements via `Promise.all`, asserts `expect(allowed.length).toBe(limit)` (exactly 5) and `expect(rejected.length).toBe(parallelAttempts - limit)` — an explicit `toBe(N)` invariant assertion, not a smoke test. | closed |
| T-04-15 | Tampering (polyfill masking crypto) | TEST-01/TEST-02 | accept | `src/lib/crypto.test.ts` imports directly from `@/lib/crypto` and uses the global `crypto.getRandomValues`/`crypto.subtle` — no polyfill import (`@peculiar/webcrypto` or similar) found anywhere in the file or in `vitest.config.ts`. `vitest.config.ts` sets `test.environment: "node"` (no jsdom). Entry added to Accepted Risks Log (AR-04-03) by this audit. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

### Note on T-04-06 / T-04-10 interaction (adversarial-stance callout)

The password brute-force limiter (T-04-06) is, by the threat register's own explicit design (T-04-10), one of the rate limiters that **fails open** during a Redis/Upstash outage — an attacker who can induce or wait for an Upstash outage gets unlimited password guesses for the duration of that outage. This is not a silently-missed gap: it is the stated, deliberate consequence of T-04-10's "limiters fail-OPEN (availability), counter fails-CLOSED (never over-issues)" policy, documented in `src/lib/rate-limit.ts:1-11` module comment and now logged on every occurrence (`console.error`, WR-01 fix) so a sustained outage is observable rather than silent. Verified as an intentional, accepted, and now-observable residual — not an open gap — because: (1) the register itself declares this exact tradeoff under T-04-10 rather than treating it as an oversight, (2) the fail-open path is logged (WR-01), and (3) the alternative (failing closed on the password limiter) would take down all downloads — including password-less ones via `checkDownloadLimit`, which shares the same Redis dependency — during any Redis hiccup, which is a worse availability trade for a moderate brute-force window. No code change requested; documented here for audit-trail completeness.

### Note on code-review hardening

`04-REVIEW.md`'s 3 CRITICAL findings (CR-01/02/03) were real correctness regressions introduced by this phase's own new code (not pre-existing gaps against a previously-declared threat) — all three were fixed pre-audit (`04-REVIEW-FIX.md`; commits `60dd1e9`, `9374ded`, `7ba0d2f`) and independently re-confirmed present in the current codebase during this audit (see T-04-06/T-04-08 evidence above, plus CR-03's `blobWriteMeta({ ...meta, downloadsRemaining: 0 })` restoring cron visibility at `src/app/api/files/[id]/route.ts:84-91`, which is outside this phase's declared threat register but was verified as part of tracing T-04-08's full mitigation).

---

## Unregistered Flags

None. No `## Threat Flags` section exists in `04-01-SUMMARY.md`, `04-02-SUMMARY.md`, or `04-03-SUMMARY.md` (grep-confirmed) — the executor did not flag any new attack surface beyond the plan-time register during implementation.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|--------------|------|
| AR-04-01 | T-04-04 | `'unsafe-inline'` on `script-src`/`style-src` is required because the next-themes no-flash script and the `/sw.js` registration script are inline; nonce/strict-dynamic CSP (D-07) is deferred to a future hardening milestone. | legoshin | 2026-07-11 |
| AR-04-02 | T-04-11 | `api/cleanup` is intentionally exempt from all rate limiters — it is a low-frequency, `CRON_SECRET`-authenticated maintenance endpoint; adding a limiter would risk blocking legitimate scheduled cleanup with no security benefit (grep-confirmed no limiter import lands there). | legoshin | 2026-07-12 |
| AR-04-03 | T-04-15 | Crypto tests run against Node's built-in `globalThis.crypto.subtle` with no polyfill (D-12), so the tests exercise the exact primitive used in production rather than a shimmed substitute. | legoshin | 2026-07-12 |
| AR-04-04 | T-04-06 / T-04-10 | The password-attempt rate limiter fails OPEN during a Redis/Upstash outage, by the same deliberate "availability over strictness" policy applied to all rate limiters (T-04-10) — the atomic download counter is the invariant that fails CLOSED instead. The fail-open path is logged (`console.error`, WR-01) so a sustained outage is observable. Failing the password limiter closed would also have to fail closed on ordinary (password-less) downloads sharing the same Redis dependency, which is a worse availability trade for a bounded-duration brute-force window. | legoshin | 2026-07-12 |

*Accepted risks do not resurface in future audit runs.*

---

## Transfer / Carry-Forward Log

None outstanding. Phase 3's T-03-07 carry-forward (CSP must allowlist the Google Fonts domains) was consumed and closed by this phase — see T-04-05 evidence above (`next.config.ts:12-13`).

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|----------------|--------|------|--------|
| 2026-07-12 | 16 | 16 | 0 | Claude (gsd-security-auditor) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-12
