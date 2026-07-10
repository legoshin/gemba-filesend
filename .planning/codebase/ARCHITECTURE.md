<!-- refreshed: 2026-07-10 -->
# Architecture

**Analysis Date:** 2026-07-10

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React/Next.js)                 │
│         Upload Page / Download Page / Home Page             │
│     `src/app/upload/page.tsx` / `src/app/download/page.tsx` │
└──────────┬─────────────────────────────────────┬────────────┘
           │                                     │
           │ POST (encrypted blob + meta)       │ GET (fetch info, auth)
           │ via XHR or Vercel Blob SDK        │ GET (download with password)
           │                                     │
           ▼                                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 API Routes (Next.js Server)                 │
│  Upload Handler: `src/app/api/files/route.ts`              │
│  Download Handler: `src/app/api/files/[id]/route.ts`       │
│  Metadata Handler: `src/app/api/files/[id]/meta/route.ts`  │
│  Storage Mode: `src/app/api/storage-mode/route.ts`         │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
       ┌─────────────────────────────────┐
       │   Storage Abstraction Layer     │
       │ `src/lib/storage.ts`            │
       │ Dispatcher: getStorageMode()    │
       └────────┬──────────────┬─────────┘
                │              │
        ┌───────▼────┐   ┌────▼────────────┐
        │   Blob     │   │  Filesystem     │
        │   Mode     │   │  Mode           │
        └────┬───────┘   └────┬────────────┘
             │                │
             ▼                ▼
    ┌─────────────────┐  ┌──────────────────┐
    │ Vercel Blob API │  │ Node.js fs (dev) │
    │ @vercel/blob    │  │ `src/lib/        │
    │ Production CDN  │  │  server-storage` │
    └─────────────────┘  └──────────────────┘
             │                │
             └────┬───────────┘
                  │
                  ▼
       ┌─────────────────────────┐
       │  Encrypted Ciphertext   │
       │  + JSON Metadata        │
       └─────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Upload Page | Client-side file selection, encryption, multi-file upload orchestration | `src/app/upload/page.tsx` |
| Download Page | File info retrieval, password entry, download + decryption flow | `src/app/download/page.tsx` |
| File Dropzone | Drag-drop UI, file selection, size validation | `src/components/file-dropzone.tsx` |
| Header | Navigation, theme toggle | `src/components/header.tsx` |
| API: Upload | Handles blob and direct uploads, metadata storage, presigned URL generation | `src/app/api/files/route.ts` |
| API: Download | Access control (password, expiry, download limit), presigned URL issuance | `src/app/api/files/[id]/route.ts` |
| API: Metadata | Public file info (without decryption key), expiry/exhaustion checks | `src/app/api/files/[id]/meta/route.ts` |
| Crypto Layer | AES-128-GCM encryption/decryption, key generation, password hashing | `src/lib/crypto.ts` |
| Blob Storage | Vercel Blob read/write abstractions | `src/lib/blob-storage.ts` |
| Server Storage | Node.js filesystem read/write abstractions | `src/lib/server-storage.ts` |

## Pattern Overview

**Overall:** Hybrid client-server encryption with dual-storage backend abstraction

**Key Characteristics:**
- **Client-side encryption**: Keys never leave browser; decryption key embedded in URL fragment
- **Storage abstraction**: Same API layer works with either Vercel Blob (production) or local filesystem (development)
- **Streaming architecture**: Handles files up to 15GB via chunked upload/download
- **Stateless API**: No session state; all access control via download limits, expiry timestamps, password hashes
- **Progressive enhancement**: Clipboard fallback for non-HTTPS contexts

## Layers

**Client Layer (React/Next.js Frontend):**
- Purpose: User interface for upload/download flows, client-side file encryption
- Location: `src/app/upload/page.tsx`, `src/app/download/page.tsx`, `src/components/`
- Contains: React components, UI state management, form handling, file encryption logic
- Depends on: Web Crypto API, Vercel Blob SDK (for multipart uploads), server API
- Used by: Browser users

**API Layer (Next.js Routes):**
- Purpose: Upload/download orchestration, access control, metadata management
- Location: `src/app/api/files/route.ts`, `src/app/api/files/[id]/route.ts`, `src/app/api/files/[id]/meta/route.ts`
- Contains: Request validation, password checking, expiry/download-limit enforcement, storage delegation
- Depends on: Storage abstraction layer, crypto utilities
- Used by: Frontend, external clients (download via presigned URLs)

**Storage Abstraction Layer:**
- Purpose: Unified interface to pluggable storage backends
- Location: `src/lib/storage.ts` (types), `src/lib/blob-storage.ts`, `src/lib/server-storage.ts`
- Contains: Vercel Blob operations (production), Node.js filesystem operations (dev)
- Depends on: @vercel/blob SDK, Node.js fs module
- Used by: API routes

**Crypto Layer:**
- Purpose: Encryption, decryption, key derivation, password hashing
- Location: `src/lib/crypto.ts`
- Contains: AES-128-GCM encrypt/decrypt, key generation/export/import, SHA-256 hashing, Base64URL encoding
- Depends on: Web Crypto API (globalThis.crypto.subtle)
- Used by: Frontend (client-side encryption), API routes (password verification)

## Data Flow

### Primary Request Path: Upload

1. User selects file via file dropzone (`src/components/file-dropzone.tsx`)
2. Sets upload options: password, download limit, expiry (`src/app/upload/page.tsx:212-239`)
3. Frontend generates AES-128-GCM key (`src/lib/crypto.ts:7-13`)
4. Frontend encrypts file in-memory (`src/app/upload/page.tsx:155-158`)
5. **If Vercel Blob mode** (`src/app/upload/page.tsx:165-185`):
   - Sends encrypted blob via multipart upload to `/api/files` with client payload
   - Vercel Blob SDK calls `onBeforeGenerateToken` hook
   - API validates metadata, derives password hash, returns signed upload token
   - Blob CDN receives encrypted bytes, stores at `gemba/blob/{id}.bin`
   - `onUploadCompleted` hook stores metadata with blob URL
6. **If Filesystem mode** (`src/app/upload/page.tsx:186-205`):
   - Derives password hash if needed
   - Sends encrypted blob + base64-encoded metadata header via XHR POST to `/api/files`
   - API writes blob to disk and metadata JSON
7. Frontend constructs share link: `{origin}/download?id={id}#${keyBase64}` (`src/app/upload/page.tsx:207-209`)
8. Decryption key stays client-side only (in URL fragment)

### Secondary Request Path: Download

1. User pastes share link into download page or opens it directly
2. Frontend extracts `id` and `keyBase64` from URL (`src/app/download/page.tsx:76-93`)
3. Frontend fetches file metadata: `GET /api/files/{id}/meta` (`src/app/download/page.tsx:97`)
4. API checks expiry and download limit, returns name/size/password status (`src/app/api/files/[id]/meta/route.ts:19-45`)
5. If password-protected, user enters password
6. Frontend requests download URL: `GET /api/files/{id}` with optional `x-password` header (`src/app/download/page.tsx:166-169`)
7. **If Vercel Blob mode**:
   - API validates password, decrements download counter, issues presigned URL with 5-minute TTL
   - Returns JSON: `{ url: "https://blob-cdn.vercel.sh/..." }`
8. **If Filesystem mode**:
   - API streams encrypted bytes directly with `content-length` header
9. Frontend downloads encrypted bytes from presigned URL or direct stream (`src/app/download/page.tsx:187-215`)
10. Frontend decrypts using key from URL fragment (`src/app/download/page.tsx:244-245`)
11. Frontend triggers browser download of decrypted file (`src/app/download/page.tsx:248-255`)

**State Management:**
- Frontend: React hooks (useState) for upload/download progress, file lists, UI state
- Server: Metadata stored in JSON files (filesystem) or JSON blobs (Vercel Blob)
- No session storage; all access control is stateless (based on download limits, timestamps, password hashes)

## Key Abstractions

**StorageMode Abstraction:**
- Purpose: Choose between cloud (Vercel Blob) and local (filesystem) backends transparently
- Examples: `src/lib/storage.ts`, `src/lib/blob-storage.ts`, `src/lib/server-storage.ts`
- Pattern: Environment-based dispatcher (`getStorageMode()`) with parallel implementations

**CryptoKey Abstraction:**
- Purpose: Generate, export, import AES-128-GCM keys; abstract Web Crypto API
- Examples: `src/lib/crypto.ts:7-28`
- Pattern: Symmetric encryption with IV prepended to ciphertext

**StoredMeta Type:**
- Purpose: Unified metadata format across storage backends
- Examples: `src/lib/storage.ts:10-23`
- Pattern: Contains plaintext filename, size; encrypted via separate JSON blob

## Entry Points

**Web Frontend:**
- Location: `src/app/page.tsx` (home), `src/app/layout.tsx` (root layout)
- Triggers: Browser navigation to `/`, `/upload`, `/download`, or direct share link
- Responsibilities: Render UI, handle client-side encryption/decryption, communicate with API

**API Server:**
- Location: `src/app/api/files/route.ts` (POST upload, dual-mode dispatch)
- Triggers: HTTP requests from frontend or external clients
- Responsibilities: Validate input, manage storage backend, enforce access control

**Service Worker (PWA):**
- Location: Registered in `src/app/layout.tsx:61-68`
- Triggers: Browser load event
- Responsibilities: Cache app shell for PWA installability (referenced in comments)

## Architectural Constraints

- **Threading:** Single-threaded event loop (browser/Node.js); uploads processed sequentially per file to avoid memory spikes
- **Global state:** No module-level singletons; all state is scoped to request handlers or React components
- **Circular imports:** None detected; storage abstraction and crypto are leaf modules
- **Encryption strength:** AES-128-GCM is approved but weaker than AES-256; acceptable for transport security where data is accessed via presigned URLs
- **Key derivation:** No PBKDF2 or Argon2 for password-to-key; passwords are hashed with SHA-256 for storage verification only (not symmetric key derivation)

## Anti-Patterns

### Dual Download Paths in API

**What happens:** `handleBlobDownload()` and `handleFsDownload()` have nearly identical logic with different I/O (`src/app/api/files/[id]/route.ts:37-128`)

**Why it's wrong:** Code duplication makes it harder to maintain password checking, expiry verification, and download counter updates consistently across backends

**Do this instead:** Extract password/expiry/counter logic into a shared validation function, reuse for both modes

### Client Payload in Blob Upload

**What happens:** Client sends plaintext password in JSON payload to `onBeforeGenerateToken` hook, which then hashes it server-side (`src/app/api/files/route.ts:74-94`)

**Why it's wrong:** Password crosses the network in plaintext (though over HTTPS). Ideally, client should hash and send hash only.

**Do this instead:** Hash password on client before sending; server stores hash directly without deriving it

## Error Handling

**Strategy:** Explicit error handling at system boundaries (API input validation, storage operations, crypto operations)

**Patterns:**
- Input validation: Reject oversized files, invalid metadata, mismatched pathnames early
- Storage errors: Catch fs/blob exceptions and return HTTP 400/500 with descriptive message
- Crypto errors: Throw on IV too short, auth tag failure; catch in download flow and toast user
- Password mismatch: Return 403 Forbidden without revealing whether file exists
- Expiry/exhaustion: Return 410 Gone and auto-delete entry

## Cross-Cutting Concerns

**Logging:** None implemented; console.log not in production code. Vercel serverless environment handles log collection.

**Validation:** 
- Frontend: Size limits in file dropzone
- API: Metadata type guards (`validateClientMeta()`), bounds checking (MAX_BLOB_BYTES, MAX_DOWNLOADS, MAX_EXPIRY_MS)

**Authentication:** 
- No user accounts; access control is URL-based (decryption key in fragment) + optional password hash
- Password is SHA-256 hash of plaintext + random salt, not key derivation

---

*Architecture analysis: 2026-07-10*
