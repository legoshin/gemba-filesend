# Phase 4: Security, Reliability & Test Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-11
**Phase:** 4-security-reliability-test-hardening
**Areas discussed:** Rate-limit store & limits, CSP strictness & rollout, Counter-race fix, Test runner & scope

---

## Rate-limit store (SEC-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Upstash Redis | `@upstash/ratelimit` + `@upstash/redis`; sliding-window per IP, shared across invocations; also yields atomic DECR for REL-01 | ✓ |
| Vercel Firewall (native) | Edge platform rate-limiting, no code store; coarser per-endpoint control; no help for the counter race | |
| In-memory (best-effort) | Per-instance Map; resets per cold start, no cross-instance coordination | |

**User's choice:** Upstash Redis (Recommended)
**Notes:** One store deliberately closes both SEC-02 and REL-01.

## Rate-limit thresholds (SEC-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Moderate | upload 10/min, download 30/min, password 5/min per (file+IP) + brief lockout; 429 + Retry-After | ✓ |
| Strict | upload 5/min, download 15/min, password 3 → exponential backoff | |
| Decide in planning | Capture "moderate, tunable via env" and let planner set values | |

**User's choice:** Moderate (Recommended)
**Notes:** Values to be exposed as env-tunable config.

## CSP strictness & rollout (SEC-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Pragmatic, enforce now | Allowlist CSP tuned for Next.js in next.config headers(), enforced day one, + HSTS/X-Frame/X-Content-Type | ✓ |
| Strict nonce-based, Report-Only → enforce | Per-request nonces/strict-dynamic via middleware; ship Report-Only then flip | |
| Report-Only first | All headers enforced except CSP (Report-Only observe) | |

**User's choice:** Pragmatic, enforce now (Recommended)
**Notes:** Must allowlist Google Fonts (T-03-07 carry-forward) + Blob CDN. Nonce-based upgrade deferred.

## Counter-race fix (REL-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Atomic Redis counter | Seed `dl:{id}` at upload; each download `DECR`, reject if negative; race-free; metadata keeps original limit | ✓ |
| Redis lock around the write | Keep counter in metadata, serialize read-modify-write with a Redis lock | |
| Storage-layer CAS (no Redis) | fs lockfile + Blob conditional write — Blob has no native CAS (fragile prod path) | |

**User's choice:** Atomic Redis counter (Recommended)
**Notes:** Live-count source of truth moves to Redis; verified by TEST-03 concurrency test.

## Test runner & scope (TEST-01…04)

| Option | Description | Selected |
|--------|-------------|----------|
| Vitest | Fast, ESM/TS-native, minimal config on Next 16; Web Crypto via Node; in-memory Redis fake for hermetic counter tests | ✓ |
| Jest | Mature but heavier ESM/TS/Web-Crypto setup on an all-ESM Next 16 project | |
| node:test | Zero-dep built-in; thinner mocking/assertion DX | |

**User's choice:** Vitest (Recommended)
**Notes:** Tests target current crypto (AES-128-GCM + SHA-256); AES-256/PBKDF2 is v2.

## Final gate

| Option | Description | Selected |
|--------|-------------|----------|
| Ready for context | Lock the four decisions into CONTEXT.md | ✓ |
| Explore more gray areas | Discuss a further implementation decision first | |

**User's choice:** Ready for context

---

## Claude's Discretion

- IP-detection source on Vercel (`x-forwarded-for`), exact `@upstash/ratelimit` algorithm config, CSP directive fine-tuning to Next 16/Turbopack runtime needs, Redis key TTL alignment with file expiry, test file/dir layout.
- Local-dev Redis story: documented Upstash-creds path preferred; single-instance dev fallback acceptable (concurrency verified via hermetic fake).

## Deferred Ideas

- CRYP-01 (AES-256-GCM) + CRYP-02 (PBKDF2/Argon2) — v2 crypto-migration milestone.
- QUAL-01 (Playwright E2E) + QUAL-02 (load/stress) — this phase is unit tests only.
- OPS-01 (admin dashboard), OPS-02 (privacy page), OPS-03 (abuse-reporting) — v2.
- Nonce-based / strict-dynamic CSP — future hardening beyond the pragmatic enforced CSP.
