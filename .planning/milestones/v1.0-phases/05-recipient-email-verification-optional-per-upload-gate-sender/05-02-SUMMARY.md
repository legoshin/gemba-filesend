---
phase: 05-recipient-email-verification-optional-per-upload-gate-sender
plan: 02
subsystem: recipient-verification-endpoints
tags: [mailgun, rate-limit, upload-validation, request-code, verify-code]
dependency-graph:
  requires:
    - src/lib/verification.ts (generateSixDigitCode, storeVerificationCode, verifyCode, issueVerifyToken)
    - StoredMeta.recipientEmails
    - checkVerification() gate in GET /api/files/[id] (05-01)
  provides:
    - src/lib/mailgun.ts (mailgunBaseUrl, sendVerificationEmail)
    - POST /api/files/[id]/request-code
    - POST /api/files/[id]/verify-code
    - checkRequestCodeLimit / checkVerifyAttemptLimit (src/lib/rate-limit.ts)
    - MAX_RECIPIENT_EMAILS / normalizeRecipientEmails / recipientEmails validation (src/app/api/files/route.ts)
  affects:
    - "05-03 (upload/download UI will POST recipientEmails on upload, call request-code/verify-code, send x-verify-token)"
tech-stack:
  added: []
  patterns:
    - "Bare fetch + native FormData for Mailgun — no SDK, matching CONTEXT.md's explicit instruction"
    - "Enumeration-safe endpoint: byte-identical response regardless of membership match (Pattern 2)"
    - "Fail-loud on missing required env — explicit try/catch around the one Mailgun call site, console.error + 500, never a silent no-op"
key-files:
  created:
    - src/lib/mailgun.ts
    - src/app/api/files/[id]/request-code/route.ts
    - src/app/api/files/[id]/verify-code/route.ts
  modified:
    - src/lib/rate-limit.ts
    - src/app/api/files/route.ts
    - src/lib/storage.test.ts
decisions:
  - "request-code/verify-code route handlers return Promise<Response> (not Promise<NextResponse>) so the raw Response from the rate limiters' enforce() type-checks alongside NextResponse.json() returns — matches the existing GET /api/files/[id] handler's return type"
  - "Mailgun send wrapped in an explicit try/catch in request-code (rather than letting it propagate to Next.js's default error handler) so the fail-loud contract (500 + console.error) is deterministic and directly testable, not dependent on framework default-error-handler logging behavior"
  - "normalizeRecipientEmails collapses both undefined and empty-array to undefined — keeps the array's presence+length as the single source of truth for verifyRequired (Pitfall 5), matching 05-01's StoredMeta comment"
metrics:
  duration: "~30 min"
  completed: 2026-09-08
actuals:
  tokens: 4678
  tasks: 2
  commits: 2
status: complete
---

# Phase 5 Plan 02: Mailgun sender + request-code/verify-code endpoints + upload validation Summary

Built the recipient-facing front door on top of the 05-01 verification spine: a bare-fetch Mailgun sender, the two enumeration-safe/rate-limited endpoints (`request-code`, `verify-code`), and server-side validation + storage of recipient emails on upload in both Vercel Blob and local-fs storage modes.

## What Was Built

**Task 1 — Mailgun sender + request-code + verify-code endpoints + two rate limiters:**
- `src/lib/mailgun.ts` (new): `mailgunBaseUrl()` resolves `MAILGUN_SENDING_REGION` (default "us", case-insensitive) to `https://api.mailgun.net` or `https://api.eu.mailgun.net`. `sendVerificationEmail(toEmail, code, fileName)` reads `MAILGUN_API_KEY`/`MAILGUN_DOMAIN`/`MAILGUN_FROM`, throws a clear `Error` when any is missing, builds a native `FormData` (from/to/subject/text), and POSTs to `${base}/v3/${domain}/messages` with Basic auth. Throws on any non-OK response including the status text. No SDK, no new npm package.
- `src/lib/rate-limit.ts`: added `checkRequestCodeLimit` (env `RATE_LIMIT_REQUEST_CODE_PER_MIN`, default 1/60s, prefix `rl:rc`) and `checkVerifyAttemptLimit` (env `RATE_LIMIT_VERIFY_CODE_PER_MIN`, default 5/60s, prefix `rl:vc`), both keyed on `fileId + ":" + ip`, both reusing the existing `buildLimiter`/`enforce` machinery — no second rate-limit module.
- `src/app/api/files/[id]/request-code/route.ts` (new): rate-limits, validates the submitted email shape, reads meta for the active storage mode, computes membership against `meta.recipientEmails` (normalized lowercase/trim), and on a match generates+stores a code and calls Mailgun — wrapped in try/catch so a Mailgun/env failure surfaces as an explicit 500 + `console.error` (fail-loud, D-05-06) without ever changing the response on the non-match path. Always returns `{ sent: true }` on the success path regardless of membership, file existence, expiry, or exhaustion — no oracle.
- `src/app/api/files/[id]/verify-code/route.ts` (new): rate-limits, validates the code is a 6-digit string, calls `verifyCode()`, and on `"ok"` mints a verify-token via `issueVerifyToken()` and returns `{ verified: true, token }`; any other result (invalid/expired/locked/none/malformed) returns a generic `{ verified: false }` 403 — never distinguishes the reason.
- `src/lib/storage.test.ts`: added `mailgunBaseUrl` region-resolution cases (unset/us/eu/EU) and `sendVerificationEmail` missing-env-throws cases (each of API_KEY/DOMAIN/FROM individually, plus a "never calls fetch" assertion) — no live network calls.

**Task 2 — Accept + validate + store recipientEmails on upload (blob + fs modes):**
- `src/app/api/files/route.ts`: exported `MAX_RECIPIENT_EMAILS = 10` and `normalizeRecipientEmails(v)` (undefined/empty-array → `undefined`, else trim+lowercase every entry). Extended `validateClientMeta` with an `isValidRecipientEmailsField` check: absent is valid; otherwise must be an array of ≤10 entries, each a string matching the simple email regex within a 254-char length cap.
- Blob path: `tokenPayload.recipientEmails = normalizeRecipientEmails(payload.recipientEmails)` set in `onBeforeGenerateToken` after validation passes; `onUploadCompleted` copies `decoded.recipientEmails` into the constructed `StoredMeta`.
- fs path: `parseDirectMetaHeader` already runs the extended `validateClientMeta` over the `x-meta` payload; `handleDirectUpload` now sets `recipientEmails: normalizeRecipientEmails(meta.recipientEmails)` on the `fsWriteMeta` call.
- `src/lib/storage.test.ts`: added `validateClientMeta` recipientEmails cases (omitted, empty array, up to 10 valid, rejects >10 / non-array / malformed entry / over-length entry) and `normalizeRecipientEmails` unit cases.

## Deviations from Plan

**1. [Rule 1 - Bug] Route handler return types changed from `Promise<NextResponse>` to `Promise<Response>`**
- **Found during:** Task 1 build (`npm run build`)
- **Issue:** `checkRequestCodeLimit`/`checkVerifyAttemptLimit` return the shared limiter's raw `Response | null` (from `enforce()`), which is not assignable to `NextResponse` (missing `cookies`/`[INTERNALS]`). TypeScript build failed on `if (limited) return limited;`.
- **Fix:** Changed both new route handlers' return type annotation to `Promise<Response>` (still returns `NextResponse.json(...)` on the success paths, which is a valid `Response`) — matches the existing pattern already used by `GET /api/files/[id]` in `src/app/api/files/[id]/route.ts`.
- **Files modified:** `src/app/api/files/[id]/request-code/route.ts`, `src/app/api/files/[id]/verify-code/route.ts`
- **Commit:** 32621bc

## Verification

- `npm run test` — 62/62 tests pass (4 test files: `verification.test.ts`, `rate-limit.test.ts`, `storage.test.ts`, `crypto.test.ts`), including the new Mailgun URL/region cases, Mailgun missing-env-throws cases, and the `validateClientMeta`/`normalizeRecipientEmails` recipientEmails cases.
- `npm run build` — Next.js production build succeeds; all routes (including the two new `/api/files/[id]/request-code` and `/api/files/[id]/verify-code`) compile and typecheck clean.
- Manual read-through: `request-code` returns the identical `{ sent: true }` object on the match and non-match paths (only the internal Mailgun-call branch differs); `verify-code` never distinguishes invalid/expired/locked/none in its response body.

## Threat Flags

None — all new surface (request-code/verify-code endpoints, the Mailgun HTTP call, the widened `recipientEmails` upload validation) was already anticipated and dispositioned in this plan's `<threat_model>` (T-05-01, T-05-02, T-05-05, T-05-10, T-05-11); no new surface introduced outside that register.

## Self-Check: PASSED

- FOUND: src/lib/mailgun.ts
- FOUND: src/app/api/files/[id]/request-code/route.ts
- FOUND: src/app/api/files/[id]/verify-code/route.ts
- FOUND: src/lib/rate-limit.ts (checkRequestCodeLimit, checkVerifyAttemptLimit present)
- FOUND: src/app/api/files/route.ts (MAX_RECIPIENT_EMAILS, normalizeRecipientEmails, recipientEmails threaded into both upload paths)
- FOUND: src/lib/storage.test.ts (mailgun + recipientEmails test cases)
- FOUND commit 32621bc (Task 1)
- FOUND commit d1b1979 (Task 2)
