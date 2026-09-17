# Phase 06: Notify Recipient by Email - Context

**Gathered:** 2026-09-17
**Status:** Ready for planning
**Source:** PRD Express Path (phase-06-notify-recipient-prd.md)

<domain>
## Phase Boundary

Add an opt-in "Notify recipient" capability to the upload flow. When the sender supplies
recipient email(s) and enables notification, each recipient is emailed (via Mailgun) that a file
has been shared with them, including the working download link. Builds on Phase 5's recipient
email capture/plumbing and the existing Mailgun sender. Ships for both encrypted and
unencrypted-fallback uploads. Excludes any non-email channel and any change to recipient
verification (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Key handling (LOCKED — user-approved E2E exception)
- The client sends the FULL download link INCLUDING the `#<decryptionKey>` URL fragment to a
  server endpoint, which sends it via Mailgun. This routes the decryption key through the server
  + Mailgun and is an explicit, user-accepted exception to "the key never reaches the server."
  Do NOT re-litigate or redesign to a keyless/out-of-band scheme.

### Reuse (LOCKED)
- Add `sendShareNotificationEmail()` to `src/lib/mailgun.ts`, mirroring `sendVerificationEmail`
  (bare fetch + FormData, fail-loud). Do NOT add a second sender or a parallel email module.
- Add the toggle in the existing shadcn/Radix Options panel on the upload page, beside the
  Phase 5 recipient-verify toggle / recipient email field. Match sibling styling verbatim; no
  new design tokens.
- The notify endpoint mirrors the Phase 5 request-code route shape (validate → rate-limit →
  Mailgun send → fail-loud 500). Rate limiting reuses `src/lib/rate-limit.ts` — add a notify
  limiter following the existing sliding-window pattern; no new mechanism.

### Behavior (LOCKED)
- Toggle only meaningful with ≥1 recipient email (reuse Phase 5 `recipientEmails`); empty-recipient
  behavior consistent with the existing recipient-verify toggle.
- Fires only on SUCCESSFUL upload; sends one email per recipient.
- Notification failure MUST NOT fail/roll back the upload — surface a non-blocking sonner toast;
  the upload result still renders.
- Works for encrypted (link has `#key`) and unencrypted-fallback (no fragment) uploads.
- Endpoint validates recipient email format + presence of link and file name.

### Constraints (LOCKED)
- No change to the `[12-byte IV][ciphertext+tag]` wire format; no weakening of encryption beyond
  the approved key-in-email path.
- Stack: Next.js 16 / React 19 / Tailwind 4. Mailgun + Upstash already configured in prod.

### Claude's Discretion
- Exact endpoint path/shape (e.g. `/api/notify` vs `/api/files/[id]/notify`), request body schema,
  and where the client fires the POST within the upload success handler.
- Email copy/wording (plain-text, matching the verification email's simple style).
- Notify rate-limit threshold/default and limiter key (per-IP and/or per-file), following the
  existing pattern.
- Toggle label, empty-state affordance (disabled vs hint), and default (off).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Mailgun sender (reuse, do not duplicate)
- `src/lib/mailgun.ts` — `sendVerificationEmail` + `mailgunBaseUrl` (bare-fetch + FormData, fail-loud pattern to mirror).

### Endpoint + rate-limit patterns
- `src/app/api/files/[id]/request-code/route.ts` — validate → rate-limit → Mailgun send → 500 fail-loud shape.
- `src/lib/rate-limit.ts` — per-IP/-file sliding-window limiters (fail-open); add notify limiter here.

### Upload UI + recipient plumbing
- `src/app/upload/page.tsx` — Options panel, `recipientEmails` field, upload success/result rendering, sonner toasts.
- `src/app/download/page.tsx` — download link/fragment format reference.

### Project constraints
- `.planning/ROADMAP.md` (Phase 6 entry) — goal + dependency on Phase 5.

</canonical_refs>

<specifics>
## Specific Ideas

- Notification email: plain text, states a file was shared + includes the download link, matching
  the tone/format of the existing verification email.
- Client already holds the full share link (with `#key`) at upload success — POST it from there.

</specifics>

<deferred>
## Deferred Ideas

- Branded/templated HTML email design (follow-up).
- Non-email notification channels.

</deferred>

---

*Phase: 06-notify-recipient-by-email*
*Context gathered: 2026-09-17 via PRD Express Path*
