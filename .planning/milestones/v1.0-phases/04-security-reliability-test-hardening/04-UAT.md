---
status: testing
phase: 04-security-reliability-test-hardening
source: [04-VERIFICATION.md]
started: 2026-07-11T21:45:00Z
updated: 2026-07-11T21:45:00Z
---

## Current Test

number: 1
name: Live Upstash rate-limit + atomic counter behavior at deploy
expected: |
  With UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN set in the deploy environment:
  (1) the (limit+1)-th upload/download from one IP within a minute returns 429 + Retry-After;
  (2) password guesses past RATE_LIMIT_PASSWORD_PER_MIN return 429 only for password-protected files;
  (3) the (N+1)-th download of a limit-N file returns 410 Gone;
  (4) N concurrent downloads against a live store yield exactly N successes.
awaiting: user response

## Tests

### 1. Live Upstash rate-limit + atomic counter behavior at deploy
expected: 429 + Retry-After past thresholds; password limiter only on password-protected files; 410 Gone on the (N+1)-th download; N concurrent downloads yield exactly N successes.
setup: Create an Upstash Redis DB, set UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (+ optional RATE_LIMIT_* threshold vars) in the Vercel deploy env, then deploy.
result: [pending]

### 2. Cross-platform CSP regression (web / PWA / Android TWA)
expected: Public Sans font renders; next-themes light/dark toggle works with no CSP console errors; /sw.js registers and reaches "active"; Vercel Blob presigned-URL downloads succeed; Android TWA custom-tab flow unaffected by frame-ancestors 'none' + X-Frame-Options: DENY.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
