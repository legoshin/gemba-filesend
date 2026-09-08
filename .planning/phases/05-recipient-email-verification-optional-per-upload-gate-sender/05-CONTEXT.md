---
phase: 5
name: Recipient Email Verification
created: 2026-09-08
source: user decisions (conversation)
---

# Phase 5 Context — Recipient Email Verification

## Locked decisions (from the user)

1. **Optional per-upload feature.** In the upload Options, add:
   - A **receiver email(s)** field — **multiple recipient emails allowed**.
   - A **"verify recipient before download"** toggle.
2. **Hard gate when enabled.** Enabling "verify recipient" **requires ≥1 recipient email**. When enabled, the recipient **cannot download** until they: click "Get verification code" → a one-time code is emailed → they enter the correct code. A code sent to **any one** of the listed addresses unlocks the download.
3. **Email provider: Mailgun.** Reuse the user's existing Mailgun account (same one used by their `sales-intelligence` project). **The user will set the Mailgun credentials themselves** in the gemba-filesend Vercel env — the code reads them from env vars (define: `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_SENDING_REGION` or base URL, `MAILGUN_FROM`). Do NOT hardcode; do NOT provision via marketplace. **PENDING from user:** the Mailgun sending domain + region (needed for real sends; code can be built against env now).
4. **Reuse existing infra:**
   - One-time codes stored in the existing **Upstash Redis** (`src/lib/redis.ts`) with a TTL.
   - **Rate limiting** on the request-code and verify-code endpoints via the existing `src/lib/rate-limit.ts`.
5. **Encryption boundary preserved (core value).** The AES key stays in the URL fragment and never reaches the server. The verification code only gates *who can pull the ciphertext* server-side — it does not touch the crypto. Recipient emails are metadata (server-side), NOT part of the key.

## Environment / platform

- Branch: `main` = the **pre-monorepo root-app** layout (`src/` at repo root) — the version live on `send.gemba.uk`. Do NOT use the `apps/web` monorepo layout.
- Existing relevant code: `src/app/upload/page.tsx` (Options UI), `src/app/download/` (download flow to gate), `src/app/api/` (endpoints), `src/lib/redis.ts`, `src/lib/rate-limit.ts`, `src/lib/blob-storage.ts` / `src/lib/server-storage.ts` (metadata), `src/lib/storage.ts`. Metadata already carries `password`/`downloadsRemaining`/`expiresAt`.

## Open design questions (planner to choose sensible defaults or flag)

- One-time code format (e.g. 6-digit numeric), TTL (e.g. 10 min), resend cooldown, max verify attempts before lockout.
- Recipient emails must be stored server-side in the file metadata in a form the server can email to (so NOT a one-way hash of the whole address). Flag the **privacy implication**: the server now stores recipient email addresses in metadata (the app is otherwise anonymous/no-account). Consider minimizing exposure (e.g. don't return emails to the download client; only accept an email the recipient types and check membership; or send to all listed addresses). Recommend an approach.
- Interaction with the **existing password protection** and **download-count limit** (order of checks; does a failed code consume a download?).
- Where the verification state lives (e.g. a short-lived "verified" token/flag in Redis keyed to the file id + a session) so the actual blob download can be authorized.
- Email `From`, subject, and a minimal plaintext+HTML template.

## Confirmed decisions (user, 2026-09-08 — resolves the flagged items)

- **D-05-04 CONFIRMED:** verify-token is **reusable within ~30 min TTL** (not single-use) — better UX for multi-download links.
- **D-05-08 CONFIRMED:** **accept** storing recipient emails plaintext in metadata (only when verification is enabled); never returned to any client (membership-check only), request-code always `{sent:true}`.
- **Execution scope:** build all 3 waves now. Wave 3 live-Mailgun-send checkpoint still needs the Mailgun domain/region + Vercel env from the user (pending).

## Non-goals

- No user accounts. No changes to the client-side crypto. No CSP/framing changes (already shipped). No changes to the embed-mode work (Phase quick-260908-tv6).
