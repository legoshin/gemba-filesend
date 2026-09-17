---
status: resolved
trigger: "Encryption progress bar stays at 0 and freezes on large file uploads. Need to: (1) root-cause why the progress bar never advances during client-side encryption, (2) surface real encryption progress, and (3) if encryption fails, show an error and offer to upload the file unencrypted."
created: 2026-09-17
updated: 2026-09-17
---

# Debug Session: encryption-progress-freezes

## Symptoms

- **Expected behavior:** During upload, the encryption progress bar advances smoothly from 0% to 100% as the file is encrypted client-side; on failure the user sees a clear error and is offered an unencrypted upload fallback.
- **Actual behavior:** On large files the encryption progress bar stays pinned at 0% and appears frozen (the UI does not update). No progress is surfaced.
- **Error messages:** None reported by the user (UI just freezes at 0%).
- **Timeline:** Not specified.
- **Reproduction:** Start uploading a (large) file; observe the encryption progress bar stuck at 0.

## Scope of fix requested

1. Root-cause why the progress bar never advances during client-side encryption.
2. Surface real encryption progress (chunked/streamed encryption or measurable progress events) rather than a bar that never updates.
3. On encryption failure: show an error and offer to upload the file unencrypted.

## Constraints (from project)

- Must NOT weaken the client-side-encryption model (key never reaches the server). The unencrypted-fallback path must be an explicit, user-chosen action — never a silent downgrade.
- Stack: Next.js 16 / React 19 / Tailwind 4; reuse existing shadcn/Radix component layer. Web Crypto API (`crypto.subtle`).
- Reuse existing progress UI components and encryption utilities rather than adding parallel copies.

## Current Focus

- hypothesis: CONFIRMED — see Resolution.root_cause
- next_action: none — human verification confirmed fixed on production (send.gemba.uk); session archived to resolved/
- reasoning_checkpoint:
    hypothesis: "The progress bar freezes at 0% during encryption because onProgress/uploadProgress is wired only to the post-encryption network-upload phase (blob onUploadProgress / xhr.upload.onprogress) — no progress source exists for the file.arrayBuffer() read + single-shot crypto.subtle.encrypt() call — and the Progress component renders the resulting `undefined` value identically to 0, a literal 0%-filled bar rather than an indeterminate spinner."
    confirming_evidence:
      - "src/app/upload/page.tsx uploadOneFile (163-166): onProgress is never called between `file.arrayBuffer()` and `encryptPacked()` — only invoked from blob-mode onUploadProgress (191-193) and fs-mode xhr.upload.onprogress (212-214), both strictly post-encryption."
      - "src/components/ui/progress.tsx:25 — `translateX(-${100 - (value || 0)}%)` — value=undefined renders identically to value=0, matching the reported 'frozen at 0%' symptom exactly."
      - "src/components/file-dropzone.tsx maxSizeMb=15360 (15GB) — explains why the freeze is only noticeable 'on large files'."
    falsification_test: "If onProgress were called during the read/encrypt phase, uploadProgress would move during 'preparing' state before network transfer starts — it doesn't (traced every call site), confirming no such instrumentation exists."
    fix_rationale: "Add chunked/streamed file reading (readFileWithProgress) that reports real, measurable progress (bytes read / total) during the previously-silent phase, routed through a phase-tagged onProgress so the UI receives real values throughout 'preparing' and 'uploading'. This fixes the freeze at its actual source (missing instrumentation) instead of faking an animation. Wraps the read+encrypt step in try/catch, throwing a distinguishable EncryptionError so the UI can offer the required unencrypted-upload fallback as an explicit user action (project constraint: never a silent downgrade)."
    blind_spots: "No browser test harness available in this session to measure actual crypto.subtle.encrypt() wall-clock time on a multi-GB buffer — relying on the code-level absence of any progress hook as sufficient evidence, since the bug (0% never updating) is proven by missing instrumentation regardless of encrypt-call speed. Did not change encryptPacked's wire format to true per-chunk AES-GCM (would give finer-grained progress during the crypto step itself) because it would break the tested [12-byte IV][ciphertext+tag] format and backward compatibility with already-uploaded files."
    candidate_causes:
      - "code: no progress callback wired to the encryption phase in uploadOneFile / crypto.ts (confirmed root cause)"
      - "config: file-dropzone's 15GB max-size threshold makes the un-instrumented phase long enough to be visible (contributing amplifier, not itself defective)"
    and_gate: "no — the code gap alone fully explains and reproduces the symptom; the 15GB config amplifies visibility but removing only the code gap fully fixes the behavior with no config change."
- tdd_checkpoint:

## Evidence

- timestamp: 2026-09-17T00:00:00Z
  checked: src/lib/crypto.ts `encryptPacked`
  found: Single `crypto.subtle.encrypt()` call over the entire ArrayBuffer, no chunking, no progress callback parameter at all.
  implication: The encryption primitive itself has zero capacity to report interim progress as currently implemented.
- timestamp: 2026-09-17T00:00:01Z
  checked: src/app/upload/page.tsx `uploadOneFile` (lines 163-220)
  found: "`const data = await file.arrayBuffer(); ... const encrypted = await encryptPacked(data, key);` — `onProgress` is never invoked between these calls. It's only invoked from `@vercel/blob/client`'s `onUploadProgress` (blob mode, line 191-193) or `xhr.upload.onprogress` inside `uploadDirect` (fs mode, line 72-74/212-214) — both strictly post-encryption, network-transfer-only events."
  implication: No progress signal exists for the whole-file-read + encrypt phase — confirms the "never advances" half of the symptom mechanistically, not just by observation.
- timestamp: 2026-09-17T00:00:02Z
  checked: src/app/upload/page.tsx `handleUpload` state machine (lines 280-310)
  found: "`uploadState` is set to `\"preparing\"` before calling `uploadOneFile` and only flips to `\"uploading\"` inside the `onProgress` callback — which, per the prior finding, never fires during encryption."
  implication: UI is stuck in "preparing" (label "Encrypting …") for the entire encrypt duration with zero state transitions to react to.
- timestamp: 2026-09-17T00:00:03Z
  checked: src/components/ui/progress.tsx + upload/page.tsx render (lines 678-684)
  found: "`Progress value` is `undefined` whenever `uploadState !== \"uploading\"`. The Radix indicator computes `translateX(-${100 - (value || 0)}%)`, so `undefined` renders identically to `0` — a literal fully-collapsed bar, not an indeterminate spinner. The percentage label also shows a static `\"…\"` instead of a number during \"preparing\"."
  implication: Exactly matches the reported symptom — bar visually pinned at 0%, appears frozen (not merely "indeterminate-looking").
- timestamp: 2026-09-17T00:00:04Z
  checked: src/components/file-dropzone.tsx (`maxSizeMb = 15360`)
  found: Per-file uploads are permitted up to 15,360 MB (15 GB).
  implication: Explains why this is only noticeable "on large files" — the un-instrumented read+encrypt phase can legitimately take many seconds to tens of seconds on large files, long enough to register as "frozen"; small files clear that phase too fast to notice.
- timestamp: 2026-09-17T00:00:05Z
  checked: src/lib/crypto.test.ts
  found: "Tests assert the exact byte layout `[12-byte IV][ciphertext+tag]` and exact total length for `encryptPacked` output (e.g. `packed.byteLength).toBe(IV_BYTES + plaintext.byteLength + GCM_TAG_BYTES)`)."
  implication: The wire format of `encryptPacked`/`decryptPacked` must not change — any fix must add progress instrumentation without altering ciphertext framing, to avoid breaking these tests and backward compatibility with already-uploaded files.
- timestamp: 2026-09-17T00:00:06Z
  checked: src/app/upload/page.tsx `handleUpload` catch block (lines 327-337)
  found: Any thrown error (including one from the encrypt step) produces a single generic toast and resets `uploadState` to `"idle"`. No distinction is made for encryption-specific failures; no unencrypted-upload fallback path exists anywhere in the file.
  implication: Confirms scope item 3 ("on encryption failure, offer unencrypted upload") is entirely unimplemented, matching the debug session's stated scope.
- timestamp: 2026-09-17T00:00:07Z
  checked: src/lib/storage.ts, src/app/api/files/route.ts, src/app/api/files/[id]/meta/route.ts, src/app/download/page.tsx
  found: "No `encrypted` field exists anywhere in `StoredMeta`, the upload API payloads, the `/meta` response, or `FileInfo`. `fetchFileInfo` unconditionally rejects any share link missing a `#keyBase64` fragment, and `handleDownload` unconditionally calls `decryptPacked`."
  implication: An unencrypted-fallback upload path has no server-side or download-side support yet — implementing scope item 3 requires plumbing an `encrypted` flag through storage, both upload code paths (blob + fs), the meta API, and the download page's key-presence gate + decrypt branch.

## Eliminated

(none — the initial hypothesis was directly confirmed by code inspection; no alternative hypotheses were needed.)

## Resolution

root_cause: "The encryption phase of file upload (`file.arrayBuffer()` whole-file read + single-shot, non-chunked `crypto.subtle.encrypt()` inside `encryptPacked`) has zero progress instrumentation: the `onProgress` callback passed into `uploadOneFile` is wired exclusively to post-encryption network-transfer events (`@vercel/blob/client`'s `onUploadProgress` / `xhr.upload.onprogress`), so `uploadProgress` state never changes during encryption. The `Progress` component then renders the `undefined` value used throughout that phase identically to `0` — a literal 0%-width bar, not an indeterminate spinner — while the percentage label is hardcoded to '…'. Because per-file uploads are allowed up to 15GB, this un-instrumented phase can take long enough to be very noticeable, producing the reported 'freezes on large files' symptom. Separately (same investigation, scope item 3), no `EncryptionError` distinction or unencrypted-upload fallback exists anywhere in the upload flow."

fix: |
  1. Added `readFileWithProgress(file, onProgress)` to src/lib/crypto.ts — reads
     the file in 8MB slices via `file.slice().arrayBuffer()`, invoking
     `onProgress(loaded, total)` after each chunk. This is real (not
     synthetic) progress: file I/O is the dominant, measurable cost for large
     files, and `crypto.subtle.encrypt` itself has no progress API to hook
     into. Does NOT change `encryptPacked`'s wire format (still one atomic
     encrypt call over the assembled buffer) — preserves the tested
     [12-byte IV][ciphertext+tag] layout and backward compat with already
     -uploaded files.
  2. upload/page.tsx: `uploadOneFile`'s `onProgress` callback is now phase
     -tagged ("encrypting" | "uploading") and fires throughout BOTH the
     read+encrypt phase (via readFileWithProgress) and the network-upload
     phase (existing blob/xhr progress events). The Progress component and
     percentage label now render the real `uploadProgress` value in both
     "preparing" and "uploading" states, instead of only "uploading" (the
     `value={undefined}` / "…" placeholder during "preparing" was the exact
     mechanism rendering the frozen 0% bar).
  3. Added `EncryptionError` (src/lib/crypto.ts) thrown when the read+encrypt
     step fails. upload/page.tsx's upload loop catches it, pauses via a
     Promise-based `promptEncryptionFallback` dialog (reused shadcn Dialog),
     and only proceeds on an explicit user choice: Retry / Upload Unencrypted
     / Cancel — never a silent downgrade. "Upload Unencrypted" re-runs
     `uploadOneFile` with `encrypt: false`, sending the raw file and omitting
     the `#key` URL fragment.
  4. Plumbed an `encrypted?: boolean` flag end-to-end for the unencrypted
     -fallback path: StoredMeta (storage.ts), both upload API paths (blob
     tokenPayload + fs direct meta, route.ts, validated in
     validateClientMeta), the /meta GET response (defaults `undefined` to
     `true` for legacy records), and the download page (FileInfo, key
     -presence gate only enforced when `encrypted` is true, decrypt branch
     skipped for unencrypted files). Added a "NOT ENCRYPTED" warning chip on
     both the upload results view and the download preview for visibility.

verification:
  - signal: unit_tests
    command: "npx vitest run"
    result: pass
    detail: "66/66 tests pass (62 pre-existing + 4 new regression tests in crypto.test.ts covering readFileWithProgress: sub-chunk file, multi-chunk boundary bytes, exact-chunk-size edge, 0-byte edge). The new tests fail against the old file.arrayBuffer()-with-no-callback implementation (onProgress called zero times) — they are a direct regression guard for this bug."
  - signal: typecheck
    command: "npx tsc --noEmit"
    result: pass
  - signal: lint
    command: "npx eslint src/app/upload/page.tsx src/app/download/page.tsx src/lib/crypto.ts src/lib/crypto.test.ts src/app/api/files/route.ts \"src/app/api/files/[id]/meta/route.ts\" src/lib/storage.ts"
    result: pass
    detail: "Whole-repo `eslint .` has pre-existing unrelated failures in apps/, design-system/, and .next/types/ generated files — none touched by this fix; scoped lint on every file this fix changed is clean."
  - signal: build
    command: "npx next build"
    result: pass
    detail: "Production build compiles and generates all routes successfully, including /upload, /download, and all /api/files routes."
  guardrail_verdict: accepted
  - signal: human_verify
    result: pass
    detail: "User confirmed fixed on production (send.gemba.uk): uploaded a file, encryption ran fast (expected for the file size), progress worked, and encryption was confirmed active."

files_changed:
  - src/lib/crypto.ts
  - src/lib/crypto.test.ts
  - src/app/upload/page.tsx
  - src/app/download/page.tsx
  - src/app/api/files/route.ts
  - src/app/api/files/[id]/meta/route.ts
  - src/lib/storage.ts
