---
phase: 06-notify-recipient-by-email
plan: 02
subsystem: upload-ui
tags: [notify, verify-coupling, chip-input, recipient-emails, react, shadcn]

# Dependency graph
requires:
  - phase: 06-notify-recipient-by-email
    plan: "01"
    provides: "POST /api/notify + upload-page notify POST call site (isolated try/catch, links from all results)"
  - phase: 05-recipient-verification
    provides: "useVerify toggle, recipientEmails plumbing, MAX_RECIPIENT_EMAILS/EMAIL_RE pattern"
provides:
  - "src/lib/recipient-emails.ts — parseRecipientEmails / isValidRecipientEmail / commitRecipientTokens / MAX_RECIPIENT_EMAILS (shared normalizer + single source for chip commit logic)"
  - "src/components/upload/recipient-chip-input.tsx :: RecipientChipInput — removable email chips from Input + Badge"
  - "upload page: useNotify state + Notify Switch + notify↔verify coupling + single shared chip list + generalized notify POST over all result links"
affects: [06-03-e2e-verification]

# Actuals (#2632)
actuals:
  tokens: 2600
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure, unit-tested commit helper (commitRecipientTokens) owns all validate/dedupe/cap decisions; the chip component is thin presentational glue over it — no component-render test harness needed (node vitest env)."
    - "Controlled string[] chip input built from existing shadcn Input + Badge primitives (no new tag-input dependency)."
    - "Toggle coupling handled in a single onCheckedChange (Notify ON → auto-enable Verify) without locking the coupled control."

key-files:
  created:
    - src/lib/recipient-emails.ts
    - src/lib/recipient-emails.test.ts
    - src/components/upload/recipient-chip-input.tsx
  modified:
    - src/app/upload/page.tsx

key-decisions:
  - "recipientEmails state changed from a raw comma-string to a normalized string[]; the chip input owns editing and the rest of the flow consumes the array without re-parsing."
  - "parseRecipientEmails was moved verbatim out of upload/page.tsx into the shared module (behavior identical) so both the page and the chip component share one normalizer."
  - "Notify↔Verify coupling is one-directional and non-locking: Notify ON calls setUseVerify(true); the Verify Switch remains bound directly to setUseVerify (independently switchable); Notify OFF does not touch Verify."
  - "Chip rejection feedback (invalid or over-cap tokens) is surfaced inline via an aria-live=polite text-[var(--gemba-critical)] line and cleared on the next successful commit."

requirements-completed: [NOTIFY-01, NOTIFY-02, NOTIFY-03, NOTIFY-05, NOTIFY-06]

coverage:
  - id: D1
    description: "commitRecipientTokens normalizes/validates each token, merges dedup against current, caps at MAX_RECIPIENT_EMAILS, and returns rejected (invalid + overflow) tokens."
    requirement: "NOTIFY-03"
    verification:
      - kind: unit
        ref: "src/lib/recipient-emails.test.ts (11 assertions: parse/normalize/dedupe, validate incl. 254-cap + whitespace, commit merge/dedup/overflow)"
        status: pass
    human_judgment: false
  - id: D2
    description: "RecipientChipInput renders removable [x] chips, commits on Enter/comma/blur via commitRecipientTokens, rejects invalid inline, caps at MAX_RECIPIENT_EMAILS — built only from Input + Badge."
    requirement: "NOTIFY-03"
    verification:
      - kind: unit
        ref: "npm run build (type-checks controlled value/onChange contract + primitives usage)"
        status: pass
    human_judgment: true
    rationale: "Interactive chip commit/removal UX (keyboard commit, inline rejection rendering) is confirmed at the 06-03 human-verify gate."
  - id: D3
    description: "Notify toggle auto-enables Verify on turn-ON; Verify stays independently switchable; Notify OFF leaves Verify unchanged; one shared recipient list is shown whenever either toggle is on."
    requirement: "NOTIFY-01, NOTIFY-02"
    verification:
      - kind: unit
        ref: "code inspection + npm run build — Notify onCheckedChange sets useVerify(true) only on enable; Verify Switch bound to setUseVerify with no disabled/locked attr; recipient field gated on (useNotify || useVerify)"
        status: pass
    human_judgment: true
    rationale: "Live toggle interaction (single shared field, independent Verify switch-off while Notify on) confirmed at the 06-03 human-verify gate."
  - id: D4
    description: "The notify POST is gated on useNotify + non-empty shared list, maps over all collected results to build its links payload, and stays in its own try/catch (non-blocking toast on failure)."
    requirement: "NOTIFY-05, NOTIFY-06"
    verification:
      - kind: unit
        ref: "npm run build + code inspection — fetch('/api/notify') inside an isolated try/catch, links = collected.map(...), recipients = recipientEmails (shared string[])"
        status: pass
    human_judgment: false

# Metrics
duration: 4min
completed: 2026-09-17
status: complete
---

# Phase 06 Plan 02: Notify Toggle UI + Verify Coupling + Chip Input Summary

**Expanded the proven notify path into the real sender UX — a Notify Recipient toggle that auto-enables Verify, one shared removable-chip recipient list feeding both features, and a pure/tested commit helper backing the interactive chip input.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-09-17T15:57:58Z
- **Completed:** 2026-09-17T16:02:14Z
- **Tasks:** 3
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments
- `src/lib/recipient-emails.ts` — shared normalizer/validator/commit helper: `parseRecipientEmails` (moved verbatim from the page), `isValidRecipientEmail` (EMAIL_RE + 254 length cap), `commitRecipientTokens` (merge + dedup + cap + reject), and `MAX_RECIPIENT_EMAILS`. Fully unit-tested (11 cases, all behavior-block scenarios incl. overflow and the 254-char cap).
- `RecipientChipInput` — controlled `value: string[]` / `onChange` component built entirely from the existing shadcn `Input` + `Badge`; commits tokens on Enter/comma/blur, renders a removable `[x]` chip per email (aria-label `Remove <email>`), shows inline `aria-live` rejection feedback for invalid/over-cap tokens, and disables input at the cap. All validation delegates to the tested `commitRecipientTokens` — no re-implemented validator, no new npm dependency.
- Upload page wiring: `recipientEmails` is now a shared `string[]`; a Notify Recipient Switch sits beside Verify; turning Notify ON auto-enables Verify (D-06-05) while Verify stays independently switchable and Notify OFF leaves Verify unchanged; the single `RecipientChipInput` renders whenever `useNotify || useVerify`; the guard requires ≥1 recipient when either toggle is on; the notify POST is gated on `useNotify` + non-empty list, maps over all collected results (multi-file safe), and stays in its own try/catch; `handleReset` clears both `useNotify` and the recipient list.
- 95/95 tests pass; `npm run build` clean; the four plan files are eslint-clean.

## Task Commits

Each task was committed atomically (Task 1 followed RED→GREEN):

1. **Task 1 (RED): failing recipient-emails helper tests** - `05d8019` (test)
2. **Task 1 (GREEN): extract shared recipient-emails helper + page consumes parseRecipientEmails** - `3e30bd0` (feat)
3. **Task 2: RecipientChipInput component** - `8f3d5b0` (feat)
4. **Task 3: notify toggle + verify coupling + shared chip list wiring** - `8662d00` (feat)

## Decisions Made
- Changed `recipientEmails` from a raw comma-string to a normalized `string[]`, so the chip input owns editing and the verify-metadata path + notify POST consume the array directly (no re-parsing).
- Kept the notify↔verify coupling one-directional and non-locking (Notify ON → `setUseVerify(true)`; Verify Switch still bound directly to `setUseVerify`), matching D-06-05 exactly.
- Used the `Send01` icon for the Notify toggle to visually distinguish it from Verify's `Mail01`, matching sibling Options styling (Icon + Label + description + Switch) verbatim — no new tokens.

## Deviations from Plan
None — plan executed exactly as written. No Rule 1–4 auto-fixes were needed.

## Threat Model Compliance
- **T-06-07 (chip token injection, mitigate):** `commitRecipientTokens` validates every token against EMAIL_RE + the 254-char cap and rejects invalid entries inline; only normalized valid emails enter the list. Server re-validates in `/api/notify` (defense in depth). ✔
- **T-06-08 (recipient-list reuse, mitigate):** the client sends the shared list to the server, which sends one email per recipient (06-01, D-06-07) — no shared To/CC path introduced here. ✔
- **T-06-09 (notify failure blocking upload, mitigate):** notify POST remains isolated in its own try/catch; failure is a non-blocking toast and the upload result always renders (D-06-04). ✔
- **T-06-SC (package installs, accept):** no npm installs — the chip input reuses existing Input + Badge. ✔

## Issues Encountered
- `npm run lint` (whole repo) reports thousands of pre-existing problems originating entirely in the untracked `apps/` native-mobile tree and generated JS — out of scope per the scope boundary. The four files changed by this plan are eslint-clean (`npx eslint <files>` exits 0).

## Known Stubs
None.

## User Setup Required
None — no new env vars. Mailgun + Upstash remain configured in prod (06-01).

## Next Phase Readiness
- 06-03's human-verify gate should confirm the interactive UX end-to-end: chip commit on Enter/comma/blur, chip removal, inline rejection of invalid entries, the single shared field feeding both features, Notify ON auto-enabling Verify while Verify stays switch-off-able, and a real Mailgun send of all result links (encrypted vs unencrypted-fallback) with a non-blocking toast on simulated failure.
- No blockers.

## Self-Check: PASSED

- All created files present on disk (recipient-emails.ts, recipient-emails.test.ts, recipient-chip-input.tsx, 06-02-SUMMARY.md).
- All four commits present in git history (05d8019, 3e30bd0, 8f3d5b0, 8662d00).
- Acceptance greps confirmed: T1 exports, T2 delegates to commitRecipientTokens, T3 useNotify wired.

---
*Phase: 06-notify-recipient-by-email*
*Completed: 2026-09-17*
