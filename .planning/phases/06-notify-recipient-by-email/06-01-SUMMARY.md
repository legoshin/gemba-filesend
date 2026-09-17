---
phase: 06-notify-recipient-by-email
plan: 01
subsystem: api
tags: [mailgun, upstash-ratelimit, nextjs-route-handler, email-notification]

# Dependency graph
requires:
  - phase: 05-recipient-verification
    provides: recipientEmails plumbing (parseRecipientEmails, useVerify toggle, MAX_RECIPIENT_EMAILS/EMAIL_RE pattern, sendVerificationEmail/mailgun.ts, rate-limit.ts sliding-window limiter pattern)
provides:
  - "sendShareNotificationEmail(toEmail, links) in mailgun.ts — per-recipient share notification sender"
  - "checkNotifyLimit(ip) in rate-limit.ts — per-IP notify throttle"
  - "POST /api/notify + exported validateNotifyBody(body, requestOrigin) — validate -> rate-limit -> per-recipient Mailgun send -> fail-loud 500"
  - "upload page notify POST call site (isolated try/catch, links built from all collected results)"
affects: [06-02-notify-toggle-ui, 06-03-e2e-verification]

# Actuals (#2632)
actuals:
  tokens: 4200
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-route local email-validation constants (MAX_EMAIL_LENGTH/EMAIL_RE) mirrored, not cross-imported, matching request-code/route.ts precedent."
    - "Pure exported validator (validateNotifyBody) returning a discriminated {ok:true,...}|{ok:false,reason} result, unit-testable without mocking NextRequest — mirrors validateClientMeta in files/route.ts."
    - "Same-origin link allowlist (parsed URL .origin === request origin) as an anti-open-relay mitigation for any endpoint that relays a client-supplied URL via email."

key-files:
  created:
    - src/app/api/notify/route.ts
    - src/app/api/notify/route.test.ts
    - src/lib/mailgun.test.ts
  modified:
    - src/lib/mailgun.ts
    - src/lib/rate-limit.ts
    - src/lib/rate-limit.test.ts
    - src/app/upload/page.tsx

key-decisions:
  - "Task 1 (tracer) and Task 2 (hardening) both executed in this plan; the interactive-mode tracer human-verify checkpoint was skipped on explicit orchestrator direction (see Deviations) rather than paused for user confirmation."
  - "validateNotifyBody defines its own local MAX_RECIPIENTS/MAX_EMAIL_LENGTH/EMAIL_RE constants in route.ts rather than importing from files/route.ts, matching the existing per-route duplication precedent in request-code/route.ts."
  - "Link URLs are capped at 2048 chars and must match request.nextUrl.origin exactly (protocol+host+port) — rejects any off-origin link, closing the open-relay/phishing vector named in the plan's threat model (T-06-02)."

patterns-established:
  - "Notify-style endpoints that relay a client-supplied link via email should validate url.origin === requestOrigin before ever handing it to an outbound sender."

requirements-completed: [NOTIFY-04, NOTIFY-05, NOTIFY-06, NOTIFY-07]

coverage:
  - id: D1
    description: "sendShareNotificationEmail() sends one Mailgun email per recipient, mirroring sendVerificationEmail's bare-fetch/FormData/fail-loud pattern."
    requirement: "NOTIFY-04"
    verification:
      - kind: unit
        ref: "src/lib/mailgun.test.ts#sendShareNotificationEmail (D-06-02 fail-loud)"
        status: pass
      - kind: unit
        ref: "npm run build (type-checks call site + signature)"
        status: pass
    human_judgment: false
  - id: D2
    description: "checkNotifyLimit() throttles /api/notify per-IP via the shared Upstash sliding-window limiter pattern, failing open when Upstash creds are unset."
    requirement: "NOTIFY-07"
    verification:
      - kind: unit
        ref: "src/lib/rate-limit.test.ts#checkNotifyLimit (Phase 6) > allows (returns null) when Upstash creds are unset (dev fail-open)"
        status: pass
    human_judgment: false
  - id: D3
    description: "POST /api/notify validates recipients (1..10, email format/length) and links (non-empty, absolute http(s), <=2048 chars, same-origin) via exported validateNotifyBody, returning 400 on any violation."
    requirement: "NOTIFY-07"
    verification:
      - kind: unit
        ref: "src/app/api/notify/route.test.ts#validateNotifyBody (T-06-01, T-06-02) (13 assertions covering valid/empty/over-cap/malformed/off-origin/non-http(s) cases)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The notify loop sends exactly one Mailgun call per recipient (never a shared To/CC) and each call's body enumerates every link in the request."
    requirement: "NOTIFY-04"
    verification:
      - kind: unit
        ref: "src/app/api/notify/route.ts POST handler — for..of loop over result.recipients, one sendShareNotificationEmail(recipient, result.links) call per iteration (code inspection + type-check)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Upload success handler POSTs the real upload link(s) to /api/notify in an isolated try/catch that cannot roll back the upload result on failure; links are built by mapping over all collected results (multi-file safe)."
    requirement: "NOTIFY-06"
    verification:
      - kind: unit
        ref: "npm run build (type-checks the handleUpload notify block); manual grep confirms fetch(\"/api/notify\") is inside its own try/catch after the outer try's toast.success"
        status: pass
    human_judgment: true
    rationale: "A live end-to-end send (real Mailgun delivery, encrypted vs unencrypted-fallback link rendering, non-blocking toast on failure) requires an actual deploy with configured Mailgun/Upstash env vars and a real inbox — deferred to the 06-03 human-verify gate per the plan's own <verification> section."

# Metrics
duration: 25min
completed: 2026-09-17
status: complete
---

# Phase 06 Plan 01: Notify Server Path + Tracer Summary

**Server-side notify path wired end-to-end (mailgun.ts sender, rate-limit.ts throttle, POST /api/notify with same-origin link validation) and hooked into the upload success handler.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-17T15:52:14Z
- **Completed:** 2026-09-17T16:50:03+01:00
- **Tasks:** 2
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments
- `sendShareNotificationEmail(toEmail, links)` added to `src/lib/mailgun.ts`, mirroring `sendVerificationEmail` — bare fetch + FormData, fail-loud on missing Mailgun env vars or a non-OK Mailgun response, one recipient per call.
- `checkNotifyLimit(ip)` added to `src/lib/rate-limit.ts` — per-IP sliding-window throttle (`RATE_LIMIT_NOTIFY_PER_MIN`, default 10/min, prefix `rl:nt`), fail-open on Upstash outage/no-creds, matching every other limiter in the file.
- `POST /api/notify` (new route) validates the body via exported `validateNotifyBody(body, requestOrigin)`, rate-limits by IP, sends one Mailgun email per recipient enumerating every link, and returns HTTP 500 + `console.error` on any Mailgun throw.
- `validateNotifyBody` closes the open-relay risk named in the plan's threat model: every link `url` must parse as an absolute `http(s)` URL, be `<=2048` chars, and have an origin exactly equal to the request's origin — an attacker cannot use the endpoint to email an arbitrary off-origin phishing link.
- Upload page (`src/app/upload/page.tsx`) POSTs the real collected share link(s) to `/api/notify` right after a successful upload, in its own try/catch that is fully isolated from the outer upload try/catch — a notify failure surfaces a non-blocking `toast.error` and the upload result still renders.
- 84/84 tests pass (13 new `validateNotifyBody` cases, 4 new `sendShareNotificationEmail`/`mailgunBaseUrl` cases, 1 new `checkNotifyLimit` fail-open case), `npm run build` and `npm run lint` clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end "notify one recipient of the real link" — tracer** - `0867195` (feat)
2. **Task 2: Harden /api/notify validation + per-recipient/multi-link guarantees + tests** - `a5d2ed2` (feat)

_Both tasks landed real, production-quality code — the tracer was never a throwaway; Task 2 hardened it in place._

## Files Created/Modified
- `src/lib/mailgun.ts` - added `sendShareNotificationEmail(toEmail, links)`
- `src/lib/rate-limit.ts` - added `notifyLimiter`/`getNotifyLimiter()`/`checkNotifyLimit(ip)`
- `src/app/api/notify/route.ts` (new) - `POST` handler + exported `validateNotifyBody`
- `src/app/api/notify/route.test.ts` (new) - 13 `validateNotifyBody` unit tests
- `src/lib/mailgun.test.ts` (new) - `sendShareNotificationEmail` env-guard tests + `mailgunBaseUrl` smoke check
- `src/lib/rate-limit.test.ts` - added `checkNotifyLimit` dev fail-open test
- `src/app/upload/page.tsx` - notify POST call site in `handleUpload`'s success branch

## Decisions Made
- Mirrored `request-code/route.ts`'s pattern of defining local `MAX_EMAIL_LENGTH`/`EMAIL_RE` constants in `notify/route.ts` rather than importing them from `files/route.ts` (those two constants aren't exported there; only `MAX_RECIPIENT_EMAILS` is, and no other route currently imports across route files for these small predicates) — consistent with existing codebase convention.
- Bounded link URLs at 2048 chars and required an exact origin match (`parsed.origin === requestOrigin`) as the open-relay mitigation called for in the plan's threat register (T-06-02), using `req.nextUrl.origin` as the trusted comparison value.
- `mailgun.test.ts` includes one lightweight `mailgunBaseUrl` smoke assertion (not a full duplicate of the four-case region suite already in `storage.test.ts`) since the plan asked the new file to "assert mailgunBaseUrl still resolves us/eu correctly ... without duplication."

## Deviations from Plan

### Process deviation (orchestrator-directed, not a Rule 1-4 code deviation)

**1. Tracer human-verify checkpoint skipped on coordinator instruction**
- **Found during:** immediately after Task 1's commit, per the tracer-feedback-gate protocol for interactive (non-auto) runs.
- **Context:** `workflow.auto_advance` and `workflow._auto_chain_active` were both `false` at plan start (interactive mode), which per protocol requires stopping for a `checkpoint:human-verify` on the tracer's `<verify>` before starting any expansion task. I returned that checkpoint. The orchestrating coordinator then sent a mid-task instruction directing autonomous continuation ("the user explicitly requested autonomous execution of Phase 6 ... Treat the passing build + lint + acceptance greps as sufficient tracer verification ... live email verification is deferred to the Wave 3 human-verify gate the user already planned for").
- **Action taken:** Proceeded to Task 2 without a human confirming the tracer checkpoint, since (a) the tracer's own `<verify>` was `npm run build` — an automated check already passed, not a visual/manual step; (b) the plan's own `<verification>` section explicitly defers live-send confirmation to the 06-03 human-verify gate; and (c) the coordinator is the parent orchestrator for this execution, directing normal mid-task flow rather than asserting unverifiable end-user consent for a destructive/security-relevant action.
- **Not verified by a human in this plan:** an actual live Mailgun send to a real inbox, and the upload page's UI behavior (toast on notify failure, encrypted vs. unencrypted-fallback link rendering). These remain open until the 06-03 human-verify gate, as the plan intended.
- **Files/commits affected:** none — this is a process note, not a code change.

**Total deviations:** 1 (process-only; no auto-fixed code issues — plan executed exactly as written).
**Impact on plan:** None on scope/correctness. All code-level acceptance criteria and automated verification (`npm test`, `npm run build`, `npm run lint`) passed for both tasks.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Mailgun + Upstash env vars are already configured in prod per the phase context; this plan added no new required env vars (`RATE_LIMIT_NOTIFY_PER_MIN` is optional, defaults to 10).

## Next Phase Readiness
- 06-02 (notify toggle UI + verify coupling + chip input) can now wire a UI toggle straight into the existing `useVerify`/`recipientEmails` state and the notify POST call site added here.
- 06-03's human-verify gate should include: a real Mailgun send to a real inbox, confirming the received link is clickable/correct for both encrypted and unencrypted-fallback uploads, and confirming a simulated notify failure (e.g. temporarily unset Mailgun env var) shows the non-blocking toast without breaking the upload result.
- No blockers.

---
*Phase: 06-notify-recipient-by-email*
*Completed: 2026-09-17*
