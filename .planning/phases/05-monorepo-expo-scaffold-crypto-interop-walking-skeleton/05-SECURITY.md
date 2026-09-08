---
phase: 05-monorepo-expo-scaffold-crypto-interop-walking-skeleton
audited: 2026-07-12
mode: verify-mitigations
asvs_level: 1
block_on: high
threats_total: 12
threats_closed: 12
threats_open: 0
threats_deferred_runtime: 3
status: SECURED
---

# Phase 5: Security Audit — Threat Mitigation Verification

**Mode:** VERIFY-MITIGATIONS (register authored at plan time across 05-01..05-04 PLAN.md; this audit confirms each declared mitigation is present in the implemented code — it does not scan for new threats).

**Result: SECURED.** All 12 registered threats have their code/config mitigation present and verified by direct inspection (not by trusting SUMMARY.md prose). 3 threats have an additional runtime proof step that is explicitly human-gated and not yet performed (T-05-09 live Vercel deploy; T-05-01 and T-05-10 on-device Maestro `VECTORS PASS`) — these are recorded as **deferred**, not open, because the underlying code/config control was independently verified. `.planning/REQUIREMENTS.md` correctly reflects these as `Pending` (not fabricated as passing), which this audit re-confirmed.

## Threat Verification

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-05-06 | Information Disclosure | mitigate | CLOSED | `.gitignore:59-70` (`.env*`, `!.env.example`, `.env*.local`); live `git check-ignore -v apps/web/.env.local` → matched by `.env*.local` rule; `git ls-files \| grep env` shows only `apps/web/.env.example` tracked (template, no secrets) |
| T-05-08 | Tampering / DoS | mitigate | CLOSED | `apps/web/next.config.ts:60-84` — `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options` all present and byte-equivalent to Phase 4 (plus `Referrer-Policy`/`Permissions-Policy`, not a regression) |
| T-05-09 | Denial of Service | mitigate | **DEFERRED** (code control verified; live deploy pending) | `apps/web/package.json` + `apps/web/vercel.json` (`/api/cleanup` cron) + `apps/web/next.config.ts` confirm `apps/web` is a valid, self-contained deploy root; `npm run build --workspace=apps/web` re-run live during this audit → succeeds with zero errors. Vercel dashboard Root-Directory change itself not yet performed — human-gated, per plan's own resume-signal allowance ("deferred until next deploy") |
| T-05-02 | Tampering | mitigate | CLOSED | `packages/shared/src/index.ts:10-42` exports `MAX_DOWNLOADS`/`MAX_EXPIRY_MS`/`MAX_BLOB_BYTES`/`validateClientMeta`; `apps/web/src/app/api/files/route.ts:11` imports `MAX_BLOB_BYTES, validateClientMeta` from `@gemba/shared`; no second copy of the predicate exists anywhere in `apps/web` (confirmed by reading `route.ts` — local `ClientPayload`/`UploadMetaPayload` are route-internal shapes only, not a duplicate validator) |
| T-05-07 | Tampering / DoS | mitigate | CLOSED | `apps/web/next.config.ts:44-53` `turbopack.resolveExtensions` and `apps/web/vitest.config.ts:15-24` `resolve.extensions` both list `.web.ts` first and contain **no** `.native.ts` entry (verified by direct grep of the array contents, not just a comment); web build + test suite pass with `crypto.native.ts` present in the tree, proving the exclusion is functionally effective, not just declared |
| T-05-01a | Tampering | mitigate | CLOSED | `packages/crypto/src/vectors.ts` frozen literals (`expectedPackedBase64`, `expectedSha256Hex`, `expectedBase64Url`); `apps/web/src/golden-vectors.test.ts` asserts exact byte-equality (not round-trip) AND cross-decrypt; re-ran live: `npm run test --workspace=apps/web` → 37/37 passing including the 4 golden-vector tests |
| T-05-03 | Information Disclosure | mitigate | CLOSED | `apps/web/src/app/upload/page.tsx:148,200` — key exported only as Base64URL and embedded in the URL fragment (`#${keyB64}`), never in the request body; `download/page.tsx:100` reads the key from `url.hash` client-side only; `packages/shared/src/index.ts` `ClientMeta` has no key field; `apps/web/src/app/api/files/route.ts` / `[id]/route.ts` only ever handle `passwordHash`/`salt` (salted hashes), never raw key material |
| T-05-SC | Tampering / EoP | mitigate | CLOSED (see residual note) | `apps/mobile/package.json:25-27` — exact pins (no `^`/`~`) on `react-native-quick-crypto@1.1.6`, `react-native-nitro-modules@0.36.1`, `react-native-quick-base64@3.0.1`; 05-03-SUMMARY records human-authorized provenance check against official repos (margelo/mrousavy/craftzdog/expo) before install. **Residual, non-blocking:** re-ran `npm audit --workspace=apps/mobile` live (15 findings: 13 moderate, 2 high) and traced both high findings with `npm ls ws --all` / `npm ls uuid --all` — `ws` (high) resolves only via `@expo/cli`'s dev server / `@expo/ws-tunnel`, `@react-native/dev-middleware`, Metro, `jest-environment-jsdom`, and `react-devtools-core` (dev-tooling/build-time paths); `uuid` (moderate) resolves only via `xcode` ← `@expo/config-plugins` ← `expo` (native-project-generation tooling, `expo prebuild` time). Neither vulnerable tree touches `react-native-quick-crypto`, `react-native-nitro-modules`, or `react-native-quick-base64` — the crypto-path pins this threat governs are unaffected |
| T-05-10 | Tampering | mitigate | CLOSED (config) / **DEFERRED** (on-device run) | `apps/mobile/jest.config.js:18-23` pins `moduleFileExtensions` to `web.ts` first (post-review-fix, commit `f862d63`), so `crypto.native.ts` cannot resolve into the jest-expo run even if `jest-expo`'s platform defaults change; `apps/mobile/.maestro/interop.yaml` exists and asserts `assertVisible: "VECTORS PASS"`. The actual on-device Maestro execution has not been run — human-gated (no Xcode/Android SDK/Maestro CLI/EAS login on this machine), correctly left `Pending` in `.planning/REQUIREMENTS.md` (re-confirmed, not fabricated as passing) |
| T-05-11 | Spoofing / Tampering | mitigate | CLOSED | `apps/mobile/app.json:10,14` — `ios.bundleIdentifier: "gemba.filesend"` and `android.package: "gemba.filesend"`; `apps/mobile/.maestro/interop.yaml:13` — `appId: gemba.filesend`. Consistent across both platform configs and the Maestro target |
| T-05-01 | Tampering | mitigate | CLOSED (code) / **DEFERRED** (on-device byte-proof) | `packages/crypto/src/crypto.native.ts:73-113` — read directly (not just grepped): `encryptRaw` calls `cipher.update()`+`cipher.final()`, THEN `cipher.getAuthTag()`, concatenates ciphertext+tag; `decryptRaw` splits the last `GCM_TAG_BYTES` (16) bytes off as the tag and calls `decipher.setAuthTag(tag)` BEFORE `decipher.update()`/`final()` — correct order confirmed. Key = `AES_KEY_BITS/8` = 16 bytes; IV = `IV_BYTES` = 12 bytes (from `encoding.ts`). On-device byte-proof via Maestro `VECTORS PASS` not yet run — human-gated, correctly left `Pending` in REQUIREMENTS.md |
| T-05-05 | Tampering / Information Disclosure | mitigate | CLOSED | `packages/crypto/src/crypto.native.ts:124-126` — `getRandomBytes` calls `randomBytes` imported from `react-native-quick-crypto` (OpenSSL CSPRNG); live `grep -rn "Math.random" packages/crypto/src/ apps/mobile/` → zero matches anywhere in the crypto core or mobile app |

## Deferred Runtime Verifications

These 3 items have their **code/config control verified present and correct** by this audit. What remains is a **human-run runtime step** this agent cannot perform (no live Vercel dashboard access; no Xcode/Android SDK/Maestro CLI/EAS account on this machine, confirmed absent in `05-RESEARCH.md`'s Environment Availability table). Per this audit's instructions, these are recorded as **deferred pending-verification items**, mirroring how Phase 4 deferred its live-Upstash check — not fabricated as passing, and not marked OPEN since no code/config gap was found.

1. **T-05-09 — Vercel Root Directory → `apps/web` + redeploy.** Local build (`npm run build --workspace=apps/web`) re-verified green during this audit; `apps/web/vercel.json`'s cron path and env-var resolution require a live dashboard change + redeploy to confirm. Tracked in 05-01-SUMMARY's "User Setup Required."
2. **T-05-10 / T-05-01 — On-device Maestro `VECTORS PASS` (both iOS simulator + Android emulator) against an EAS dev-client build.** The harness (`apps/mobile/app/harness.tsx`) and Maestro flow (`apps/mobile/.maestro/interop.yaml`) are code-complete and wired to the real `crypto.native.ts`; the actual on-device run requires `npx eas-cli login`, an EAS dev-client build, and either local Xcode/Android Studio/Java or EAS cloud builds — none available in this environment. Tracked as `Pending` in `.planning/REQUIREMENTS.md` and as the open Task 3 checkpoint in 05-04-SUMMARY. A manual web→native / native→web round-trip (D-04) is bundled into the same human-gated checkpoint.

**No production uploader/downloader work (Phase 6+) should begin until the on-device Maestro gate and manual round-trip above are confirmed**, per the phase's own success criteria — this audit does not waive that gate; it only confirms the code that will be exercised by it is correct.

## Unregistered Flags

None. This audit ran in VERIFY-MITIGATIONS mode against the 12-threat register authored across 05-01..05-04 PLAN.md and did not scan for new vulnerabilities. No `## Threat Flags` sections were present in the 05-01..05-04 SUMMARY.md files requiring cross-mapping.

## Audit Trail

- Read: `05-01-PLAN.md`..`05-04-PLAN.md` (threat_model blocks), `05-01-SUMMARY.md`..`05-04-SUMMARY.md`, `05-CONTEXT.md`, `05-REVIEW.md`, `05-REVIEW-FIX.md`, root `CLAUDE.md`.
- Read implementation directly: `packages/crypto/src/{crypto.native.ts,crypto.web.ts,index.ts,encoding.ts,vectors.ts}`, `packages/shared/src/index.ts`, `apps/web/src/app/api/files/route.ts`, `apps/web/src/app/api/files/[id]/route.ts`, `apps/web/src/app/upload/page.tsx`, `apps/web/src/app/download/page.tsx`, `apps/web/next.config.ts`, `apps/web/vitest.config.ts`, `apps/web/src/golden-vectors.test.ts`, `apps/mobile/{app.json,app.config.ts,package.json,jest.config.js,index.js,app/index.tsx,app/harness.tsx,src/__tests__/core.test.ts,.maestro/interop.yaml,eas.json}`, `.gitignore`, `.planning/REQUIREMENTS.md`.
- Live commands re-run during this audit (not just trusted from SUMMARY prose): `npm run build --workspace=apps/web` (pass), `npm run test --workspace=apps/web` (37/37 pass), `npm run test --workspace=apps/mobile` (3/3 pass), `git check-ignore -v apps/web/.env.local`, `git ls-files \| grep env`, `npm audit --workspace=apps/mobile`, `npm ls ws --all` / `npm ls uuid --all` (dependency-path tracing), `grep -rn "Math.random"` across `packages/crypto/src` and `apps/mobile`.
- No implementation files were modified. Only this file (`05-SECURITY.md`) was written.

---
*Audited: 2026-07-12*
*Auditor: Claude (gsd-security-auditor)*
