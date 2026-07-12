# External Integrations

**Analysis Date:** 2026-07-10

## APIs & External Services

**File Storage (Conditional):**
- Vercel Blob - Cloud file storage service
  - SDK: `@vercel/blob` (2.4.0)
  - Auth: `BLOB_READ_WRITE_TOKEN` environment variable
  - When enabled: Set in `BLOB_READ_WRITE_TOKEN`
  - Used in:
    - `src/lib/blob-storage.ts` - Read/write file metadata and blobs
    - `src/app/api/files/route.ts` - Upload handling with presigned tokens
    - `src/app/api/files/[id]/route.ts` - Download with token generation
    - `src/app/api/cleanup/route.ts` - Periodic cleanup of expired files
  - Operations:
    - `put()` - Upload blobs with metadata
    - `get()` - Read blobs and metadata
    - `del()` - Delete blobs and metadata
    - `list()` - Enumerate blobs by prefix with pagination
    - `issueSignedToken()` - Generate short-lived signed tokens for downloads
    - `presignUrl()` - Create presigned URLs for direct blob access

## Data Storage

**File Storage:**
- **Primary:** Vercel Blob (production - when `BLOB_READ_WRITE_TOKEN` is set)
  - Pathname prefix: `gemba/meta/` (metadata), `gemba/blob/` (file blobs)
  - Access level: `private` (signed URLs required)
  - TTL: Metadata cache disabled (`cacheControlMaxAge: 0`)
  - Max file size: 15 GiB
  
- **Fallback:** Local filesystem (development - when `BLOB_READ_WRITE_TOKEN` is unset)
  - Location: `process.env.GEMBA_STORAGE_DIR ?? ./data/`
  - File structure:
    - `{id}.json` - File metadata
    - `{id}.bin` - Encrypted file blob
  - Storage mode detection: `getStorageMode()` in `src/lib/storage.ts`

**Metadata Storage:**
- Location: Same as file storage (blob or filesystem)
- Format: JSON with properties:
  - `id` - Unique identifier
  - `name` - Original filename
  - `type` - MIME type
  - `size` - File size in bytes
  - `passwordHash` - SHA-256 hash of password + salt (optional)
  - `salt` - Random salt for password (optional, base64)
  - `downloadsRemaining` - Remaining download count
  - `expiresAt` - Expiration timestamp (milliseconds)
  - `createdAt` - Upload timestamp (milliseconds)
  - `blobUrl` - Public blob CDN URL (blob mode only)

**Caching:**
- Service Worker (`public/sw.js`) - Stale-while-revalidate for app shell
  - Cache name: `gemba-shell-{VERSION}`
  - Cached resources: Static app shell (`/`, `/upload`, `/download`, assets)
  - Never cached: `/api/*` endpoints, CDN URLs (live network required)
  - Versioning: Manual version literal in SW (`const VERSION = "v1"`)

## Authentication & Identity

**No Auth Provider:**
- Application uses anonymous access (no user accounts)
- File access via share links with optional password protection
- Password validation: SHA-256 hash comparison with stored hash

**Authorization:**
- Download password validation:
  - Header: `x-password` (sent by client)
  - Validation: `sha256Hex(provided + salt) === passwordHash`
  - Response: 401 if required but missing, 403 if incorrect
  - Implementation: `checkPassword()` in `src/app/api/files/[id]/route.ts`

**Cleanup Endpoint Protection:**
- Authorization: Bearer token in `Authorization` header
  - Expected format: `Bearer {CRON_SECRET}`
  - Env var: `CRON_SECRET`
  - When unset: Endpoint is open (development mode)
  - When set: Only Vercel Cron can invoke
  - Implementation: `isAuthorized()` in `src/app/api/cleanup/route.ts`

## Monitoring & Observability

**Error Tracking:**
- None detected - No Sentry, Datadog, or similar integration

**Logging:**
- Method: Console + error handling
  - No dedicated logging library
  - Errors caught and returned in JSON responses
  - Error messages sanitized (no stack traces leaked to client)
  - Implementation: Try-catch in API routes

**Performance Monitoring:**
- None detected - No APM integration

## CI/CD & Deployment

**Hosting Platform:**
- Vercel (implied)
  - Next.js deployment optimized
  - Vercel Blob integration available
  - Vercel Cron support (cleanup job)

**Deployment:**
- Build: `npm run build`
- Start: `npm start`
- Configuration: Next.js default

**Scheduled Jobs:**
- Vercel Cron (optional)
  - Endpoint: `GET /api/cleanup`
  - Purpose: Expire old files and delete exhausted downloads
  - Auth: Bearer token in `Authorization` header (when `CRON_SECRET` set)
  - Max duration: 300 seconds
  - Cleanup logic:
    - Scans all stored files
    - Deletes if `expiresAt < now()` or `downloadsRemaining <= 0`
    - Returns stats: scanned count, deleted count, errors

**Android Build & Deployment:**
- Bubblewrap CLI - Trusted Web Activity builder
- Configuration: `android/twa-manifest.json`
- Package: `mba.ge.filesend`
- Deployment: Google Play Store
- Signing: `android.keystore` (local)
- Icons: Generated at 192px and 512px, including maskable variants

## Environment Configuration

**Required env vars (production):**
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob API token
  - When set: Enables blob storage mode
  - When unset: Falls back to local filesystem

**Optional env vars:**
- `GEMBA_STORAGE_DIR` - Local filesystem root (default: `./data/`)
- `CRON_SECRET` - Cleanup endpoint authorization token
  - When set: Vercel Cron uses this token in Bearer auth
  - When unset: Cleanup endpoint is open

**Secrets location:**
- Development: `.env.local` (gitignored)
- Production: Vercel Environment Variables dashboard

## Webhooks & Callbacks

**Incoming:**
- None detected - No webhooks consumed

**Outgoing:**
- None detected - No webhooks sent to external services

## API Endpoints

**Public Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/files` | Upload files (Vercel Blob or direct) |
| GET | `/api/files/[id]` | Download file (with password check) |
| GET | `/api/files/[id]/meta` | Get file metadata |
| GET | `/api/storage-mode` | Check active storage mode (blob or fs) |
| GET | `/api/cleanup` | Cleanup expired/exhausted files (Vercel Cron) |

**Upload Modes:**

1. **Blob Upload (when using Vercel Blob):**
   - Client sends `HandleUploadBody` to `/api/files`
   - Server validates metadata via `onBeforeGenerateToken`
   - Server generates signed upload token
   - Client gets short-lived token and uploads directly to Vercel Blob
   - Server receives `onUploadCompleted` callback with blob URL

2. **Direct Upload (when using filesystem):**
   - Client sends file in request body with `x-meta` header
   - Header format: Base64-encoded JSON metadata
   - Server writes directly to filesystem
   - Response: File ID for sharing

**Download Flow:**

1. Client requests `/api/files/[id]` with optional `x-password` header
2. Server validates password (if set)
3. Server decrements `downloadsRemaining`
4. **Blob mode:** Issues presigned URL to Blob CDN, returns JSON
5. **Filesystem mode:** Streams file directly, deletes if count reaches 0

## File Encryption

**Encryption Method:**
- AES-128-GCM (Advanced Encryption Standard, 128-bit key, Galois/Counter Mode)
- Native Web Crypto API (`crypto.subtle`)

**Key Management:**
- 128-bit keys generated on client (`crypto.subtle.generateKey()`)
- Keys exported as base64url for embedding in share URLs
- No server-side key storage

**Encryption Format:**
- Structure: `[IV (12 bytes)][Ciphertext + Auth Tag]`
- IV: Random for each encryption, prepended to ciphertext
- Auth tag: GCM authentication tag, part of ciphertext

**Password Security:**
- Hash algorithm: SHA-256
- Hash format: `sha256Hex(password + salt)`
- Salt: Random 16-byte value, base64url-encoded, stored with metadata
- Authentication tag prevents tampering detection in downloads

## Cross-Origin & CORS

**Service Worker Origin Handling:**
- Service worker fetches only from same origin (`self.location.origin`)
- Never intercepts cross-origin requests (CDN URLs pass through)
- Avoids ambiguity in same-origin to cross-origin redirects

**Vercel Blob CDN:**
- Cross-origin CDN for direct blob downloads
- Requires presigned URLs (short-lived, 5-minute TTL)
- Tokens issued by server, tokens validated by Blob service

---

*Integration audit: 2026-07-10*
