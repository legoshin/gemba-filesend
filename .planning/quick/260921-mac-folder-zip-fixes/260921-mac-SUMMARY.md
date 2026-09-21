---
phase: quick-260921-mac-folder-zip-fixes
plan: 01
subsystem: macos
tags: [swift, swiftui, zip, zlib, sandbox, share-extension]

requires: [v1.0 phase 08-macos-native-app]
provides:

  - "ZipWriter (macos/GembaKit/Sources/GembaUpload/ZipWriter.swift): streaming zip on system zlib; symlinks stored as links; NFC UTF-8 names; permissions; ZIP64"
  - "TextMorph as a single Text with glyph interpolation, middle-truncated"

affects: [macos-app, share-extension, folder-sharing]
audit_acknowledged:
  milestone: v1.1
  at: 2026-09-21
  status: unknown
---

# Quick fix — Mac app: garbled labels, folders with symlinks, zip speed

Reported from first real use of the macOS app (v1.0 phase 08, archived under
`.planning/milestones/v1.0-phases/08-macos-native-app/`).

## 1. Progress labels rendered as "Thai characters"

**Cause.** The native TextMorph laid out one view per character. A label longer than
its space ("Uploading Invoice … (4 of 8)…" in the Share Extension) was squeezed glyph by
glyph instead of truncated — letters overlapped (n→r, m→rr).
**Reproduced** with `ImageRenderer` at the extension's exact width before changing code.
**Fix.** One `Text` with `.contentTransition(.interpolate)`, middle truncation so the
"(n of m)" stays visible. SoftBlurIn (per-character) is `.fixedSize()`.

## 2. Folders failed in the Share Extension

`notebook`: "The file "jsesc" couldn't be opened"; `GitHubBackup`: same for "release".
**Cause.** Both are valid relative symlinks (`node_modules/.bin/jsesc`,
`.build/release`). `NSFileCoordinator .forUploading` zips links fine outside the sandbox
and fails on them inside it; the unit tests run unsandboxed and never saw it.
**Fix.** `ZipWriter` replaces it: links stored as links (never followed, never reads
outside the shared folder), empty dirs and exec bits kept, NFC names, ZIP64.
**Found while testing the fix:** the first inventory could drop entries silently —
`skipDescendants()` after a link entry, and a `/tmp` vs `/private/tmp` prefix mismatch.
Both fixed; anything unplaceable is now an error, and every test archive is compared
against an independent `find` listing and read by `unzip -t`, `ditto` and Python.

## 3. Compression speed

740 MB / 31,516 files: 81.9 s → 10.1 s. 115 MB: 13.5 s → 3.0 s. The cost was per-file
setup (a fresh 1 MiB buffer and zlib stream per file); now one reused stream and buffer,
batched writes, in-memory header patching, zlib fast level, and already-compressed
formats stored rather than re-deflated. Compression progress now drives the bar.

## Verification

- 48 tests (7 new for ZipWriter, incl. forced ZIP64 structures and an opt-in
  real-folder check: `GEMBA_ZIP_TEST_FOLDER=… swift test --filter testRealFolderIfProvided`).
- Installed, sandboxed Share Extension shared a folder with relative-file, directory,
  absolute and dangling links → uploaded, decrypted by the web's crypto, 8/8 files and
  links restored with links intact; no temp files left in its container.
- The user's `notebook` and `GitHubBackup` zipped **locally only** (not uploaded) and
  verified against `find` by all three readers.
