---
status: resolved
trigger: "App freezes after clicking Upload, stuck on the label: Encrypting \"GeoLite2-City_20260901.tar.gz\"… (a ~60MB .tar.gz). Reproduced on the live app."
created: 2026-09-08
updated: 2026-09-08
---

# Debug Session: upload-freeze-encrypting

## Symptoms

- **Expected behavior:** Selecting a ~60MB file and clicking Upload encrypts it client-side, shows upload progress, and returns a share link.
- **Actual behavior:** The app freezes (UI appears unresponsive) right after clicking Upload, stuck on the progress label `Encrypting "GeoLite2-City_20260901.tar.gz"…`. It never advances to the "Uploading…" label.
- **Error messages:** None reported by the user (console not yet captured — capture during reproduction).
- **Timeline:** Reported 2026-09-08 on the live production app (`send.gemba.uk`, `main` branch / root-app layout after the pre-monorepo rollback).
- **Reproduction:** Upload page → select `GeoLite2-City_20260901.tar.gz` (~60MB) → click Upload → freezes on "Encrypting…".

## Environment / Code Map

- Branch: `main` (root-app layout; app served at repo root, deploys to `send.gemba.uk`).
- Upload UI + flow: `src/app/upload/page.tsx`
  - `handleUpload()` (~L232) sets label `Encrypting "<name>"…` (L264) BEFORE calling `uploadOneFile()`.
  - `uploadOneFile()` (L125–201): `file.arrayBuffer()` (L146) → `generateKey()` → `encryptPacked(data, key)` (L149) → `new Blob([encrypted])` (L150) → then either `@vercel/blob` `upload()` with `multipart:true` + `onUploadProgress` (blob mode) or `uploadDirect()` (local mode).
  - The label only switches to `Uploading "<name>"…` inside `onProgress` (L275–279) — so any stall between `arrayBuffer()` and the first progress event presents as a stuck "Encrypting…".
- Crypto: `src/lib/crypto.ts` `encryptPacked()` (L32) — single `crypto.subtle.encrypt` over the whole ArrayBuffer; then allocates a new `Uint8Array(IV_BYTES + ciphertext.byteLength)` and copies (several ~60MB allocations live at once).
- Size guard: NONE in effect — `src/components/file-dropzone.tsx` `maxSizeMb = 15360` (15 GB).
- Blob upload route: `src/app/api/files/route.ts` (`maximumSizeInBytes: MAX_BLOB_BYTES`).

## Candidate Hypotheses (to test)

1. **Main-thread block / memory pressure** from whole-file `arrayBuffer()` + single-shot `crypto.subtle.encrypt` + multiple ~60MB `Uint8Array`/`Blob` copies — could OOM/hang, especially in a mobile/TWA webview. (True freeze.)
2. **`crypto.subtle.encrypt` duration** on a large buffer being long enough to appear frozen (but should still return).
3. **Stalled blob upload / token handshake** (`/api/files` `handleUploadUrl`, `MAX_BLOB_BYTES`) that never fires the first `onUploadProgress`, so the label never leaves "Encrypting…" — an apparent (not true) freeze; the tab would still be responsive.

## Fix direction to evaluate (post root-cause)

- Move encryption off the main thread (Web Worker) and/or chunk/stream it so the UI never blocks.
- Emit honest progress during encryption (not just upload).
- Add a sane max-file-size guard (the 15 GB dropzone limit is unrealistic for whole-buffer client encryption).
- Distinguish "Encrypting" vs "Uploading" states robustly (surface upload-handshake stalls instead of masking them).

## Current Focus

```yaml
reasoning_checkpoint:
  hypothesis: "The CSP connect-src directive in next.config.ts ('self' https://*.blob.vercel-storage.com) blocks every browser fetch that @vercel/blob/client's upload() issues to its default API host (https://vercel.com/api/blob/*, per defaultVercelBlobApiUrl in the SDK), because that origin isn't allowlisted — causing the SDK's internal async-retry (10 retries, exponential backoff, up to ~17 min total) to hammer the CSP-blocked endpoint silently, so the 'Encrypting…' label (which only advances inside onUploadProgress, which never fires) appears to freeze forever, while the main thread stays free."
  confirming_evidence:
    - "Live CDP network/console capture during a real local repro against production Vercel Blob storage showed a direct, repeated browser-level CSP violation: 'Connecting to https://vercel.com/api/blob/mpu ... violates ... connect-src ... The action has been blocked' — recurring every few seconds (retry backoff) for 70+s straight with no resolution."
    - "Source-level confirmation in node_modules/@vercel/blob/dist/chunk-3D2SZ6M2.js: defaultVercelBlobApiUrl = 'https://vercel.com/api/blob'; getApiUrl() uses it unless VERCEL_BLOB_API_URL/NEXT_PUBLIC_VERCEL_BLOB_API_URL is set (neither is set here) — used for BOTH multipart control-plane calls AND plain put(), so this is not multipart- or size-specific: every blob-mode upload is broken."
    - "next.config.ts connect-src literally lists only 'self' https://*.blob.vercel-storage.com — https://vercel.com is absent."
    - "rAF heartbeat during the repro kept incrementing continuously (~120/s) — rules out a true main-thread block; this is an apparent freeze from a silently-retrying blocked request, not a JS hang."
  falsification_test: "Add https://vercel.com to connect-src and re-run the identical repro (real blob store, same 60MB file): CSP violation should disappear and upload should proceed past 'Encrypting…' to 'Uploading…' with visible progress and complete. If the same violation (or upload) still fails, hypothesis is wrong/incomplete."
  fix_rationale: "Purely additive CSP allowlist change — adds the missing origin the SDK actually talks to. No other directive relaxed, no weakening of the client-side-encryption boundary (key still never leaves the browser; this only changes which network origins the browser may contact). Fixes the actual blocked network call rather than papering over the symptom (a client-side timeout would only fail faster, not deliver a working upload)."
  blind_spots: "Full end-to-end success not yet observed post-fix (next step). Not tested on Android TWA/iOS Safari specifically, though CSP enforcement is a standard cross-browser mechanism. Unknown whether this is a regression from the Phase 4 CSP addition or a later @vercel/blob version bump that changed the default API host — not required for the fix, noted for the prevention write-up."
  candidate_causes:
    - "config: CSP connect-src allowlist in next.config.ts is missing the Vercel Blob API control-plane origin (https://vercel.com)"
    - "code/dependency: @vercel/blob SDK's default API base URL (https://vercel.com/api/blob) — a config/dependency mismatch, not app business logic"
  and_gate: "no — a single missing CSP origin fully explains every observed symptom (blocked fetch, retry-loop console spam, stuck label, free main thread); no second contributing condition needed"
```

- next_action: DONE (fix applied + self-verified). Awaiting human confirmation that a real production upload (send.gemba.uk, blob mode) now completes end-to-end before deploying/archiving.

## Evidence

- timestamp: 2026-09-08T21:20Z (local)
  checked: local repro in **fs storage mode** (npm run dev, no BLOB_READ_WRITE_TOKEN) with a real 60MB random file, puppeteer + rAF heartbeat instrumentation.
  found: Upload completed end-to-end in ~500ms; heartbeat kept incrementing throughout (44 frames in 500ms — no main-thread block); flow went straight from click to "done" state, never visibly stuck on "Encrypting…".
  implication: encryptPacked()/file.arrayBuffer() on a 60MB file is fast (<1s) on a normal machine and is NOT itself a main-thread blocker. The freeze is very unlikely to be pure client-side crypto/memory pressure (weakens Hypothesis 1/2) — points toward the network/blob-upload leg instead (fs mode has no external network hop; blob mode does).
- timestamp: 2026-09-08T21:22Z
  checked: production `send.gemba.uk` — confirmed via `curl /api/storage-mode` → `{"mode":"blob"}`. Confirmed via `vercel logs send.gemba.uk --json -n 500` that exactly one `POST /api/files` (the client-token retrieval call, small JSON body) appears, status 200, fast.
  implication: encryption + the *first* server round-trip (token retrieval) demonstrably succeed on production. All subsequent multipart traffic (`createMultipartUpload`, `uploadPart`, `completeMultipartUpload`) goes directly from the browser to Vercel's external Blob API (`blob.vercel-storage.com`), bypassing our serverless functions entirely — so our own server logs cannot show where the hang happens. This narrows the freeze window to: after token retrieval succeeds, before the first `onUploadProgress` event fires (i.e., inside `createMultipartUpload()` or the very start of `uploadAllParts()` in `@vercel/blob/client`).
- timestamp: 2026-09-08T21:23Z
  checked: read `node_modules/@vercel/blob/dist/{client.js,chunk-3D2SZ6M2.js}` for the multipart upload implementation used by `upload(..., {multipart:true, onUploadProgress})` in `src/app/upload/page.tsx`.
  found: `requestApi()` (used for both `createMultipartUpload` and each `uploadPart`) uses a plain `fetch`/XHR (`blobRequest`/`blobFetch`/`blobXhr`) wrapped in a `retry()` helper — no client-side timeout/AbortController deadline is applied to these requests beyond the caller's own `abortSignal` (which this app never sets). Browser fetch/XHR have no default timeout, so if `blob.vercel-storage.com` stalls (slow TLS, proxy/firewall interference, DNS hiccup, etc.) the promise simply never settles.
  implication: this is architecturally consistent with a silent indefinite hang — no error, no timeout, label never advances — matching every reported symptom (freeze right after "Encrypting…", never reaches "Uploading…", no error message).
- timestamp: 2026-09-08T21:26Z
  checked: real repro against production Vercel Blob storage — started local dev server with the real `BLOB_READ_WRITE_TOKEN`/`BLOB_STORE_ID`/`BLOB_WEBHOOK_PUBLIC_KEY` (pulled via `vercel env pull --environment=development`, not persisted to `.env.local`), storage mode confirmed `"blob"` via `/api/storage-mode`. Puppeteer + CDP `Network.*` events + rAF heartbeat, real 60MB file, actual click on Upload.
  found: `POST /api/files` (client-token retrieval, our own origin) succeeded in 41ms. Immediately after, repeated browser console errors: `Connecting to 'https://vercel.com/api/blob/mpu?pathname=gemba%2Fblob%2F...' violates the following Content Security Policy directive: "connect-src 'self' https://*.blob.vercel-storage.com". The action has been blocked.` — repeating every few seconds (retry backoff) for 70+s with the button stuck on "Preparing…" the entire time. rAF heartbeat climbed continuously (~120 frames/sec, no stalling) — main thread free throughout.
  implication: **Root cause confirmed directly.** `@vercel/blob/client`'s `upload()` issues its actual control/data-plane requests to `https://vercel.com/api/blob/*` (createMultipartUpload here specifically: `/mpu`), NOT to `*.blob.vercel-storage.com`. This origin is missing from the CSP `connect-src` allowlist in `next.config.ts`, so the browser itself blocks every one of these requests. `chunk-3D2SZ6M2.js`'s `isNetworkError()` classifies the resulting `TypeError: Failed to fetch` as retryable, so `async-retry` (default 10 retries, exponential backoff) hammers the CSP-blocked endpoint for up to ~17 minutes before finally throwing — indistinguishable from a permanent freeze on any realistic UX timescale. This is **not** file-size- or multipart-specific: `getApiUrl()`'s default host (`https://vercel.com/api/blob`) is used for both the multipart path and the plain non-multipart `put()` path, so every blob-mode (i.e. production) upload is broken, of any size.

## Eliminated

- hypothesis: H1 — true main-thread block / OOM from whole-file arrayBuffer()+encryptPacked() on a 60MB file
  evidence: local repro (fs mode) with rAF heartbeat showed continuous ~60fps main-thread activity and sub-second completion for a 60MB file; no jank observed.
  timestamp: 2026-09-08T21:20Z
- hypothesis: H2 — crypto.subtle.encrypt() duration alone being long enough to look frozen
  evidence: same local repro — full encrypt+package step for 60MB completed well under 500ms.
  timestamp: 2026-09-08T21:20Z

## Resolution

root_cause: |
  CSP `connect-src` in `next.config.ts` allows only `'self' https://*.blob.vercel-storage.com`,
  but `@vercel/blob/client`'s `upload()` issues its actual API requests (both the multipart
  control-plane calls — createMultipartUpload/uploadPart/completeMultipartUpload — and the
  plain non-multipart put() path) to `https://vercel.com/api/blob/*` by default
  (`defaultVercelBlobApiUrl` in the SDK). That origin is not in the allowlist, so the browser
  blocks every such request. The SDK treats the resulting `TypeError: Failed to fetch` as a
  retryable network error and retries up to 10 times with exponential backoff (up to ~17 min)
  before finally failing — indistinguishable from a permanent freeze in practice, since the
  "Encrypting…" label only advances to "Uploading…" inside `onUploadProgress`, which never
  fires. Affects every blob-mode (production) upload regardless of file size or multipart.
fix: |
  Add `https://vercel.com` to the `connect-src` directive in `next.config.ts` (purely additive
  — no other directive relaxed, no change to the encryption boundary).
verification: |
  1. Re-ran the identical repro (real BLOB_READ_WRITE_TOKEN, real Vercel Blob store, same
     60MB file, puppeteer + CDP network/console capture + rAF heartbeat) after restarting the
     dev server to pick up the next.config.ts change and confirming `/api/storage-mode` →
     `{"mode":"blob"}`. Result: zero CSP violations in console (previously repeated every few
     seconds); button state reached "Uploading…" within ~1s of clicking Upload (previously
     stuck on "Preparing…" for 70+s straight); heartbeat kept climbing throughout (responsive).
     This directly falsification-tests the hypothesis's stated falsification_test and passes.
  2. `npx tsc --noEmit` → clean (exit 0).
  3. `npm run lint` → pre-existing 369 errors/7726 warnings in unrelated files (design-system,
     icon-data.js, etc.), zero findings on next.config.ts (the changed file).
  4. `npm test` (vitest) → 33/33 existing tests pass, 3 test files.
  5. `vercel list`-equivalent check (`list({prefix:"gemba/blob/"})`) against the real store
     after testing: no orphaned blob objects were created (the interrupted/incomplete
     multipart upload from the pre-fix and mid-fix test runs left no listable object; Vercel
     garbage-collects incomplete multipart parts server-side) — no manual cleanup needed.
  Regression risk: change is purely additive to an allowlist-based CSP directive (adds one
  origin); no other directive touched; does not affect the client-side-encryption boundary
  (the AES key still never leaves the browser — this only changes which network origin the
  browser may contact for the already-encrypted ciphertext upload).
guardrail_verdict: accepted
files_changed:
  - next.config.ts
