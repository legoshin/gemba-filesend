---
phase: 02-upload-page-redesign
reviewed: 2026-07-10T18:46:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/components/file-dropzone.tsx
  - src/app/upload/page.tsx
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-07-10T18:46:00Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed the reskinned upload flow (`src/app/upload/page.tsx`) and the dropzone
component (`src/components/file-dropzone.tsx`). The `diff_base` range spans both
the earlier behavioral rewrite (per-file upload, private-blob adaptation) and the
Phase 2 visual reskin, so both are evaluated in the files' current state.

**Encryption boundary — verdict: intact.** The AES key is generated per file,
exported to `keyB64`, and appears only in the returned share link's URL fragment
(`#${keyB64}`, line 200). It is never written into `clientPayload`, the `x-meta`
header, the request body, or any server-bound field. The reskin did not weaken
the client-side-encryption model.

However, the flow has one data-loss defect (successfully-uploaded share links
become unreachable after a mid-batch failure — and because the decryption key
lives only in that link, the file is then permanently orphaned), plus a
user-facing security-settings display mismatch, a cross-file duplication of
`formatSize`, and an asymmetry where the blob path ships the plaintext password
to the server. Details below.

## Critical Issues

### CR-01: Mid-batch upload failure orphans already-uploaded files (share links become unreachable)

**File:** `src/app/upload/page.tsx:297-307` (with render branch at `406` / `489-636`)
**Issue:** On a multi-file upload, each successful file's share link is pushed to
`results` and rendered only inside the `uploadState === "done"` branch. When any
file in the loop throws, the `catch` sets `setUploadState("idle")`, which renders
the *form* branch (lines 489-636) instead. The form branch never references
`results`, so the retained links are held in state but have no UI to display or
copy them. The inline comment ("Keep `results` so the user can still copy links
for files that succeeded before the failure") describes an intent the UI does not
fulfill. Because the AES decryption key exists *only* in that share link's
fragment, a link the user can never see means the already-uploaded, already-paid-
for file is permanently unrecoverable — effective data loss under the E2E model.
On the next action (`handleReset` or a retry) `results` is cleared, sealing the loss.
**Fix:** Either render partial results on failure, or move to a terminal
`"done"`/`"partial"` state that still shows the success card. Minimal version:
```tsx
} catch (err) {
  setUploadProgress(0);
  setProgressLabel("");
  // If any files already succeeded, keep the success view so their links
  // (which carry the only copy of the decryption key) stay reachable.
  setUploadState(collected.length > 0 ? "done" : "idle");
  toast.error(
    "Upload failed: " + (err instanceof Error ? err.message : "Unknown error"),
  );
}
```
(and have the success card communicate that the batch was partial).

## Warnings

### WR-01: Success-state chips show raw, unclamped security settings

**File:** `src/app/upload/page.tsx:464-473`
**Issue:** The confirmation chips render the raw `downloadLimit` / `expiryValue`
input strings, but the values actually stored server-side are clamped:
`downloadsRemaining = Math.max(1, Math.min(100, Number(downloadLimit) || 1))`
(line 243-246) and `expiresAt` uses `Math.max(1, Number(expiryValue) || 1)`
(line 247-249). So entering `999` shows "999 DOWNLOADS EACH" while the real limit
is 100; entering `0` shows "EXPIRES IN 0 DAYS"/"0 DOWNLOADS EACH" while the real
value is 1; entering non-numeric text renders it verbatim in the chip. This
misrepresents the actual access-control posture to the user on a security-
sensitive screen.
**Fix:** Compute the clamped values once (they already exist as
`downloadsRemaining` / the effective expiry) and display those in the chips, or
store the sanitized numbers in state and render them, rather than echoing the raw
input strings.

### WR-02: `formatSize` duplicated across files with divergent output

**File:** `src/app/upload/page.tsx:108-114` and `src/components/file-dropzone.tsx:103-109`
**Issue:** Two independent `formatSize` implementations exist. The dropzone uses a
`log`-based variant (`toFixed(1)`, trailing zeros trimmed via `parseFloat`); the
page uses a branch-based variant (`toFixed(1)` for KB/MB, `toFixed(2)` for GB, no
trimming). They produce inconsistent labels for the same file (e.g. a 1 GB file
renders as `1 GB` in the dropzone list but `1.00 GB` on the success card). This
violates the project's Reuse-First rule and yields inconsistent UX.
**Fix:** Extract one `formatSize` into a shared util (e.g. `@/lib/utils` or
`@/lib/format`) and import it in both files; delete the divergent copy.

### WR-03: Blob (production) path sends the plaintext password to the server

**File:** `src/app/upload/page.tsx:158-166` → `src/app/api/files/route.ts:89-93`
**Issue:** In `storageMode === "fs"` the password is hashed client-side
(`sha256Hex(password + salt)`, lines 178-183) and only the hash+salt leave the
browser. In `storageMode === "blob"` — the production path — the *plaintext*
password is placed in `clientPayload` (`password: usePassword ? password : undefined`)
and hashed server-side (route.ts:91-93). This asymmetry means the production
deployment receives the raw password over the wire, a weaker posture than the dev
path and inconsistent with the app's client-hashing model. (Note: this predates
the reskin and does not touch the AES key, so the E2E file-encryption boundary is
unaffected; the password is only a secondary access gate. Flagging for
consistency/hardening.)
**Fix:** Hash the password client-side in the blob path too (mirror the fs branch:
generate `salt`, compute `passwordHash`, and send `passwordHash` + `salt` in
`clientPayload` instead of `password`), then have `onBeforeGenerateToken` consume
the precomputed hash rather than re-hashing plaintext.

## Info

### IN-01: Whitespace-only password passes validation

**File:** `src/app/upload/page.tsx:234-237`
**Issue:** The guard is `usePassword && password.length === 0`. A password of
`"   "` (spaces) is accepted, giving the user a false sense of protection.
**Fix:** Validate against `password.trim().length === 0`.

### IN-02: Deprecated `unescape` in base64 encoding

**File:** `src/app/upload/page.tsx:66`
**Issue:** `btoa(unescape(encodeURIComponent(metaJson)))` relies on the deprecated
`unescape`. It works today but is a legacy idiom (pre-existing, only on the fs path).
**Fix:** Use a `TextEncoder`-based UTF-8 → base64 helper, or reuse an existing
encoding util from `@/lib/crypto`.

### IN-03: Empty download-limit pluralization renders an empty leading token

**File:** `src/app/upload/page.tsx:464-466`
**Issue:** `{downloadLimit} DOWNLOAD{Number(downloadLimit) !== 1 ? "S" : ""} EACH`
with an empty `downloadLimit` renders " DOWNLOADS EACH" (leading gap, wrong count).
Subsumed by WR-01 once the displayed value is the sanitized number.
**Fix:** Display the clamped numeric value (see WR-01), which removes this edge case.

---

_Reviewed: 2026-07-10T18:46:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
