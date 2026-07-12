---
phase: 04-security-reliability-test-hardening
plan: 03
subsystem: testing
tags: [vitest, unit-tests, crypto, aes-128-gcm, sha-256, redis-fake, concurrency, rel-01]

# Dependency graph
requires:
  - phase: 04-security-reliability-test-hardening
    provides: "04-02 injectable-client counter primitives (seedDownloadCounter/decrementDownloadCounter with optional RedisLike client) + the dl:{id} atomic-counter design under test"
provides:
  - "Vitest as the project's first test runner (node env, @ alias, no Web Crypto polyfill) + npm test script (D-11)"
  - "TEST-01: crypto encrypt/decrypt round-trip + [12-byte IV][ciphertext+tag] packed-format regression tests"
  - "TEST-02: sha256Hex password hash/validate tests mirroring checkPassword's composition"
  - "TEST-03: hermetic in-memory-Redis-fake concurrency regression proving N parallel decrements never exceed the seeded limit (the direct REL-01 guard)"
  - "TEST-04: validateClientMeta branch-coverage matrix + StoredMeta JSON round-trip"
  - "validateClientMeta + MAX_DOWNLOADS/MAX_EXPIRY_MS/MAX_BLOB_BYTES promoted to named exports (no logic change)"
affects: [future-crypto-migration, ci]

# Tech tracking
tech-stack:
  added:
    - "vitest 4.1.10 — first project test runner (dev dependency)"
    - "@vitest/coverage-v8 4.1.10 — v8 coverage provider (dev dependency)"
  patterns:
    - "Co-located *.test.ts next to the module under test (src/lib/crypto.test.ts, src/lib/storage.test.ts)"
    - "Hermetic in-memory Redis fake injected via the counter's optional client arg — no live Upstash, no UPSTASH_* env (D-13)"
    - "Crypto tested against Node's built-in globalThis.crypto.subtle with NO polyfill (D-12)"
    - "vitest.config.ts @ alias mirrors tsconfig paths so tests resolve @/ imports"

key-files:
  created:
    - vitest.config.ts
    - src/lib/crypto.test.ts
    - src/lib/storage.test.ts
  modified:
    - package.json
    - package-lock.json
    - src/app/api/files/route.ts

key-decisions:
  - "vitest.config.ts adds a resolve.alias for @ → ./src because Vitest does not read tsconfig paths by default (the initial run failed with 'Cannot find package @/lib/crypto')"
  - "validateClientMeta + the three MAX_* bounds promoted to named exports so TEST-04 imports the real predicate rather than a copy — no behavioral change"
  - "TEST-03 uses a fresh in-memory Redis fake per test (isolation) matching the exact { set(nx/ex), decr } surface the counter consumes; concurrency asserted as an explicit toBe(N) on the allowed count"

patterns-established:
  - "Co-located unit tests (module.test.ts) as the project convention"
  - "Hermetic dependency injection for infra primitives (fake Redis client) instead of live-service tests"

requirements-completed: [TEST-01, TEST-02, TEST-03, TEST-04]

# Metrics
duration: ~10min
completed: 2026-07-11
---

# Phase 4 Plan 3: Vitest Unit Test Suite Summary

**Established Vitest as the project's first test runner and shipped 27 passing unit tests covering the AES-128-GCM crypto round-trip + packed format (TEST-01), SHA-256 password hash/validate (TEST-02), the REL-01 download-counter concurrency fix via a hermetic in-memory Redis fake (TEST-03), and validateClientMeta branch coverage + StoredMeta JSON round-trip (TEST-04).**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-11T19:58:00Z
- **Completed:** 2026-07-11T20:08:26Z
- **Tasks:** 3 (1 blocking-human supply-chain checkpoint + 2 code tasks)
- **Files created:** 3 · **modified:** 3

## Accomplishments

- **Vitest baseline (D-11):** `vitest` + `@vitest/coverage-v8` (both 4.1.10, verified on npmjs.com via the blocking-human checkpoint) added as devDependencies, `"test": "vitest run"` script added, and `vitest.config.ts` created — node test environment, `include: ["src/**/*.test.ts"]`, `@` → `./src` alias, and no Web Crypto polyfill (D-12).
- **`src/lib/crypto.test.ts` (TEST-01 + TEST-02, 12 tests):** encrypt/decrypt round-trip across payload sizes (1 B / 16 B / 8 KB); packed format asserted as `[12-byte IV][ciphertext + 16-byte GCM tag]` with exact total length; random-IV uniqueness (two encryptions of the same input differ); `<= 12`-byte payload rejected with "payload too short"; wrong-key and tampered-ciphertext both throw (auth-tag failure); `sha256Hex(password + salt)` is stable, matches on the correct password, and mismatches on a wrong one — mirroring `checkPassword`'s composition. Runs against Node's built-in `globalThis.crypto.subtle`, no polyfill, no mocking.
- **`src/lib/storage.test.ts` (TEST-04 + TEST-03, 15 tests):** `validateClientMeta` matrix — accepts a valid payload and boundary values at `MAX_DOWNLOADS`/`MAX_BLOB_BYTES`/`MAX_EXPIRY_MS`, and rejects each invalid branch (non-string name/type, size ≤ 0, size > max, downloadsRemaining < 1, > max, expiresAt in the past, beyond max, wrong-typed fields); `StoredMeta` survives `JSON.parse(JSON.stringify(...))` both with and without optional `passwordHash`/`salt`/`blobUrl`. For TEST-03, an in-memory Redis fake (fresh per test, exact `{ set(nx/ex), decr }` surface) is injected via the counter's optional `client` arg — the sequential test proves the counter goes negative after N calls, and the REL-01 regression fires 20 parallel `decrementDownloadCounter` calls via `Promise.all` against a seeded limit of 5 and asserts **exactly 5** succeed (`>= 0`) with the rest rejected — the limit is never exceeded and the counter never drifts below `-(M - N)`.
- **`validateClientMeta` + `MAX_*` bounds promoted to named exports** in `src/app/api/files/route.ts` (no logic change) so TEST-04 exercises the real predicate.

## Task Commits

1. **Task 1: vitest + @vitest/coverage-v8 devDependencies (checkpoint-approved) + test script** — `a13351e` (chore)
2. **Task 2: Vitest config + crypto round-trip / packed-format / password tests (TEST-01, TEST-02)** — `cfce721` (test)
3. **Task 3: metadata validation + REL-01 counter/concurrency tests (TEST-04, TEST-03)** — `70c4041` (test)

**Plan metadata:** (final commit) — `docs(04-03): complete Vitest unit-test-suite plan`

_Note: this was a `type: tdd` plan, but the tests are characterization/regression tests over already-shipped (crypto/metadata) and just-shipped (04-02 counter) behavior — they were expected to pass green immediately, so there is no failing-RED commit; each behavior was locked in as it was authored._

## Files Created/Modified

- `vitest.config.ts` — Vitest config: node env, `src/**/*.test.ts` include, `@ → ./src` alias, no polyfill (D-12).
- `src/lib/crypto.test.ts` — TEST-01 (round-trip + packed format + auth-tag failures) and TEST-02 (SHA-256 password hash/validate). 12 tests.
- `src/lib/storage.test.ts` — TEST-04 (validateClientMeta matrix + StoredMeta JSON round-trip) and TEST-03 (in-memory-Redis-fake counter + parallel concurrency regression). 15 tests.
- `package.json` — `"test": "vitest run"` script + `vitest` / `@vitest/coverage-v8` devDependencies.
- `package-lock.json` — locked the new dev dependency tree.
- `src/app/api/files/route.ts` — `validateClientMeta` and `MAX_DOWNLOADS`/`MAX_EXPIRY_MS`/`MAX_BLOB_BYTES` made named exports (no behavior change).

## Decisions Made

- **`@` alias in vitest.config.ts:** the first run failed with `Cannot find package '@/lib/crypto'` — Vitest does not consume tsconfig `paths` by default, so a `resolve.alias` for `@` → `./src` was added. This is the minimal, conventional fix (no extra plugin).
- **Export the real `validateClientMeta`** rather than duplicate its logic in the test, per the plan's instruction and reuse-first — the type-predicate stays the single source of truth.
- **Fresh fake per test + explicit `toBe(N)`** on the allowed-count so the concurrency test is a real regression guard for REL-01, not a smoke test (T-04-14).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `resolve.alias` for `@` in vitest.config.ts**
- **Found during:** Task 2 (first `npx vitest run`)
- **Issue:** Vitest resolved `@/lib/crypto` as a bare package and failed with "Cannot find package '@/lib/crypto'" — Vitest does not read tsconfig `paths` out of the box.
- **Fix:** Added `resolve: { alias: { "@": path.resolve(__dirname, "./src") } }` to `vitest.config.ts`, mirroring the tsconfig path alias.
- **Files modified:** `vitest.config.ts`
- **Verification:** `npx vitest run src/lib/crypto.test.ts` → 12/12 pass; full suite 27/27.
- **Committed in:** `cfce721` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** The alias is required for any `@/`-importing test to resolve — a correctness prerequisite for the whole suite. No scope creep.

## Issues Encountered

None beyond the alias fix above. `npx tsc --noEmit` → 0 errors; `npm run build` → success (the pre-existing multi-lockfile workspace-root warning is unrelated); `npm run lint` → 0 errors (the same 4 pre-existing warnings in `last-ndc.ts` / `Radio.jsx` / `icon-data.js` noted in 04-02, all out of scope).

## Encryption Boundary

Untouched. The tests exercise the existing AES-128-GCM + SHA-256 primitives (D-14 — current crypto, no AES-256/PBKDF2 migration tests) against the real `crypto.subtle`; no key ever leaves the client model and no server-side crypto path was altered.

## User Setup Required

None - no external service configuration required. TEST-03 is hermetic (in-memory fake), so `npm test` needs no Upstash creds.

## Next Phase Readiness

- Phase 4 success criterion 4 (automated unit tests exist and pass) is met: `npm test` runs 27 green tests covering TEST-01…04. This is the last plan of Phase 4 (3 of 3).
- CI can now run `npm test` as a gate. Future crypto-migration work (v2 AES-256/PBKDF2) has a green baseline to migrate against.
- No blockers.

---
*Phase: 04-security-reliability-test-hardening*
*Completed: 2026-07-11*

## Self-Check: PASSED

- FOUND: vitest.config.ts
- FOUND: src/lib/crypto.test.ts
- FOUND: src/lib/storage.test.ts
- FOUND: commit a13351e (deps + test script), cfce721 (Task 2), 70c4041 (Task 3)
- VERIFIED: `npm test` → 27/27 passing
