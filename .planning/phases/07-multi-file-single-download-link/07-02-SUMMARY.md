---
phase: 07-multi-file-single-download-link
plan: 02
subsystem: upload-client
tags: [multi-file, upload, encryption, finalize, one-link, notify]
requires:
  - src/lib/crypto.ts (generateKey/exportKeyBase64/encryptPacked/readFileWithProgress — reuse-only)
  - POST /api/files/finalize (07-01)
  - part uploads via gemba/blob/{id}/{index} + x-file-id/x-file-index (07-01)
provides:
  - Single-share upload flow in src/app/upload/page.tsx (one id + one key, per-file parts, finalize once)
  - One-link result card (ShareResult) listing the included files
  - Notify sends one { url } for the whole share
affects:
  - Plan 03 (download client consumes the one id + fragment key + meta.files)
tech-stack:
  added: []
  patterns:
    - "One AES-GCM key reused across N files, unique per-file IV via encryptPacked (GCM-safe); key only in the link fragment"
    - "Whole-share encryption flag: an 'unencrypted' fallback downgrades the entire share and restarts the part loop (never mixes encrypted + plaintext under one key)"
    - "Finalize-owned parts: client uploads each ciphertext part under {id}/{index}, then a single POST /api/files/finalize owns the one meta + one counter"
key-files:
  created: []
  modified:
    - src/app/upload/page.tsx
decisions:
  - "Password sent as plaintext to /api/files/finalize (server hashes with salt), replacing the old fs-mode client-side sha256Hex+salt — one hashing path, matches the legacy blob path"
  - "Encryption is a per-SHARE decision (single encrypted flag + single key); the retry/unencrypted/cancel fallback downgrades the whole share and restarts, rather than mixing per-file encryption states"
  - "Notify link label = single filename for one file, else 'N files'; one { fileName, url } entry for the whole share"
metrics:
  duration: ~12m
  completed: 2026-09-17
actuals:
  tokens: 2639
  tasks: 2
  commits: 1
status: complete
---

# Phase 07 Plan 02: Single-share upload flow + one-link result UI Summary

Selecting N files now yields ONE share: the client generates one id and one AES-GCM key, encrypts each file under that shared key (unique per-file IV via the unchanged `encryptPacked`), uploads each ciphertext part under the one id, finalizes with a single `POST /api/files/finalize`, and shows one link listing the included files. The key never leaves the browser except in the link's `#` fragment. Phase 6 notify still works — it now sends exactly one `{ url }` for the whole share.

## What was built

- **Single-share upload flow (`handleUpload`):** generates ONE `id` (`generateClientId`) + ONE key (`generateKey` → `exportKeyBase64`) per upload. For each file it calls `prepareFilePart` (reads off disk with real progress, then `encryptPacked(data, sharedKey)` — same key, fresh 12-byte IV per file). Parts upload sequentially:
  - **blob mode:** `upload(\`gemba/blob/${id}/${index}\`, part, { handleUploadUrl:"/api/files", clientPayload:{ finalize:true, id, index, total, size } })`; the returned `res.url` becomes that file's `blobUrl`.
  - **fs mode:** new `uploadPart` helper streams the part to `POST /api/files` with `x-file-id` / `x-file-index` (+ `x-file-total`) headers.
- **Finalize once:** after all parts land, a single `POST /api/files/finalize` with `{ id, files:[{name,type,size,blobUrl?}], password?, downloadsRemaining, expiresAt, recipientEmails?, encrypted }`. `blobUrl` per file in blob mode, omitted in fs mode.
- **One link:** `${origin}/download?id=${id}` `+ &pw=1` when password-protected `+ #${keyB64}` when encrypted.
- **One-link result UI:** `results: UploadResult[]` collapsed to a single `result: ShareResult` (shareLink + encrypted flag + `files[]` of name/size). The done card shows one `<Input>` + one copy control, the included files listed above it (reusing the `File01` icon row + `formatSize` + `Chip`), single "Upload Complete" / "Copy Link" copy, and the download-limit / expiry / password chips describing the one share (dropped the per-file "EACH").
- **Notify preserved (one link):** the `/api/notify` body's `links` is a single `{ fileName: <share label>, url: shareLink }`, kept inside its isolated try/catch so a notify failure never rolls back the upload.

## Encryption-fallback behavior (per-share)

Because the share has ONE key and ONE `encrypted` flag, the retry/unencrypted/cancel prompt now operates at the share level: choosing **unencrypted** downgrades the whole share and restarts the part loop with encryption off (never mixing encrypted + plaintext files under one key); **retry** re-encrypts the current file; **cancel** aborts. Partial uploads without a finalize are unreachable (T-07-08, accepted); in blob mode the earlier encrypted parts become orphaned blobs, in fs mode they are overwritten at the same `{id}/{index}` path.

## Threat mitigations applied

- **T-07-06 (key leakage):** `keyB64` appears only in the `shareLink` fragment — verified absent from all three request bodies (part clientPayload, finalize, notify).
- **T-07-07 (notify shape):** one `{ url }` for the share, inside the isolated try/catch (Phase 6 D-06-04 preserved).

## Deviations from Plan

**Auto-fixed (Rule 3 — surgical orphan removal):** removing the per-file loop orphaned `uploadOneFile`, `uploadDirect`, the `DirectMetaPayload` interface, and the client-side `sha256Hex`/`randomSaltBase64` password hashing (finalize hashes server-side). Removed them and their now-unused imports. No behavior change beyond the plan's intent.

Otherwise plan executed as written.

## Verification

- `npx tsc --noEmit`: **clean for `src/app/upload/page.tsx`.** The only errors are the pre-existing baseline `src/lib/crypto.test.ts` BlobPart/Uint8Array variance errors documented as out-of-scope in 07-01-SUMMARY (unchanged file, not introduced here).
- `npm run build`: **succeeds**; `/api/files/finalize` and `/upload` both registered.
- `npx eslint src/app/upload/page.tsx`: **clean.**
- `npm test`: **8 files, 101 passed** (notify `route.test.ts` unaffected).
- Acceptance greps: `generateKey()` count = 1; `/api/files/finalize` present; `formatSize` retained; `keyB64` used only in the fragment (line 403), never in a `JSON.stringify` body.
- `git diff package.json`: empty (no new dependency).

## Self-Check: PASSED

`src/app/upload/page.tsx` and this SUMMARY exist; commit `3c7b22e3` is present in git history.
