---
phase: 07-multi-file-single-download-link
plan: 01
subsystem: storage-api
tags: [multi-file, storage, blob, fs, download-counter, backward-compat]
requires:
  - src/lib/crypto.ts (encryptPacked/decryptPacked — reuse-only, unchanged)
  - src/lib/redis.ts (seedDownloadCounter/decrementDownloadCounter)
provides:
  - StoredFileEntry + StoredMeta.files? + resolveFiles(meta)
  - server-storage per-index parts (writeBlobPartFromWebStream/openBlobPartReadStream/blobPartSize/partBlobPath)
  - blob-storage blobPartPathnamePrefix(id)
  - POST /api/files/finalize (one meta + one counter seed)
  - GET /api/files/{id}/meta returns files[]
  - GET /api/files/{id}?index=N&consume=0|1 (index-addressable bytes, one decrement per share)
  - redis peekDownloadCounter(id)
affects:
  - Plan 02 (upload client -> part uploads + finalize)
  - Plan 03 (download client -> meta.files + ?index)
tech-stack:
  added: []
  patterns:
    - "Additive optional meta field (files?) + single resolveFiles() read path preserves legacy records with no migration"
    - "Finalize-owned uploads: token/headers mark parts so onUploadCompleted / fs part path skip meta+seed; finalize owns the single write"
    - "consume flag decouples 'serve bytes' from 'spend a download' — one decrement per whole-share download"
key-files:
  created:
    - src/app/api/files/finalize/route.ts
    - src/lib/multi-file.test.ts
  modified:
    - src/lib/storage.ts
    - src/lib/server-storage.ts
    - src/lib/blob-storage.ts
    - src/lib/redis.ts
    - src/app/api/files/route.ts
    - src/app/api/files/[id]/meta/route.ts
    - src/app/api/files/[id]/route.ts
decisions:
  - "Counter-decrement mechanism = consume query flag; default consume=1 preserves legacy one-decrement-per-download; consume=0 uses a non-decrementing peek gate (410 when exhausted)"
  - "Legacy top-level name/type/size (and blobUrl in blob mode) mirror files[0] so single-file readers keep working with zero migration"
  - "fs multi-file parts stored at {id}/{index}.bin; blob parts under gemba/blob/{id}/{index}; one meta + one dl:{id} counter per share"
metrics:
  duration: ~10m
  completed: 2026-09-17
actuals:
  tokens: 6668
  tasks: 3
  commits: 4
status: complete
---

# Phase 07 Plan 01: Multi-file Single Download Link (data model + storage + upload/read API) Summary

Storage + API layer now describe MANY files under ONE share id and ONE key without zipping and without touching the per-file wire format — proven end-to-end by a round-trip tracer test, a clean type-check, and a successful build. Legacy single-file shares still resolve, list, and download through the same code path.

## What was built

- **Meta schema (src/lib/storage.ts):** `StoredFileEntry { name, type, size, blobUrl? }`, optional additive `StoredMeta.files?`, and the pure `resolveFiles(meta)` helper — the single read path both legacy and multi-file readers go through (returns `files[]` when non-empty, else a length-1 legacy shape). No node-only imports, so browser + server can import it.
- **Per-index fs storage (src/lib/server-storage.ts):** `partBlobPath`, `writeBlobPartFromWebStream`, `openBlobPartReadStream`, `blobPartSize` for `{id}/{index}.bin`; `deleteEntry` now also recursively removes the `{id}` part directory. Legacy `{id}.bin` helpers left intact. `GEMBA_STORAGE_DIR` is read per-call so tests can point it at a temp dir.
- **Finalize route (src/app/api/files/finalize/route.ts):** `POST` writes exactly one `StoredMeta` (files[] + legacy top-level from files[0]) and seeds exactly one counter. Blob mode requires a blobUrl per file and validates each `new URL(blobUrl).pathname` starts with `gemba/blob/{id}/` (rejects foreign/mismatched blobs with 400). `MAX_FILES=25` cap. No key field accepted.
- **Upload route (src/app/api/files/route.ts):** blob `onBeforeGenerateToken` gained a finalize-marked part branch scoped to the trailing-slash share prefix; `onUploadCompleted` returns early (no meta/seed) for finalize-owned tokens; `handleDirectUpload` branches on `x-file-id`/`x-file-index` to write fs parts. Legacy single-file paths unchanged.
- **Read side:** meta route adds `files[]` (keeps every legacy top-level field); bytes route is index-addressable (`?index=N`) and uses the `consume` flag (`peekDownloadCounter` added to redis.ts for the non-decrementing gate).

## Finalize contract (for Plan 02)

Request `POST /api/files/finalize`:
```json
{
  "id": "<16-hex share id>",
  "files": [{ "name": "a.pdf", "type": "application/pdf", "size": 1024, "blobUrl": "https://.../gemba/blob/<id>/0-<suffix>" }],
  "password": "optional",
  "downloadsRemaining": 5,
  "expiresAt": 1699999999999,
  "recipientEmails": ["optional@example.com"],
  "encrypted": true
}
```
- `blobUrl` REQUIRED per file in blob mode (pathname must be under `gemba/blob/{id}/`); ignored in fs mode (parts already written via `x-file-id`/`x-file-index` part uploads).
- Response: `{ "id": "<id>", "files": <count> }`.
- Part upload (blob): client uploads each part to pathname `gemba/blob/{id}/{index}` with `clientPayload = { finalize: true, id, index, total, size }`.
- Part upload (fs): `POST /api/files` with headers `x-file-id: {id}`, `x-file-index: {index}`, body = ciphertext.

## Counter-decrement mechanism (REL-01)

One counter `dl:{id}` per share. `GET /api/files/{id}?consume=1` (default) decrements exactly once per whole-share download — preserving legacy single-file behavior. `consume=0` reads `dl:{id}` via `peekDownloadCounter` and returns 410 when `<= 0`, serving bytes without decrementing (lets a client fetch meta/first file then pull remaining files under one spend, at Plan 03's discretion). The whole share is reaped only when the counter hits 0 on a consuming request — never per file.

## Deviations from Plan

**None** — plan executed as written. One reuse-first addition within scope: added `peekDownloadCounter` to `src/lib/redis.ts` (reuses the existing `dl:{id}` key convention) rather than inlining a raw `"dl:"+id` get in the route, keeping the counter-key convention in one place.

## Threat mitigations applied

- T-07-01: finalize validates every blobUrl pathname under `gemba/blob/{id}/` (400 on foreign).
- T-07-02: token mint + fs part path use trailing-slash prefix / validated id + numeric index (no id-prefix collision).
- T-07-03: no route accepts or persists a key; crypto.ts untouched, wire format unchanged.
- T-07-04: `MAX_FILES=25` + per-file `MAX_BLOB_BYTES` + shared bounds via `validateClientMeta`.
- T-07-05: one decrement per whole-share download; non-consuming reads use a non-decrementing 410 gate; nx counter seed.

## Verification

- `npm test`: 8 files, **101 passed** (new `multi-file.test.ts` Tests A/B/C + fs per-index round-trip; unchanged `crypto.test.ts` wire-format suite still green).
- `npm run build`: succeeds; `/api/files/finalize` registered.
- `npx tsc --noEmit`: clean for all plan files. Pre-existing (out-of-scope) type errors in `src/lib/crypto.test.ts` (line 205 area, `Uint8Array`/`BlobPart` variance) exist on baseline HEAD and were NOT introduced by this plan — `crypto.test.ts` is unmodified.
- `git diff package.json`: empty (no new dependency). `git log src/lib/crypto.ts`: no changes this plan.

## Deferred Issues

- Pre-existing `npx tsc --noEmit` errors in `src/lib/crypto.test.ts` (BlobPart/Uint8Array variance under strict TS). Present on baseline, unrelated to this plan, does not affect `npm test` or `npm run build`. Logged here for visibility; not fixed (out of scope — not caused by this plan's changes).

## Self-Check: PASSED

All created files exist (finalize route, multi-file.test.ts, this SUMMARY) and all four commits (d5dfd4ad, 550bf88e, 2771ac69, 0c453552) are present in git history.
