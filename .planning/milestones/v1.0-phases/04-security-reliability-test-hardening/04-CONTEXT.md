# Phase 4: Security, Reliability & Test Hardening - Context

**Gathered:** 2026-07-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden the already-shipped app across three fronts, plus its first automated tests:
- **SEC-01** — security response headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- **SEC-02** — per-IP rate limiting on the upload + download endpoints (abuse + password brute-force)
- **REL-01** — fix the download-counter race so concurrent downloads can never exceed the configured limit
- **TEST-01…04** — unit tests for crypto round-trip/packed format, password hash/validate, counter decrement+limit (incl. the REL-01 concurrency fix), and metadata serialization/validation

This phase clarifies HOW to implement the above. New capabilities (AES-256/PBKDF2 migration, E2E/load tests, admin dashboard, privacy page, abuse-reporting) are **v2 / out of scope** — see Deferred Ideas.
</domain>

<decisions>
## Implementation Decisions

### Rate Limiting (SEC-02)
- **D-01:** Back the per-IP limiter with **Upstash Redis** (`@upstash/ratelimit` + `@upstash/redis`) — the standard Vercel-serverless pattern, sliding-window, shared across all invocations. Adds an Upstash account + two deps + `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` env vars.
- **D-02:** **Moderate** default thresholds, exposed as env-tunable config: upload ~10/min per IP, download ~30/min per IP, password attempts ~5/min per (file + IP) with a brief lockout after. Breaches return `429` with a `Retry-After` header.
- **D-03:** In-memory / per-instance limiting is explicitly rejected (best-effort only on serverless — doesn't coordinate across instances).

### Security Headers (SEC-01)
- **D-04:** **Pragmatic, enforced CSP** (not nonce-based) set in `next.config.ts` `headers()`, enforced from day one — no Report-Only staging. Allowlist tuned for Next.js.
- **D-05:** CSP MUST allowlist **`fonts.googleapis.com`** (`style-src`) + **`fonts.gstatic.com`** (`font-src`) — carried forward from the Phase 3 security audit (T-03-07); omitting this silently breaks the Public Sans production font. Also allowlist the **Vercel Blob CDN** (`*.blob.vercel-storage.com`) on `img-src`/`connect-src` for downloads.
- **D-06:** Ship HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `frame-ancestors 'none'` alongside CSP.
- **D-07:** Nonce-based / strict-dynamic CSP is a **deferred future hardening** (would need middleware + per-request nonces), not this phase.

### Download-Counter Race (REL-01)
- **D-08:** Fix via an **atomic Redis counter**: seed a `dl:{id}` key to the file's download limit at upload time, then each download does an atomic `DECR` and rejects (410 Gone) if the result goes negative. Race-free by construction — replaces the current read-modify-write on the metadata JSON.
- **D-09:** The **live counter's source of truth moves to Redis**; the Blob/fs metadata retains the original limit (for display/expiry) but is no longer the authority for "downloads remaining."
- **D-10:** Reuses the same Upstash store added for SEC-02 (one store solves both).

### Testing (TEST-01…04)
- **D-11:** Use **Vitest** as the project's first test runner (fast, ESM/TS-native, minimal config on Next 16). Add `vitest` + a `test` script.
- **D-12:** Crypto tests run against Node's built-in **Web Crypto** (`globalThis.crypto.subtle`, Node 18+) — no polyfill.
- **D-13:** Counter/concurrency tests (TEST-03) use an **in-memory Redis fake** so tests stay hermetic and fast (no live Upstash); the concurrency test fires N parallel decrements and asserts the limit is never exceeded.
- **D-14:** Tests target the **current** crypto (AES-128-GCM + SHA-256) — the AES-256/PBKDF2 migration is v2, so no migration tests here.

### Claude's Discretion (planner/researcher)
- Exact IP-detection source on Vercel (`x-forwarded-for` handling), the precise `@upstash/ratelimit` algorithm config, CSP directive fine-tuning to whatever Next 16/Turbopack actually needs at runtime, Redis key TTL/expiry alignment with file expiry, and test file/dir layout.
- Local-dev Redis story: prefer a documented Upstash-creds path; if unset, a single-instance fallback is acceptable for dev (concurrency correctness is verified via the hermetic fake, not local dev).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 4: Security, Reliability & Test Hardening" — goal + 4 success criteria (SEC-01, SEC-02, REL-01, TEST-01..04)
- `.planning/REQUIREMENTS.md` §Security/Reliability/Testing — SEC-01, SEC-02, REL-01, TEST-01…04 (and the v2 list that is explicitly out of scope)

### Locked security carry-forward (MUST honor)
- `.planning/phases/03-download-page-redesign-dark-mode-complete/03-SECURITY.md` §Transfer/Carry-Forward Log — **T-03-07**: the CSP must allowlist `fonts.googleapis.com` (`style-src`) + `fonts.gstatic.com` (`font-src`) or the Public Sans production fix breaks. This is the single most important cross-phase constraint for SEC-01.

### Project constraints
- `CLAUDE.md` (repo root) — encryption boundary must not weaken (key stays in URL fragment); platform parity across web/PWA/Android TWA; reuse-first; Next.js 16 / React 19 / Tailwind 4 stack.

### Implementation touch-points (from codebase scout)
- `next.config.ts` — currently empty; SEC-01 headers land here.
- `src/app/api/files/route.ts` (POST upload) — seed the Redis counter (`dl:{id}`) here; add upload rate limiting.
- `src/app/api/files/[id]/route.ts` — the read-modify-write counter (lines ~47-60 blob path, ~99-110 fs path) that REL-01 replaces with atomic `DECR`; add download + password-attempt rate limiting.
- `src/lib/crypto.ts` — TEST-01/02 target (encrypt/decrypt round-trip, packed format, password hash/validate).
- `src/lib/storage.ts` + `validateClientMeta()` — TEST-04 target (metadata serialization/validation).
- `src/app/api/cleanup/route.ts` — the Vercel Cron endpoint; keep it EXEMPT from rate limiting (it authenticates via `CRON_SECRET`).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Storage abstraction** (`src/lib/storage.ts`, `blob-storage.ts`, `server-storage.ts`): dual-mode dispatcher — the counter seeding/reset must work in both Blob (prod) and fs (dev) modes, but with Redis as the live counter the storage layer only holds the original limit.
- **`crypto.ts` named exports** (`encryptPacked`/`decryptPacked`/`generateKey`/hashing): pure, leaf-module functions — directly unit-testable with no mocking.
- **`validateClientMeta()`**: existing metadata type-guard — the pattern TEST-04 verifies and extends.

### Established Patterns
- **Env-based config** (`getStorageMode()`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`): add `UPSTASH_REDIS_REST_URL`/`TOKEN` + rate-limit threshold env vars the same way; validate presence at startup.
- **Stateless API + structured JSON responses** with proper HTTP status codes: rate-limit rejections use `429` + `Retry-After`; exhausted counter uses `410 Gone` (already the convention).
- **No test infra today** — Vitest config + `test` script are net-new; establishes the project testing baseline (INFR/TEST foundation).

### Integration Points
- `next.config.ts` `headers()` → SEC-01.
- A new Redis client module (e.g. `src/lib/redis.ts`) + a rate-limit helper (e.g. `src/lib/rate-limit.ts`) consumed by the two API routes → SEC-02.
- Counter seed at upload (`api/files/route.ts`) + atomic `DECR` at download (`api/files/[id]/route.ts`) → REL-01.
- `vitest.config.ts` + `src/**/*.test.ts` (or `tests/`) → TEST-01…04.

</code_context>

<specifics>
## Specific Ideas

- One shared Upstash Redis store deliberately serves BOTH SEC-02 (rate limiting) and REL-01 (atomic counter) — a single piece of new infra closes two requirements.
- Rate-limit responses should be honest to clients: `429` + `Retry-After` so a legitimate heavy user can back off gracefully.
- CSP must be verified to NOT break: (a) service-worker registration (`/sw.js`), and (b) the Android TWA (custom-tab based, so `frame-ancestors 'none'` + `X-Frame-Options: DENY` are TWA-safe) — platform parity constraint.

</specifics>

<deferred>
## Deferred Ideas

These surfaced or are adjacent but belong to a future milestone (v2), not Phase 4:
- **CRYP-01** AES-256-GCM migration + **CRYP-02** PBKDF2/Argon2 password hashing — needs a dedicated crypto-migration milestone.
- **QUAL-01** Playwright E2E (upload→share→download, password/expiry/limit) + **QUAL-02** load/stress tests — this phase is unit tests only.
- **OPS-01** admin dashboard, **OPS-02** hosted privacy-policy page, **OPS-03** abuse-reporting flow.
- **Nonce-based / strict-dynamic CSP** — future hardening beyond the pragmatic enforced CSP shipped here.

</deferred>

---

*Phase: 04-security-reliability-test-hardening*
*Context gathered: 2026-07-11*
