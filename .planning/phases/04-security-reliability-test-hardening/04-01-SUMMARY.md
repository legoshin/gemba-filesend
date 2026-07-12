---
phase: 04-security-reliability-test-hardening
plan: 01
subsystem: infra
tags: [nextjs, csp, security-headers, hsts]

# Dependency graph
requires:
  - phase: 03-download-page-redesign-dark-mode-complete
    provides: "T-03-07 carry-forward constraint (Public Sans font must survive any future CSP)"
provides:
  - "Enforced Content-Security-Policy on every app response"
  - "HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff on every app response"
  - "CSP allowlist contract (fonts.googleapis.com, fonts.gstatic.com, *.blob.vercel-storage.com) later phases must preserve"
affects: [04-02, 04-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Security headers set once in next.config.ts headers() (source: '/(.*)'), not per-route or via middleware"

key-files:
  created: []
  modified: [next.config.ts]

key-decisions:
  - "Pragmatic enforced CSP (no nonce, no Report-Only) per D-04 — 'unsafe-inline' accepted for next-themes + /sw.js inline scripts, nonce hardening deferred (D-07)"
  - "CSP allowlists fonts.googleapis.com (style-src) + fonts.gstatic.com (font-src) — non-negotiable carry-forward from Phase 3 T-03-07"
  - "CSP allowlists *.blob.vercel-storage.com on img-src + connect-src for the presigned blob download fetch"

patterns-established:
  - "next.config.ts headers() is the single source of truth for app-wide response headers; future phases (rate limiting, etc.) should not duplicate CSP/security headers elsewhere"

requirements-completed: [SEC-01]

# Metrics
duration: 8min
completed: 2026-07-11
---

# Phase 4 Plan 1: Enforced Security Headers Summary

**Enforced CSP + HSTS + X-Frame-Options: DENY + X-Content-Type-Options: nosniff shipped via Next.js `headers()`, with the Google Fonts and Vercel Blob CDN allowlists required to keep the Public Sans font, service worker, and downloads working.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-11T19:32:00Z
- **Completed:** 2026-07-11T19:39:59Z
- **Tasks:** 1 (+ 1 checkpoint)
- **Files modified:** 1

## Accomplishments
- `next.config.ts` now exports an async `headers()` returning a single `/(.*)` entry that sets `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, and `X-Content-Type-Options` on every response.
- CSP is a pragmatic, enforced (non-Report-Only, non-nonce) policy per D-04, with `style-src`/`font-src` allowlisting `fonts.googleapis.com`/`fonts.gstatic.com` (T-03-07 carry-forward) and `img-src`/`connect-src` allowlisting `*.blob.vercel-storage.com` (D-05).
- `frame-ancestors 'none'` + `X-Frame-Options: DENY` close the clickjacking gap (T-04-01); HSTS closes the protocol-downgrade gap (T-04-02); `X-Content-Type-Options: nosniff` closes the MIME-sniffing gap (T-04-03).
- Verified via headless-Chrome automation (Puppeteer against local Chrome) that `/`, `/upload`, and `/download` produce **zero** CSP console violations, the Public Sans font is the active computed `font-family`, and the service worker registers and reaches `active` state on all three pages.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the enforced security headers to next.config.ts (SEC-01, D-04/D-05/D-06)** - `c884c33` (feat)

**Plan metadata:** (this commit) — `docs(04-01): complete enforced security headers plan`

## Files Created/Modified
- `next.config.ts` - Populated the previously-empty `nextConfig` stub with an async `headers()` block applying CSP, HSTS, X-Frame-Options, and X-Content-Type-Options to every response.

## Decisions Made
- Followed the plan's D-04/D-05/D-06 directives exactly: pragmatic enforced CSP (no nonce, no Report-Only), `'unsafe-inline'` accepted for `script-src`/`style-src` (next-themes no-flash script + `/sw.js` registration script + Tailwind inline styles), font-CDN and blob-CDN allowlists as specified, HSTS with `preload`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `frame-ancestors 'none'`.
- No new npm packages, no new env vars — matches the plan's stated scope.

## Deviations from Plan

None — plan executed exactly as written. `next.config.ts` was touched only; no other files were modified.

## Checkpoint Handling

The plan's `checkpoint:human-verify` (gate=`blocking`) required confirming zero CSP regressions across web/PWA/Android TWA (fonts, theme, service worker, downloads). Because auto-mode was active for this session (`workflow._auto_chain_active=true`) and this checkpoint is not a package-legitimacy gate, it auto-approves per the auto-mode checkpoint protocol. Before auto-approving, the following automated verification was performed and passed:

1. `npm run build` — exits 0, all routes compile and type-check.
2. `npm start` + `curl -sI http://localhost:3000/` — confirms all four headers present with the correct allowlist values on a real HTTP response.
3. Headless-Chrome (Puppeteer, local Google Chrome) load of `/`, `/upload`, `/download` with console/pageerror listeners — **zero** console errors and **zero** CSP violation messages (`Refused to…`) on any of the three pages.
4. Computed `document.body` `font-family` on all three pages resolves to `"Public Sans", ...` (not a fallback) — confirms the T-03-07 regression did not recur.
5. `navigator.serviceWorker.getRegistration('/')` reports `active` on all three pages — confirms `/sw.js` registration is not CSP-blocked.

Not independently verified in this automated pass (deferred to a real device/browser session per the plan's original checkpoint text, since they require actual TWA packaging or a live theme-toggle click, which are outside this automated harness's reach):
- Live Android TWA custom-tab rendering (the plan's own analysis states `frame-ancestors 'none'` + `X-Frame-Options: DENY` are custom-tab-safe by construction, since no iframe embedding is used).
- An actual manual click of the light/dark/system theme toggle (the absence of any console error from the next-themes inline script, which ran on every page load per point 3 above, is the direct proxy for "not CSP-blocked").
- A live end-to-end download against a real Vercel Blob presigned URL (the CSP `connect-src`/`img-src` allowlist for `*.blob.vercel-storage.com` was verified by source inspection and the plan's own threat-model reasoning, not a live blob fetch, since no test file/deployment was available in this local dev session).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`next.config.ts`'s `headers()` block is now the single source of truth for app-wide security headers. Plans 04-02 (rate limiting) and 04-03 (counter race / tests) do not touch this file and have no dependency on it beyond the general "app is now hardened at the header layer" baseline. No blockers for subsequent plans in this phase.

---
*Phase: 04-security-reliability-test-hardening*
*Completed: 2026-07-11*

## Self-Check: PASSED

- FOUND: next.config.ts
- FOUND: .planning/phases/04-security-reliability-test-hardening/04-01-SUMMARY.md
- FOUND: c884c33 (task commit)
