# 08-02 Summary — Upload client (token → parts → finalize)

**Plan:** retroactive (executed inline 2026-09-17)
**Status:** Complete. 11 tests in GembaUploadTests; verified end-to-end against production.

## What was built (`macos/GembaKit/Sources/GembaUpload/`)
- `ShareConfiguration.swift` — `FilesendEndpoint`, `StorageMode`, `ShareOptions` (with a local
  mirror of the server's `validateClientMeta` bounds, so a bad combination fails before anything
  is encrypted), `ShareItem`, `ShareResult`.
- `BlobClient.swift` — the `@vercel/blob/client` protocol reimplemented: the
  `blob.generate-client-token` handshake against `/api/files`, then a direct PUT to the Blob API
  with `x-api-version`, the store id parsed out of the client token, and `x-vercel-blob-access`.
- `FilesendAPI.swift` — storage mode, fs-mode part upload, finalize, notify.
  `FinalizeBodyBuilder` is extracted as a pure function precisely so a test can assert what
  leaves the machine.
- `ShareUploader.swift` — the actor that runs a whole share: one id, one key, per-file encrypt →
  upload, one finalize, one link, optional notify. The encryption-failure fallback restarts the
  whole loop rather than mixing encrypted and plaintext files under one key.
- `Sources/gemba-send` — a CLI over the same core, used as the end-to-end harness.

## Verification
- Contract tests: option bounds, download-limit clamping, the server's email regex, recipient
  normalisation, store-id parsing, blob error decoding, part pathname prefix, expiry in epoch ms.
- **The finalize body is asserted to contain no key material** — no key, no `keyBase64`, and
  `encrypted` omitted when true (the server defaults to encrypted; only an explicit `false`
  marks the fallback).
- End-to-end against https://send.gemba.uk: a two-file share uploaded from the Mac, then
  downloaded through the real API and decrypted by the WEB's crypto via
  `scripts/verify-interop.mjs` — both files byte-identical, layout confirmed as IV+ciphertext+tag.
- Password path produces `&pw=1#key` and finalizes without error.

## Notes
- Progress is weighted by file size across the whole share, split 50/50 between encrypt and
  upload per file, so the bar never rewinds between files.
- `/api/notify` receives the full link, fragment included — the key does reach the server on that
  one path. This mirrors the web app, which must do the same to email a working link, but the
  comment at `src/app/upload/page.tsx:418` ("never a key") reads as though it does not.
