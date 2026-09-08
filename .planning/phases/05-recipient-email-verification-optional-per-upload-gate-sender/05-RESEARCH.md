# Phase 5: Recipient Email Verification - Research

**Researched:** 2026-09-08
**Domain:** Server-side one-time-code email gate (Mailgun HTTP API + Upstash Redis), layered onto an existing anonymous client-side-encrypted file-share app
**Confidence:** HIGH (architecture/placement — verified by reading the actual routes) / MEDIUM (Mailgun wire format — CITED official docs) / LOW (a few UX defaults flagged ASSUMED)

## Summary

This phase adds an optional gate in front of the *existing* single download-authorization route, `GET /api/files/[id]` (`src/app/api/files/[id]/route.ts`). That route already gates on password (`checkPassword`) before it either mints a Vercel Blob presigned URL (blob mode) or streams bytes directly (fs mode) — **and it is the only place ciphertext access is authorized in both storage modes**, so it is also the only place the new verification gate needs to be inserted. No new gate is needed on the download *page* itself; the page already calls this route as step 1 before fetching bytes (`src/app/download/page.tsx:198-220`).

Two new endpoints are required: `POST /api/files/[id]/request-code` (looks up the submitted email against the file's stored recipient list, emails a 6-digit code via Mailgun if it matches, and always returns a generic response either way to prevent recipient-email enumeration) and `POST /api/files/[id]/verify-code` (checks the code, and on success mints a short-lived opaque `verify-token` that the download page then sends as a new header, `x-verify-token`, on the existing `GET /api/files/[id]` call — mirroring the existing `x-password` header pattern exactly).

All new server-side state (code, attempt counter, verify-token) lives in the existing shared Upstash Redis client (`src/lib/redis.ts`), which today only exposes `set`/`decr`. It must be widened to also expose `get` (and the dev in-memory shim extended to match) — everything else composes with existing helpers without new abstractions. Rate limiting reuses the existing `buildLimiter`/`enforce` pattern in `src/lib/rate-limit.ts` (same shape as `checkPasswordAttemptLimit`), adding two new limiters. Mailgun is called with a bare `fetch` + native `FormData` — no SDK — matching the project's zero-heavy-dependency style and the user's explicit instruction (05-CONTEXT.md).

**Primary recommendation:** Insert the verify-token check into the two existing `handleBlobDownload`/`handleFsDownload` functions in `src/app/api/files/[id]/route.ts`, right alongside `checkPassword`, before `decrementDownloadCounter` is called — so a failed/missing code never consumes a download, exactly like a failed password today.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Recipient email + toggle input | Browser (Client) | — | Upload Options UI, `src/app/upload/page.tsx` |
| Recipient-email storage in metadata | API / Backend | Database/Storage (Blob JSON / fs JSON) | `StoredMeta` already the single source of truth for password/limits |
| Code generation, hashing, TTL | API / Backend | Storage (Upstash Redis) | Must never be derivable/visible client-side |
| Code delivery | API / Backend (Mailgun HTTP API call) | — | Server holds `MAILGUN_API_KEY`; must never reach browser |
| Ciphertext access gate | API / Backend | — | `GET /api/files/[id]` is the sole authorization point in both storage modes |
| Ciphertext bytes/URL | CDN/Static (Vercel Blob, blob mode) or API/Backend (fs mode) | — | Unchanged by this phase — only *authorization to obtain* the URL/bytes changes |
| AES decryption | Browser (Client) | — | Unchanged — key stays in URL fragment, never sent to server |

## User Constraints (from CONTEXT.md)

### Locked Decisions
1. **Optional per-upload feature.** In the upload Options, add:
   - A **receiver email(s)** field — **multiple recipient emails allowed**.
   - A **"verify recipient before download"** toggle.
2. **Hard gate when enabled.** Enabling "verify recipient" **requires ≥1 recipient email**. When enabled, the recipient **cannot download** until they: click "Get verification code" → a one-time code is emailed → they enter the correct code. A code sent to **any one** of the listed addresses unlocks the download.
3. **Email provider: Mailgun.** Reuse the user's existing Mailgun account. **The user will set the Mailgun credentials themselves** in the gemba-filesend Vercel env — the code reads them from env vars (`MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_SENDING_REGION` or base URL, `MAILGUN_FROM`). Do NOT hardcode; do NOT provision via marketplace. **PENDING from user:** the Mailgun sending domain + region.
4. **Reuse existing infra:**
   - One-time codes stored in the existing **Upstash Redis** (`src/lib/redis.ts`) with a TTL.
   - **Rate limiting** on the request-code and verify-code endpoints via the existing `src/lib/rate-limit.ts`.
5. **Encryption boundary preserved (core value).** The AES key stays in the URL fragment and never reaches the server. The verification code only gates *who can pull the ciphertext* server-side — it does not touch the crypto. Recipient emails are metadata (server-side), NOT part of the key.

### Claude's Discretion
- One-time code format, TTL, resend cooldown, max verify attempts before lockout.
- How to minimize privacy exposure of stored recipient emails.
- Interaction/ordering with existing password protection and download-count limit; whether a failed code consumes a download.
- Where the "verified" state lives (Redis structure).
- Email `From`, subject, and template content.

### Deferred Ideas (OUT OF SCOPE)
- No user accounts. No changes to client-side crypto. No CSP/framing changes. No changes to embed-mode (Phase quick-260908-tv6).

## Project Constraints (from CLAUDE.md)

- **GSD workflow mandatory** — this phase must be planned/executed through `/gsd-plan-phase` → `/gsd-execute-phase`; no direct edits outside the workflow.
- **Design fidelity** — any new UI (email input, verify-code input, "Get verification code" step on the download page) must use only tokens from `design-system/tokens/`; no invented colors/spacing. Reuse the existing `Switch`/`Input`/`Label`/`Card` components already used for the password toggle (`src/app/upload/page.tsx:516-544`) as the template for the new recipient-email + verify-toggle UI.
- **Tech stack** — stay on Next.js 16 / React 19 / Tailwind 4, existing shadcn/Radix layer. No parallel UI kit.
- **Encryption boundary** — must not weaken client-side encryption; the AES key never reaches the server (unaffected by this phase — verified below).
- **Platform parity** — new UI must render correctly across web, PWA, and Android TWA (no platform-specific behavior expected here; this is a pure web-app + API feature, no native surface).
- **Reuse-first (global CLAUDE.md)** — before adding anything new, reuse `src/lib/redis.ts`, `src/lib/rate-limit.ts`, `src/lib/crypto.ts` (`sha256Hex`, `toBase64Url`), and the existing `x-password`-header authorization pattern in `src/app/api/files/[id]/route.ts`. Do not hand-roll a second Redis client, a second rate-limit module, or a parallel "session" system.
- **Simplicity first** — no SDK for Mailgun (bare `fetch`); no new validation library (project has none — `validateClientMeta` in `src/app/api/files/route.ts:42-68` is hand-rolled and is the pattern to extend).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@upstash/redis` | ^1.38.0 (already installed) | Store code, attempts, verify-token | Already the project's sole Redis client (`src/lib/redis.ts:14`) — reuse, don't add another |
| `@upstash/ratelimit` | ^2.0.8 (already installed) | Rate-limit request-code/verify-code | Already the project's sole limiter (`src/lib/rate-limit.ts:13`) |
| Native `fetch` + `FormData` | Node 18+ built-in | Call Mailgun HTTP API | Node 18+ confirmed as the project's minimum [VERIFIED: .planning/codebase/STACK.md:17 — "Node.js 18+ (required for `crypto.subtle` Web Crypto API)"]; native `fetch`/`FormData` avoid adding an SDK dependency, matching CONTEXT.md's explicit instruction |
| Web Crypto (`crypto.getRandomValues`, `crypto.subtle.digest`) via existing `src/lib/crypto.ts` | n/a (built-in) | Code generation entropy, code hashing, verify-token generation | Already imported and used server-side in `src/app/api/files/route.ts:10` and `src/app/api/files/[id]/route.ts:16` (`sha256Hex`, `randomSaltBase64`) — proven to work in the `nodejs` runtime these routes already declare |

**No new npm packages are required for this phase.**

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Bare `fetch` to Mailgun HTTP API | `mailgun.js` SDK (npm, confirmed on registry, v14.0.1) [ASSUMED — package name from training knowledge; registry existence confirmed via `npm view` but not from official docs] | SDK adds a dependency + its own `form-data` transitive dep for a single POST call; CONTEXT.md explicitly asks for the lean `fetch` approach |
| `crypto.getRandomValues(...) % 1_000_000` for the 6-digit code (matches existing `generateClientId()`/`generateId()` style in the codebase) | `node:crypto`'s `crypto.randomInt(0, 1_000_000)` [CITED: nodejs.org/api/crypto.html] | `randomInt` has zero modulo bias and is arguably more "correct," but the existing codebase already uses the `getRandomValues % N` pattern twice (`src/app/upload/page.tsx:101-107`, `src/lib/server-storage.ts:77-83`) with negligible bias (2^32 mod 1e6 skew ≈ 1 in 4 billion) — reusing the established in-repo pattern is more consistent than introducing a second RNG idiom for a 10-minute-TTL, 6-attempt-lockout code |
| Hashing the 6-digit code before storing in Redis (`sha256Hex(code)`, reusing `src/lib/crypto.ts:61`) | Store the plaintext code | Hashing costs nothing extra and mirrors the existing `passwordHash`/`salt` pattern (defense-in-depth against a Redis data exposure); recommended default |

## Package Legitimacy Audit

**No new packages are installed by this phase** — the entire feature is built from already-installed dependencies (`@upstash/redis`, `@upstash/ratelimit`) plus Node/Web built-ins (`fetch`, `FormData`, Web Crypto). The Package Legitimacy Gate is therefore not applicable. If the planner or a later phase reconsiders the Mailgun SDK route, run `gsd_run query package-legitimacy check --ecosystem npm mailgun.js form-data` before adding it.

## Architecture Patterns

### System Architecture Diagram

```
Upload (sender)                          Download (recipient)
────────────────                         ─────────────────────
Browser (upload/page.tsx)                Browser (download/page.tsx)
  │ encrypts file client-side               │ GET /api/files/[id]/meta
  │ (AES key stays local)                    │   → { verifyRequired, passwordProtected, ... }
  │                                          │
  │ POST /api/files                          ├─ if verifyRequired:
  │  (clientPayload incl.                    │    Input: recipient's email
  │   recipientEmails[])                     │    │
  ▼                                          │    ▼
┌──────────────────────────┐                │  POST /api/files/[id]/request-code {email}
│ /api/files (POST)        │                │    │ rate-limited (file+IP)
│ validateClientMeta() ext. │                │    │ membership check against
│ → StoredMeta.recipient-   │                │    │   meta.recipientEmails (never
│   Emails[] (lowercased)   │                │    │   returned to client)
└──────────────┬────────────┘                │    │ generates 6-digit code,
               │ blob mode: onUploadCompleted │    │   sha256Hex()'s it, stores
               │ fs mode: fsWriteMeta         │    │   in Redis vcode:{id} (TTL)
               ▼                              │    │ sends via Mailgun fetch()
   metadata store (Blob JSON / fs JSON)       │    ▼  (always generic 200 response)
   StoredMeta.recipientEmails: string[]       │
                                               │  POST /api/files/[id]/verify-code {code}
                                               │    │ rate-limited (file+IP)
                                               │    │ compares sha256Hex(code) to
                                               │    │   vcode:{id}, attempt counter
                                               │    │ on match: deletes vcode:{id},
                                               │    │   mints opaque token, stores
                                               │    │   Redis vtoken:{token} → id (TTL)
                                               │    ▼
                                               │  { verified: true, token }
                                               │    │ stored in page state
                                               │    ▼
                                               │  GET /api/files/[id]
                                               │    (headers: x-password?, x-verify-token)
                                               ▼
                                     ┌───────────────────────────────┐
                                     │ /api/files/[id] (GET)         │
                                     │ existence/expiry/exhausted     │
                                     │ → checkVerifyToken() [NEW]     │
                                     │ → checkPassword() [existing]   │
                                     │ → decrementDownloadCounter()   │
                                     │ → mint presigned URL (blob) OR │
                                     │   stream bytes (fs)            │
                                     └───────────────┬─────────────────┘
                                                      ▼
                                     Browser fetches ciphertext, decrypts
                                     locally with the URL-fragment key
                                     (unchanged — server never sees the key)
```

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   └── files/
│   │       ├── route.ts                    # EXTEND: validateClientMeta + recipientEmails
│   │       └── [id]/
│   │           ├── route.ts                # EXTEND: insert checkVerifyToken() gate
│   │           ├── meta/route.ts           # EXTEND: return verifyRequired boolean
│   │           ├── request-code/route.ts   # NEW
│   │           └── verify-code/route.ts    # NEW
│   ├── upload/page.tsx                     # EXTEND: recipient-email UI + toggle
│   └── download/page.tsx                   # EXTEND: verify-code UI step
└── lib/
    ├── storage.ts                          # EXTEND: StoredMeta.recipientEmails?: string[]
    ├── redis.ts                            # EXTEND: widen RedisLike (+get), add code/token helpers
    ├── rate-limit.ts                       # EXTEND: checkRequestCodeLimit, checkVerifyAttemptLimit
    └── mailgun.ts                          # NEW: sendVerificationEmail()
```

### Pattern 1: Header-based short-lived authorization token (mirrors existing `x-password`)
**What:** On successful code verification, mint an opaque random token, store `vtoken:{token} → fileId` in Redis with a TTL (recommend 30 min), return it to the client, and have the client resend it as `x-verify-token` on the existing download-authorization request — exactly like `x-password` is sent today.
**When to use:** Any time a gate needs to survive across two separate requests (verify-code call, then the later download-auth call) without introducing accounts/sessions.
**Example (server, new helper in `src/lib/redis.ts`):**
```typescript
// Extend RedisLike (currently Pick<Redis, "set" | "decr">) to also expose "get",
// and extend createDevShim() to implement it against the same in-memory Map.
export type RedisLike = Pick<Redis, "set" | "decr" | "get">;

function verifyTokenKey(token: string): string {
  return "vtoken:" + token;
}

export async function issueVerifyToken(
  id: string,
  ttlSeconds: number,
  redis: RedisLike = getRedisClient(),
): Promise<string> {
  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(24))); // reuse src/lib/crypto.ts toBase64Url
  await redis.set(verifyTokenKey(token), id, { ex: ttlSeconds });
  return token;
}

export async function isVerifyTokenValid(
  id: string,
  token: string,
  redis: RedisLike = getRedisClient(),
): Promise<boolean> {
  const stored = await redis.get<string>(verifyTokenKey(token));
  return stored === id;
}
```
**Example (client, `src/app/download/page.tsx` — mirrors the existing `headers["x-password"]` line at `download/page.tsx:193`):**
```typescript
const headers: Record<string, string> = {};
if (fileInfo.passwordProtected) headers["x-password"] = password;
if (fileInfo.verifyRequired) headers["x-verify-token"] = verifyToken;
```

### Pattern 2: Generic response to prevent recipient-email enumeration
**What:** `request-code` always returns `{ sent: true }` with the same status/timing-insensitive shape regardless of whether the submitted email matched a stored recipient — only fire the actual Mailgun call when it matches.
**When to use:** Any endpoint that checks membership in a private list and could otherwise leak membership via response differences.
**Example:**
```typescript
// src/app/api/files/[id]/request-code/route.ts
const normalized = email.trim().toLowerCase();
const isRecipient = meta.recipientEmails?.includes(normalized) ?? false;
if (isRecipient) {
  const code = generateSixDigitCode();
  await storeVerificationCode(id, normalized, code);
  await sendVerificationEmail(normalized, code, meta.name);
}
// Always the same response, whether or not isRecipient was true:
return NextResponse.json({ sent: true });
```

### Pattern 3: Mailgun send via bare fetch (multipart/form-data, region-aware)
**What:** POST to `https://api.mailgun.net/v3/{domain}/messages` (US) or `https://api.eu.mailgun.net/v3/{domain}/messages` (EU) [CITED: documentation.mailgun.com/docs/mailgun/api-reference/mg-auth — "US Mailgun at `https://api.mailgun.net` and EU Mailgun at `https://api.eu.mailgun.net`"], Basic auth `api:{MAILGUN_API_KEY}` [CITED: documentation.mailgun.com — "Authorization header using HTTP Basic Auth... `--user 'api:YOUR_API_KEY'`"], body as `multipart/form-data` [CITED: documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/messages — "The API expects multipart/form-data encoding"].
**Example (`src/lib/mailgun.ts`, new file):**
```typescript
const REGION_BASE_URL: Record<"us" | "eu", string> = {
  us: "https://api.mailgun.net",
  eu: "https://api.eu.mailgun.net",
};

function mailgunBaseUrl(): string {
  const region = (process.env.MAILGUN_SENDING_REGION ?? "us").toLowerCase();
  return REGION_BASE_URL[region === "eu" ? "eu" : "us"];
}

export async function sendVerificationEmail(
  toEmail: string,
  code: string,
  fileName: string,
): Promise<void> {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const from = process.env.MAILGUN_FROM;
  if (!apiKey || !domain || !from) {
    throw new Error("Mailgun env vars not configured");
  }

  const form = new FormData();
  form.set("from", from);
  form.set("to", toEmail);
  form.set("subject", "Your Gemba Filesend verification code");
  form.set(
    "text",
    `Your verification code is ${code}. It expires in 10 minutes.\n\n` +
      `Someone shared "${fileName}" with you via Gemba Filesend.`,
  );

  const res = await fetch(`${mailgunBaseUrl()}/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mailgun send failed: HTTP ${res.status} ${text}`);
  }
}
```

### Anti-Patterns to Avoid
- **Trusting client-supplied recipient email as authorization:** Never let the client tell the server "I am recipient@example.com, let me in" without the code round-trip — the whole point of the code is to prove control of the inbox.
- **Returning the stored recipient list to the download client:** `GET /api/files/[id]/meta` must only ever return a `verifyRequired: boolean`, exactly as it already does `passwordProtected: Boolean(meta.passwordHash)` (`src/app/api/files/[id]/meta/route.ts:41`) — never the emails themselves.
- **A second Redis client or a second rate-limit module:** everything routes through `getRedisClient()` and `buildLimiter()`/`enforce()`.
- **Resetting the Redis TTL on every failed verify attempt:** if the stored value's TTL is refreshed (`ex`) on each `set()` write when incrementing the attempt counter, a determined attacker could keep the code alive indefinitely by re-writing it. Store an absolute `expiresAt` timestamp *inside* the JSON payload and check `Date.now() < expiresAt` in application logic; use the Redis TTL only as a coarse GC safety net set a little longer than the logical window.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Redis client / connection pooling | A second Upstash client instance | `getRedisClient()` (`src/lib/redis.ts:50`) | Single shared client backs rate limiting + the download counter today (D-10 in the file's own header comment) — a second instance fragments that guarantee |
| Sliding-window rate limiting | Manual counters | `buildLimiter()` + `enforce()` (`src/lib/rate-limit.ts:35-96`) | Already handles fail-open-on-Redis-outage, dev-mode allow-all, and the 429+Retry-After response shape consistently |
| Password/code hashing | A custom hash scheme | `sha256Hex()` (`src/lib/crypto.ts:61`) — already imported server-side in two routes | Consistent hashing primitive already proven in this exact runtime |
| Multipart form encoding for Mailgun | Manual `--` boundary string construction | Native `FormData` (global in Node 18+) | Zero-dependency, spec-correct multipart encoding, matches the project's "no heavy SDK" instruction |
| Email format validation | A regex plucked from Stack Overflow with backtracking risk | A simple, non-catastrophic-backtracking check (e.g. `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` + length cap) consistent with the existing hand-rolled `validateClientMeta()` style (`src/app/api/files/route.ts:42-68`) | The project has no validation library (no `zod` in `package.json`) — match existing conventions rather than introducing one for a single field |

**Key insight:** Every piece of new server infrastructure this phase needs (a store, a rate limiter, a hash function, a short-lived-header-token pattern) already exists in the codebase in a form built for a near-identical purpose (password gating). The implementation task is almost entirely "extend the existing pattern," not "design a new subsystem."

## Common Pitfalls

### Pitfall 1: Gating the wrong layer in blob mode
**What goes wrong:** Someone assumes the gate must live on the Vercel Blob URL itself (e.g., trying to make the blob "private until verified").
**Why it happens:** In blob mode the actual ciphertext bytes are fetched by the *client* directly from the Blob CDN (`src/app/download/page.tsx:220`, fetching `auth.url`) — it looks like the CDN is the authorization boundary.
**How to avoid:** It isn't — the CDN URL is a short-lived (5 min, `PRESIGN_TTL_MS` in `src/app/api/files/[id]/route.ts:27`) *presigned* URL that only exists because `GET /api/files/[id]` minted it. As long as that minting is gated, the blob itself never needs to know about verification. This is already proven by the existing password gate, which sits in exactly this spot.
**Warning signs:** Any design that tries to set Blob-level access policies per-recipient, or that tries to encode verification state into the Blob pathname.

### Pitfall 2: Letting a failed/missing code consume a download
**What goes wrong:** If the verify-token check is placed *after* `decrementDownloadCounter()`, an unverified recipient (or an attacker probing without a valid code) burns down `downloadsRemaining` with zero valid downloads.
**Why it happens:** Easy to bolt the new check onto the end of the function instead of before the counter call.
**How to avoid:** Insert `checkVerifyToken()` in the same position as the existing `checkPassword()` call — both in `handleBlobDownload` (before line 65's counter decrement, `src/app/api/files/[id]/route.ts:57-65`) and `handleFsDownload` (before line 146's counter decrement, same file:136-146). Verified by reading: password failures already return before the counter is touched in both functions.

### Pitfall 3: Redis TTL reset on rewrite (attempt-counter update)
**What goes wrong:** Storing `{ codeHash, attempts }` and calling `redis.set(key, value, { ex: 600 })` again on every failed attempt silently *extends* the code's life by another 600s each time, defeating the TTL.
**Why it happens:** Upstash's `SET ... EX` always resets the expiry, it doesn't "refresh only if shorter."
**How to avoid:** Store an absolute `expiresAt` in the JSON payload at creation time and enforce it in application code on every read, independent of the Redis-level TTL (set Redis TTL slightly longer, e.g. 650s, purely as a garbage-collection backstop).

### Pitfall 4: Email enumeration via `request-code`
**What goes wrong:** If the endpoint returns different status codes/bodies for "email matched a recipient" vs. "email did not match," an attacker can use the endpoint as an oracle to discover which addresses a sender shared a file with.
**Why it happens:** The natural first implementation returns 404/400 for "not a recipient" and 200 for "code sent" — different codes are the most common accidental leak.
**How to avoid:** Always return the same `200 { sent: true }` (see Pattern 2). Note the residual risk explicitly: response *timing* can still differ slightly because a real Mailgun network call only happens on a match — this is a known, low-severity residual risk given the app's anonymous/no-account threat model, not something this phase needs to fully close (flagged in Assumptions Log).

### Pitfall 5: Deriving `verifyRequired` from a separate boolean instead of the emails array
**What goes wrong:** Adding a standalone `verifyRequired: boolean` field to `StoredMeta` creates a state that can drift from `recipientEmails` (e.g., `verifyRequired: true` with an empty array, or emails present but the flag `false`).
**Why it happens:** Looks natural since the UI has two separate controls (email field + toggle).
**How to avoid:** Store only `recipientEmails?: string[]` in `StoredMeta` and derive the boolean everywhere as `Boolean(meta.recipientEmails?.length)` — exactly the existing pattern for `passwordProtected: Boolean(meta.passwordHash)` (`src/app/api/files/[id]/meta/route.ts:41`). Enforce the "toggle requires ≥1 email" rule at the UI/validation layer (client-side disable + server-side `validateClientMeta` rejection), not with a redundant stored flag.

## Code Examples

### Extending `StoredMeta` (`src/lib/storage.ts`)
```typescript
// Source: existing file, src/lib/storage.ts:10-23 — add one field, no other changes
export interface StoredMeta {
  id: string;
  name: string;
  type: string;
  size: number;
  passwordHash?: string;
  salt?: string;
  downloadsRemaining: number;
  expiresAt: number;
  createdAt: number;
  blobUrl?: string;
  /** Lowercased, trimmed recipient emails. Presence + non-empty length IS the
   *  "verification required" flag — do not add a separate boolean (Pitfall 5). */
  recipientEmails?: string[];
}
```

### Extending the download-authorization route (`src/app/api/files/[id]/route.ts`)
```typescript
// New helper, called identically to checkPassword() in both handleBlobDownload
// and handleFsDownload, inserted BEFORE decrementDownloadCounter().
async function checkVerification(
  id: string,
  meta: StoredMeta,
  token: string | null,
): Promise<Response | null> {
  if (!meta.recipientEmails?.length) return null; // not gated
  if (!token) return new Response("verification required", { status: 401 });
  const ok = await isVerifyTokenValid(id, token);
  if (!ok) return new Response("invalid or expired verification", { status: 403 });
  return null;
}

// In handleBlobDownload, mirroring the existing checkPassword() call site:
const verifyFail = await checkVerification(id, meta, req.headers.get("x-verify-token"));
if (verifyFail) return verifyFail;
const pwFail = await checkPassword(meta, req.headers.get("x-password"));
if (pwFail) return pwFail;
// ...then the existing decrementDownloadCounter() call, unchanged.
```

### Meta endpoint addition (`src/app/api/files/[id]/meta/route.ts`)
```typescript
// Source: existing file, src/app/api/files/[id]/meta/route.ts:37-44 — add one field
return NextResponse.json({
  name: meta.name,
  type: meta.type,
  size: meta.size,
  passwordProtected: Boolean(meta.passwordHash),
  verifyRequired: Boolean(meta.recipientEmails?.length), // NEW — never return the emails
  downloadsRemaining: meta.downloadsRemaining,
  expiresAt: meta.expiresAt,
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| n/a — greenfield within this app | Header-based short-lived proof token (`x-verify-token`) alongside the existing `x-password` header | This phase | No accounts/sessions needed; consistent with the app's stateless/anonymous model |

No externally-deprecated APIs are involved — Mailgun's `/v3/{domain}/messages` endpoint and Basic-Auth scheme are the current, stable API surface [CITED: documentation.mailgun.com].

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | 6-digit numeric code, 10-minute TTL, 5-attempt lockout per code, and a 1-request-per-60s-per-(file+IP) rate limit doubling as the "resend cooldown" are reasonable defaults | Standard Stack / Architecture Patterns | Low — these are UX/tuning knobs, easily changed via env vars later, no architectural risk |
| A2 | The verify-token is reusable (not single-use) for its full TTL (recommend 30 min), so a recipient can retry/re-download without re-verifying within the window | Pattern 1 | Low-medium — if the user wants strict single-use, this needs a `redis.del()` after first successful `GET /api/files/[id]`, which changes the "multiple downloads allowed" UX for verify-gated files; flag for user confirmation during planning |
| A3 | Storing recipient emails in plaintext (lowercased/trimmed, not hashed) in `StoredMeta` is acceptable, since the server must be able to email them | Data Model / CONTEXT open question | Medium — this is the privacy tradeoff CONTEXT.md explicitly flagged; the mitigation (never return emails to any client, membership-check-only via `request-code`) is the standard minimal-exposure pattern, but the user should explicitly confirm this tradeoff is acceptable for their otherwise-anonymous app |
| A4 | `mailgun.js` npm package name/version cited in Alternatives Considered is accurate | Standard Stack | Low — not recommended for use, informational only; confirmed to exist via `npm view` but package identity itself came from training knowledge, not official docs |
| A5 | Email-enumeration timing side-channel (Mailgun network call only fires on a match) is an acceptable residual risk for this phase, not something to actively countermeasure (e.g. with an artificial constant-time delay) | Pitfall 4 / Security Domain | Low — matches the app's existing low-stakes anonymous-sharing threat model; if the user has stricter requirements, this should be raised during `/gsd-discuss-phase` or planning |
| A6 | `MAILGUN_SENDING_REGION` (values `"us"`/`"eu"`, default `"us"`) is the right env-var shape, rather than asking the user for a raw base-URL string | Pattern 3 | Low — CONTEXT.md left this open ("`MAILGUN_SENDING_REGION` or base URL"); a raw base-URL env var is an easy fallback if the user prefers that instead |

## Open Questions

1. **Is the verify-token single-use or reusable within its TTL?**
   - What we know: CONTEXT.md says "mark a file verified for this recipient/session."
   - What's unclear: Whether "session" means "good for exactly one download" or "good for the whole browser session/TTL window," especially relevant when `downloadsRemaining > 1` for the same link.
   - Recommendation: Reusable within a 30-minute TTL (A2) — simplest, matches "session" semantics, and doesn't block legitimate multi-download links. Flag for explicit confirmation in `/gsd-plan-phase` or `/gsd-discuss-phase` if not already settled.

2. **Mailgun sending domain + region are still pending from the user (per CONTEXT.md).**
   - What we know: Code can be built entirely against env vars now; nothing here blocks planning or implementation.
   - What's unclear: The actual `MAILGUN_DOMAIN` value and whether it's US or EU region.
   - Recommendation: Ship with `MAILGUN_SENDING_REGION` defaulting to `"us"` (Mailgun's default region) and treat missing/invalid Mailgun env vars as a clear 500 with a descriptive error (`"Mailgun env vars not configured"`), never a silent no-op — so a misconfigured deploy fails loudly during manual QA, not silently for real recipients.

3. **Cap on number of recipient emails per upload.**
   - What we know: CONTEXT.md says "multiple recipient emails allowed" with no explicit cap.
   - What's unclear: Whether an unbounded list should be allowed.
   - Recommendation: Cap at a small number (e.g. 10) purely to keep `StoredMeta` JSON small and cap Mailgun send volume per file — this is a straightforward `validateClientMeta()` extension, not a design question, but flagging the exact number for the planner to lock in.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| Upstash Redis (`UPSTASH_REDIS_REST_URL`/`TOKEN`) | Code/attempt/token storage, rate limiting | Already required by existing Phase 4 infra — assumed present in production per `.env.example` | — | Dev fallback: in-memory shim in `src/lib/redis.ts` (must be extended to support `get`, per Pattern 1) |
| `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_SENDING_REGION`, `MAILGUN_FROM` | Sending the verification email | ✗ — pending from user (CONTEXT.md) | — | None for actual sends; code should fail loudly (500) rather than silently no-op when these are unset, so the gap is visible during QA rather than shipping a silently-broken verify flow |
| Node 18+ (`fetch`, `FormData`, `crypto.getRandomValues`) | Mailgun call, token/code generation | ✓ | [VERIFIED: .planning/codebase/STACK.md:17] "Node.js 18+ (required for `crypto.subtle` Web Crypto API)" | — |

**Missing dependencies with no fallback:**
- Real Mailgun credentials — cannot be tested end-to-end (actual email delivery) until the user provides them. The request-code/verify-code/gate logic itself can be fully built and unit/integration tested (mocking the Mailgun `fetch` call) without live credentials.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|-----------------|---------|-------------------|
| V2 Authentication | Partial | The 6-digit code is a possession-factor proof (control of the recipient inbox), not account authentication — no accounts exist in this app |
| V3 Session Management | Yes | The opaque `verify-token` acts as a minimal, short-TTL, single-purpose session artifact — generate with CSPRNG (`crypto.getRandomValues`), store server-side keyed to file id, never derive it from predictable input |
| V4 Access Control | Yes | `GET /api/files/[id]` is the sole enforcement point (as it already is for password + download-count) — the new check must be structurally identical to the existing `checkPassword()` gate |
| V5 Input Validation | Yes | Email format + length validated server-side in `validateClientMeta()` extension (never trust client `passwordProtected`-style booleans); code input validated as exactly 6 digits before hashing/comparing |
| V6 Cryptography | Yes | Code and token generation must use `crypto.getRandomValues`/`crypto.subtle` (already the project's only crypto primitive, `src/lib/crypto.ts`) — never `Math.random()` |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|------------------------|
| Recipient-email enumeration via `request-code` | Information Disclosure | Always-identical generic response regardless of membership (Pattern 2 / Pitfall 4) |
| Code brute-force | Elevation of Privilege | Per-code attempt lockout (delete code after N failures) + per-(file+IP) rate limit (`checkVerifyAttemptLimit`), mirroring `checkPasswordAttemptLimit` |
| Verify-token guessing | Elevation of Privilege | High-entropy opaque token (24 random bytes via `crypto.getRandomValues`, base64url via existing `toBase64Url`), short TTL, server-side Redis lookup only |
| Verify-token reuse/leakage via logs | Information Disclosure | Send only as a request header (`x-verify-token`), never as a URL query parameter (URLs land in server logs / browser history / Referer headers; headers on a same-origin fetch do not) |
| Download-counter exhaustion via unverified probing | Denial of Service | Verify check happens before `decrementDownloadCounter()` (Pitfall 2) — probing without a valid token never consumes a download |
| Redis outage during verification | Availability vs. Access Control tradeoff | Follow the project's existing convention: rate limiters fail OPEN (`src/lib/rate-limit.ts:93` comment — availability over strictness), but the verify-token *check itself* should fail CLOSED (refuse download) on Redis error, matching the existing `decrementDownloadCounter()` catch block (`src/app/api/files/[id]/route.ts:77-79`, "counter unavailable" 503) rather than silently bypassing the gate |

## Sources

### Primary (HIGH confidence)
- Codebase reads (this session): `src/lib/redis.ts`, `src/lib/rate-limit.ts`, `src/lib/storage.ts`, `src/lib/blob-storage.ts`, `src/lib/server-storage.ts`, `src/lib/crypto.ts`, `src/lib/request-ip.ts`, `src/app/upload/page.tsx`, `src/app/download/page.tsx`, `src/app/api/files/route.ts`, `src/app/api/files/[id]/route.ts`, `src/app/api/files/[id]/meta/route.ts`, `.env.example`, `package.json`, `.planning/codebase/STACK.md`, `.planning/config.json`, `.planning/ROADMAP.md`
- [Node.js crypto module docs](https://nodejs.org/api/crypto.html) — `crypto.randomInt` signature/behavior (Alternatives Considered)

### Secondary (MEDIUM confidence)
- [Mailgun Authentication docs](https://documentation.mailgun.com/docs/mailgun/api-reference/mg-auth) — Basic-auth scheme, US/EU base URLs
- [Mailgun Messages API reference](https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/messages) — required fields, multipart/form-data requirement

### Tertiary (LOW confidence)
- `mailgun.js` / `form-data` npm package names (training knowledge, registry existence confirmed via `npm view`, not from official docs) — informational only, not recommended for use (see Alternatives Considered)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, entirely built on already-verified in-repo code
- Architecture / gate placement: HIGH — determined by reading the actual download-authorization route and confirming there is exactly one ciphertext-access enforcement point in both storage modes
- Mailgun wire format: MEDIUM — CITED from official docs, not independently test-sent (no live credentials available this session)
- Pitfalls / defaults (TTLs, attempt counts, token reuse): LOW-MEDIUM — reasonable, consistent defaults; flagged in Assumptions Log for explicit confirmation during planning/discussion

**Research date:** 2026-09-08
**Valid until:** 2026-10-08 (30 days — stable internal architecture; re-check Mailgun docs if send implementation is deferred significantly)
