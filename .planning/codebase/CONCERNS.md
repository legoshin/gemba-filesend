# Codebase Concerns

**Analysis Date:** 2026-07-10

## Tech Debt

**Weak Encryption Standard:**
- Issue: Using AES-128-GCM instead of AES-256-GCM for file encryption. AES-128 provides only 128 bits of security and is increasingly considered insufficient for long-term data protection.
- Files: `src/lib/crypto.ts` (line 4: `const AES_KEY_BITS = 128`)
- Impact: Files encrypted today may be vulnerable to cryptanalysis in 10+ years as quantum computing advances and classical attacks improve.
- Fix approach: Migrate to AES-256-GCM. This requires re-encrypting existing shares (one-time migration) and bumping the encryption version in `StoredMeta`.

**Password Hashing Too Simple:**
- Issue: Using SHA-256 with single salt instead of PBKDF2 or bcrypt. Password hashes are computed client-side then transmitted to server, creating additional surface for interception.
- Files: `src/lib/crypto.ts` (lines 61-67), `src/app/upload/page.tsx` (line 191), `src/app/api/files/route.ts` (line 93)
- Impact: Weak resistance to brute-force and dictionary attacks on password-protected shares. If hashes leak, passwords can be cracked quickly.
- Fix approach: Use PBKDF2 with 100K+ iterations (or Argon2 via a web crypto polyfill). Server-side hashing is preferred but requires design change.

**Missing Security Headers:**
- Issue: No Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, or HSTS headers configured.
- Files: `next.config.ts` (currently empty), no middleware intercepting responses
- Impact: Vulnerable to XSS, clickjacking, MIME-type sniffing, and HSTS bypass attacks.
- Fix approach: Add a `middleware.ts` to set standard security headers, or configure headers in `next.config.ts` using `headers()` function.

**No Rate Limiting:**
- Issue: Upload and download endpoints have no per-IP rate limiting, quota enforcement, or anti-abuse mechanisms.
- Files: `src/app/api/files/route.ts`, `src/app/api/files/[id]/route.ts`
- Impact: Trivial to abuse for file storage DoS (flood with large files), bandwidth DoS (mirror a file 1000x), or brute-force password guesses.
- Fix approach: Implement IP-based rate limiting (e.g., via Vercel Edge Middleware or a package like `express-rate-limit` adapted to Next.js).

## Known Bugs

**Race Condition in Download Counter:**
- Symptoms: If two concurrent requests fetch the same file, both decrement the counter and both receive valid presigned URLs. This allows more downloads than configured.
- Files: `src/app/api/files/[id]/route.ts` (lines 59-60, 109-110)
- Trigger: User shares link with `downloadsRemaining: 2`, two people fetch simultaneously before either client-side validation occurs
- Current mitigation: Cleanup cron may eventually remove the file if counter goes negative, but integrity is already violated
- Fix approach: Use database transactions or atomic compare-and-swap on metadata. Vercel KV could add a distributed lock. For now, document this as a known limitation.

**Service Worker Registration Silently Fails:**
- Symptoms: If SW registration fails (bad URL, CORS, etc.), the error is silently caught and ignored. App still works but PWA installability is broken.
- Files: `src/app/layout.tsx` (lines 61-69, `.catch(() => {})`)
- Trigger: Deploy without `/sw.js`, or SW registration endpoint returns error
- Current mitigation: None visible to user
- Fix approach: Log errors to console (dev only) or send to error reporting service. At minimum, remove the silent `.catch()`.

**Truncated Metadata on Filesystem Storage:**
- Symptoms: `name` and `type` fields are silently truncated to 256 and 128 chars without client-side validation or user warning.
- Files: `src/app/api/files/route.ts` (lines 181-182)
- Trigger: Upload file with name > 256 chars (e.g., a zip with deeply nested paths)
- Current mitigation: None; user may not realize filename was changed
- Fix approach: Validate on client in `src/app/upload/page.tsx` before upload, or reject on server with 400 error message.

## Security Considerations

**Encryption Keys Persisted in Browser History:**
- Risk: Share link fragment (containing decryption key) may be logged in browser history, synced to cloud, or leaked via referer headers if recipient clicks external links from download page.
- Files: All pages handling share links (`src/app/download/page.tsx`, `src/app/upload/page.tsx`)
- Current mitigation: Documentation recommends sharing key via separate channel, but not enforced technically
- Recommendations: 
  1. Use `window.history.replaceState()` to replace the URL in history without the fragment
  2. Add cache-control headers to prevent intermediate proxies caching the key
  3. Document that fragment is never sent to server (reassure users)

**Metadata Exposed in Blob Storage:**
- Risk: Filename and filesize are stored unencrypted in Vercel Blob. If blob storage is compromised or misconfigured, filenames leak (though actual file data remains encrypted).
- Files: `src/lib/blob-storage.ts`, Blob metadata stored at `gemba/meta/{id}.json`
- Current mitigation: Blob storage access controls are "private" by default, but configuration depends on Vercel setup
- Recommendations: Consider encrypting metadata with a server-side key (not URL-derived) if filename confidentiality is critical.

**No Input Validation on File Type:**
- Risk: MIME type is copied from user's browser and stored/returned as-is. Client accepts any `type` value without validation.
- Files: `src/app/upload/page.tsx` (line 170), `src/app/api/files/route.ts` (validates length only, not format)
- Current mitigation: File is still encrypted; MIME type is advisory only (browser respects only if valid)
- Recommendations: Whitelist safe MIME types or parse actual file magic bytes. Low priority since encryption mitigates the risk.

**No CORS or Origin Validation:**
- Risk: API endpoints accept requests from any origin. A malicious website could trigger uploads/downloads on behalf of users.
- Files: All API routes in `src/app/api/`
- Current mitigation: Share links are not predictable; attacker can't enumerate files
- Recommendations: Implement CORS headers restricting to app origin, and CSRF tokens for state-changing operations if applicable.

## Performance Bottlenecks

**15 GB File Limit with In-Memory Encryption:**
- Problem: Encrypting a 15 GB file in the browser requires loading all bytes into memory, then encrypting all at once before upload. This consumes ~30 GB of heap (plaintext + ciphertext + overhead).
- Files: `src/app/upload/page.tsx` (lines 155-161), comment acknowledges this (lines 129-132)
- Cause: Web Crypto API's `encrypt()` requires the full plaintext upfront (no streaming cipher API in browsers yet).
- Improvement path: 
  1. Implement chunked encryption with a streaming protocol (e.g., encrypt each chunk, prepend chunk metadata, concatenate)
  2. Use a library like TweetNaCl.js or libsodium.js that supports streaming
  3. Reduce advertised max file size to 5 GB as a practical browser limit

**Presigned URL TTL Too Short for Large Files:**
- Problem: Presigned URLs expire after 5 minutes. A 15 GB file on a slow connection (e.g., 1 Mbps) takes 30+ hours to download.
- Files: `src/app/api/files/[id]/route.ts` (line 22: `const PRESIGN_TTL_MS = 5 * 60_000`)
- Cause: Vercel Blob's presigned URL TTL is fixed at 5 minutes for security
- Improvement path: 
  1. Increase TTL to 24 hours for blob storage (Vercel supports this)
  2. For filesystem storage, implement resumable downloads with range requests
  3. Document that very large files must be downloaded on fast connections

**Cleanup Scan O(n) Complexity:**
- Problem: Cleanup cron scans all files on every run, even if they're freshly created. As storage grows, cleanup becomes slower and more expensive.
- Files: `src/app/api/cleanup/route.ts` (lines 37-62, 84-101)
- Cause: No expiry index; scans by listing all blobs/files
- Improvement path: 
  1. Add `expiresAt` as a sortable field in blob storage metadata
  2. Use Vercel KV to maintain a sorted set of (expiresAt, id) pairs
  3. Cleanup only scans files with `expiresAt < now`, not the entire store

## Fragile Areas

**Android TWA Setup / Digital Asset Links:**
- Files: `android/twa-manifest.json`, `public/.well-known/assetlinks.json`, `ANDROID.md`
- Why fragile: Digital Asset Links requires two SHA-256 fingerprints (upload key + Play signing key) to be correct in `assetlinks.json`. A single typo or missing entry causes TWA to fail full-screen and fall back to a browser with chrome UI. This is not obvious to the user and requires re-uploading the build to Google Play to test.
- Safe modification: Document the exact steps in a pre-flight checklist. Automate fingerprint extraction and JSON generation. Add CI check to verify assetlinks.json is valid and reachable.
- Test coverage: Manual testing on physical device (or emulator with Play services). Not tested in CI.

**File Deletion Race Between Cleanup and Download:**
- Files: `src/app/api/files/[id]/route.ts` (handleFsDownload), `src/app/api/cleanup/route.ts`
- Why fragile: Cleanup calls `fsDeleteEntry(id)` while a stream to that file might still be open. The file may be unlinked before the download finishes, especially on slow networks.
- Safe modification: Use atomic reference counting or file locking. For filesystem storage, don't delete the blob file until all streams have closed. For blob storage, the race is less likely since Vercel Blob is distributed.
- Test coverage: None (would require a slow-network simulation test).

**Service Worker Caching Strategy:**
- Files: `public/sw.js`
- Why fragile: SW caches `/` for offline access, but if the app is updated, old cached HTML may serve with new JS bundles, causing version mismatches. No versioning or invalidation strategy visible.
- Safe modification: Add a version stamp to the SW and cache key. On update, clear old caches. Consider using Workbox (Next.js has next-pwa support).
- Test coverage: None; SW caching is not tested.

## Scaling Limits

**File Storage Cost Linear with File Count:**
- Current capacity: Filesystem storage limited to disk space; Vercel Blob has no per-project limit but costs ~$0.015 per GB/month.
- Limit: At 1000 concurrent users each uploading 1 GB files once per week, storage grows ~140 GB/month = $2100/month.
- Scaling path: 
  1. Implement storage quotas per user/IP (requires auth, not currently supported)
  2. Reduce default expiry from 24h to 1h, default downloads from 100 to 10
  3. Archive old files to cold storage (S3 Glacier) after 7 days
  4. Charge for storage or cap total app storage

**Concurrent Upload Memory Pressure:**
- Current capacity: Vercel serverless functions have ~1 GB memory. Multiple concurrent 15 GB uploads would OOM.
- Limit: ~3-4 simultaneous large file encryptions before hitting function memory limit.
- Scaling path: 
  1. Reject new upload requests if memory usage > 80%
  2. Implement a queue and process uploads sequentially per IP
  3. Migrate to a dedicated container or dedicated serverless tier with more memory

**Cleanup Cron Scan Time:**
- Current capacity: Cleanup scans all files on each run. At 1M files, scan could take 10+ minutes.
- Limit: ~100K files before cleanup timeout (300s limit in `route.ts` line 15).
- Scaling path: Use pagination cursor more aggressively, or implement async cleanup using a background job service.

## Scaling Limits

**Cleanup Job Requires Manual Setup:**
- Current state: Cleanup endpoint exists but requires Vercel Cron to be manually configured in `vercel.json`. No cron job is committed; if forgotten, files never auto-delete.
- Impact: Storage grows unbounded, costs increase, and expired files remain accessible if IDs are guessed.
- Fix approach: Document the cron setup in `DEPLOYMENT.md`. Add a deployment validation check to ensure `vercel.json` includes the cron job.

## Test Coverage Gaps

**No Unit or Integration Tests:**
- What's not tested: 
  - Encryption/decryption round-trip
  - Password validation logic
  - Download counter decrement
  - Metadata serialization/deserialization
  - Edge cases: empty files, corrupted uploads, concurrent requests
- Files: No test files in `src/`. Total test coverage: 0%.
- Risk: Any change to crypto, API, or download logic could silently break. Bugs only surface in production.
- Priority: **HIGH** — At least add tests for crypto functions and download counter logic before scaling to production.

**No E2E Tests:**
- What's not tested: 
  - Upload single file → share → download flow
  - Upload multiple files → each gets own link
  - Password-protected share → wrong password rejected
  - Download limit exhausted → next request returns 410
  - Expired file → request returns 410
  - Android TWA installability
  - Service worker caching
- Risk: UI/UX regressions, API contract changes not caught
- Priority: **MEDIUM** — Add Playwright tests for critical upload + download flows

**No Load / Stress Tests:**
- What's not tested: 
  - Concurrent uploads/downloads
  - Large file (10+ GB) handling
  - High frequency API calls (rate limit bypass)
  - Memory usage under load
- Risk: Deploy to production, then crash under real-world usage
- Priority: **MEDIUM** — Add k6 or Artillery load tests before public release

**No Security Tests:**
- What's not tested: 
  - Password brute-force (should be rate-limited but isn't)
  - File enumeration (IDs are random 16-char hex, but not validated for format)
  - CORS misconfiguration
  - CSP violations
  - Service worker update race conditions
- Risk: Security vulnerabilities only discovered via incident or third-party audit
- Priority: **HIGH** — Run OWASP ZAP or similar before public release

## Missing Critical Features

**No User Authentication / Accounts:**
- Problem: Any user can upload unlimited files and use unlimited storage. No way to revoke access or track who uploaded what.
- Blocks: Storage quotas, user-specific cleanup, audit logging, abuse reporting
- Fix approach: Add optional GitHub OAuth login (quick start) or email verification (more friction).

**No Admin Dashboard:**
- Problem: No way to see what's stored, delete files manually, check cleanup cron status, or export audit logs.
- Blocks: Operational visibility, incident response, compliance reporting
- Fix approach: Build `/admin` page with real-time stats, file browser, manual delete button (protected by bearer token).

**No Privacy Policy Page:**
- Problem: Play Store requires a hosted privacy policy, but none exists.
- Blocks: Android app release
- Fix approach: Add `/privacy` page with data collection, retention, and deletion practices. Should mention that encryption keys never reach the server.

**No Abuse Reporting:**
- Problem: If someone uploads illegal content, there's no way to report or remove it without direct access to blob storage.
- Blocks: Legal compliance in some jurisdictions
- Fix approach: Add "Report this file" form that accepts reports (email, Discord webhook, or database) and links to manual cleanup process.

## Dependencies at Risk

**Vercel Blob API Surface Instability:**
- Risk: Vercel Blob is relatively new (launched 2023) and API may change. Presigned URL format, TTL behavior, or error codes could shift.
- Impact: App could break on Vercel Blob API minor version bumps.
- Migration plan: Abstract blob storage behind `src/lib/blob-storage.ts` (already done). Add integration tests that validate API contracts. Have a fallback plan to migrate to AWS S3 or MinIO if Vercel Blob becomes unreliable.

**Next.js 16 Fast-Moving Target:**
- Risk: Next.js major versions release ~6 months apart with breaking changes. App uses `next: "16.1.6"` (latest major).
- Impact: Dependency lock will break within 12-18 months as security patches only target latest major.
- Migration plan: Test each Next.js minor version (16.2, 16.3, etc.) in CI. Schedule major version upgrades annually in January.

**Web Crypto API Inconsistencies:**
- Risk: `crypto.subtle.encrypt()` behaves slightly differently across browsers (Chrome, Firefox, Safari). Some browsers don't support AES-128-GCM in older versions.
- Impact: Decryption failures on older browsers despite encryption working fine.
- Migration plan: Test on Safari 13+, Firefox 57+, Chrome 60+. Add browser detection and clear error message if crypto API missing.

## Recommendations (Priority Order)

1. **Add test coverage for crypto and API logic** (HIGH) — Write tests for `encryptPacked()`, `decryptPacked()`, password validation, and download counter logic. Target 80%+ coverage.
2. **Implement rate limiting** (HIGH) — Add IP-based rate limiting to prevent upload/download abuse and password brute-force.
3. **Add security headers** (HIGH) — Configure CSP, HSTS, X-Frame-Options in middleware or `next.config.ts`.
4. **Fix service worker error handling** (MEDIUM) — Log SW registration errors and handle failures gracefully.
5. **Upgrade to AES-256-GCM** (MEDIUM) — Plan migration for existing shares, roll out in stages.
6. **Document cleanup cron setup** (MEDIUM) — Add deployment guide and validation check for `vercel.json`.
7. **Add E2E tests** (MEDIUM) — Playwright tests for upload/download/password flows.
8. **Implement presigned URL retry** (LOW) — If a presigned URL expires during download, allow requesting a new one without re-entering password.
9. **Add admin dashboard** (LOW) — For operational visibility and manual file cleanup.
10. **Migrate to PBKDF2 password hashing** (LOW) — Lower priority since password is already optional and client-side hashing isn't critical.

---

*Concerns audit: 2026-07-10*
