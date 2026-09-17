# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## encryption-progress-freezes — Upload progress bar frozen at 0% during client-side encryption on large files
- **Date:** 2026-09-17
- **Error patterns:** progress bar stuck at 0, freezes on large file uploads, no progress during encryption, encryption never advances, undefined progress value renders as 0%
- **Root cause(s):** The read+encrypt phase of `uploadOneFile` (whole-file `file.arrayBuffer()` read + single-shot `crypto.subtle.encrypt()` in `encryptPacked`) had zero progress instrumentation — `onProgress` was wired only to post-encryption network-transfer events (`@vercel/blob/client`'s `onUploadProgress` / `xhr.upload.onprogress`), so `uploadProgress` state never changed during encryption; `Progress` component then rendered the resulting `undefined` value identically to `0` (literal 0%-width bar, not an indeterminate spinner), and the percentage label was hardcoded to "…" during that phase. 15GB max file size made the un-instrumented phase long enough to be visibly "frozen."
- **Fix:** Added `readFileWithProgress()` to crypto.ts (8MB-sliced `file.slice().arrayBuffer()` reads reporting real `loaded/total` progress) without changing `encryptPacked`'s wire format; phase-tagged `onProgress` ("encrypting" | "uploading") so the bar/label move during both phases; added `EncryptionError` + an explicit user-choice fallback dialog (Retry / Upload Unencrypted / Cancel — never a silent downgrade); plumbed an `encrypted` flag end-to-end (storage, both upload API paths, /meta, download page) for the unencrypted-fallback path.
- **Files changed:** src/lib/crypto.ts, src/lib/crypto.test.ts, src/app/upload/page.tsx, src/app/download/page.tsx, src/app/api/files/route.ts, src/app/api/files/[id]/meta/route.ts, src/lib/storage.ts
- **Why not caught:** No gate existed for this class — the pre-existing test suite validated `encryptPacked`'s byte layout but never asserted that a progress callback fires during the read/encrypt phase, and this is a UI-observable behavioral gap (missing instrumentation), not a type error or lint violation, so typecheck/lint/build all passed with the bug present.
- **Recurrence guard:** Regression tests in `src/lib/crypto.test.ts` covering `readFileWithProgress` (sub-chunk file, multi-chunk boundary bytes, exact-chunk-size edge, 0-byte edge) — these assert `onProgress` is actually invoked with `(loaded, total)` during the read phase and fail against the old no-callback implementation, directly guarding this bug class from returning. Reinforced by this knowledge-base entry for future Phase-0 semantic recall on "progress bar frozen" / "progress never advances" symptoms.
---
