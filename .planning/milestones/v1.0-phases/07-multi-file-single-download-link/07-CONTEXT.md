# Phase 07: Multi-file Single Download Link - Context

**Gathered:** 2026-09-17
**Status:** Ready for planning
**Source:** PRD Express Path (inline, from user decision)

<domain>
## Phase Boundary

Change the upload/share model so that selecting MULTIPLE files produces ONE download link (one
share `id`, one key), instead of today's one-link-per-file. Files are stored separately under a
single id and single key (NOT zipped); the download page lists each file and lets the recipient
download/decrypt them individually. Preserves the client-side-encryption model and the existing
per-file wire format. Excludes any archive/zip approach and any change to the notify/verify flow.

</domain>

<decisions>
## Implementation Decisions

### Approach (LOCKED — user chose over client-side ZIP)
- **Multi-file under one id + one key.** Each selected file is encrypted client-side under the
  SAME key (the single key placed in the share link's `#` fragment), each with its own random
  12-byte IV, using the EXISTING `encryptPacked`/`decryptPacked` primitive per file. The wire
  format per file is UNCHANGED: `[12-byte IV][ciphertext+tag]`. (Reusing one AES-GCM key across
  files with unique per-file IVs is safe — GCM requires IV uniqueness, not key uniqueness.)
- Do NOT zip. Do NOT change the packed-blob byte layout. Do NOT introduce a new encryption scheme.

### Data model + storage (LOCKED intent; details = Claude's Discretion)
- One meta `id` describes MANY files: meta carries a `files: [{ name, size, ... }]` array (plus
  whatever per-file storage pointer the storage layer needs). Single share id, single key, single
  expiry, single download-limit counter (REL-01 stays one counter per id).
- Storage layout stores each file's ciphertext separately under the one id (e.g. blob
  `gemba/blob/{id}/{index}` and fs `{id}/{index}.bin`), with meta listing them in order.
- **Backward compatibility (LOCKED):** existing single-file shares (old meta shape) MUST still
  download and decrypt correctly. The download page + meta/API must handle BOTH the legacy
  single-file shape and the new multi-file shape.

### UI (LOCKED)
- Upload: selecting N files yields ONE result (one link), not N results. Update the upload
  success/result UI (currently renders one card per file / `results` array) to show a single
  share link for the whole selection, listing the included files.
- Download: the download page lists every file in the share (name + size) and downloads/decrypts
  each individually; a "download all" affordance is Claude's discretion.

### Constraints (LOCKED)
- No weakening of client-side encryption; key never reaches the server (this phase does NOT adopt
  Phase 6's key-in-email exception — that is scoped to notify only).
- Reuse existing crypto (`src/lib/crypto.ts`), storage (`src/lib/storage.ts` / server-storage),
  and the existing upload/download pages. No new heavy dependencies.
- Notify (Phase 6) already iterates over the upload's link(s); with one link it simply sends one —
  no notify changes required, but do not break it.
- Stack: Next.js 16 / React 19 / Tailwind 4. Vercel Blob + fs storage modes both supported.

### Claude's Discretion
- Exact meta schema fields and storage path scheme for multi-file; how the client uploads N
  ciphertext parts under one id (sequential vs parallel); how the download-limit counter is
  decremented for a multi-file share (per share vs per file) as long as it stays coherent and
  documented; the "download all" UX; ordering/[progress] display for multiple files.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Encryption (reuse per-file, unchanged wire format)
- `src/lib/crypto.ts` — `encryptPacked`/`decryptPacked`, `readFileWithProgress`; reuse per file under one shared key.
- `src/lib/crypto.test.ts` — wire-format assertions that MUST keep passing.

### Storage + meta + upload/download
- `src/lib/storage.ts`, `src/lib/server-storage.ts` — StoredMeta shape + blob/fs read/write; extend to multi-file, keep legacy readable.
- `src/app/api/files/route.ts`, `src/app/api/files/[id]/meta/route.ts` — upload + meta endpoints.
- `src/lib/redis.ts` — one download counter per id (keep one-per-share).
- `src/app/upload/page.tsx` — file selection, per-file encrypt+upload loop, `results` rendering (collapse to one link).
- `src/app/download/page.tsx` — meta fetch, decrypt, download; extend to list + per-file decrypt, handle legacy single-file meta.

### Constraints
- `.planning/ROADMAP.md` (Phase 7 entry) and `.claude/docs/architecture.md` (encryption boundary).

</canonical_refs>

<specifics>
## Specific Ideas

- One key in the fragment decrypts every file in the share (each file its own IV).
- Keep the REL-01 atomic download counter as one counter per share id.

</specifics>

<deferred>
## Deferred Ideas

- Client-side ZIP bundling (explicitly rejected in favor of multi-file-under-one-id).
- Per-file expiry or per-file download limits.

</deferred>

---

*Phase: 07-multi-file-single-download-link*
*Context gathered: 2026-09-17 via PRD Express Path (inline)*
