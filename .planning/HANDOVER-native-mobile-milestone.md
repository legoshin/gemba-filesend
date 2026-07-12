# Handover — Native Mobile Apps Milestone (React Native + Expo)

**Written:** 2026-07-12 · **Branch:** `feat/android-twa-pwa` · **main + feat both pushed, in sync**

This doc lets a fresh (post-`/clear`) session resume the native-mobile-apps work with full context. Read it first, then proceed with the milestone.

---

## Where the project stands

- **Gemba Filesend** = anonymous, client-side-encrypted file sharing. Core value: the AES key **never leaves the client** — it lives in the share-link URL fragment. This is a HARD constraint (see `CLAUDE.md`).
- Ships today as: web app, PWA, and an **Android TWA** on Google Play (`mba.ge.filesend`, versionCode 1, host `gemba-filesend.vercel.app`).
- **Phase 4 (Security/Reliability/Tests) is DONE and merged to `main`** (`4bfc17b`): enforced CSP + headers (SEC-01), Upstash rate limiting (SEC-02), atomic download counter/race fix (REL-01), Vitest suite 33/33 (TEST-01..04). Code review 10/10 fixed; security audit `threats_open: 0`.
- **Two Phase-4 items remain open but are NOT part of this milestone** (tracked in `.planning/phases/04-security-reliability-test-hardening/04-UAT.md`): (1) live Upstash env vars + runtime verify at deploy; (2) cross-platform CSP manual check. See `[[phase-04-deploy-pending]]` memory.

## The new milestone: Native mobile apps

**Goal:** Native front-end apps for **iOS + Android** — a file **uploader** (pick → encrypt in-app → upload → get share link) and **downloader** (open link → fetch → decrypt → save). They are thin clients over the EXISTING API (`/api/files`, `/api/files/[id]`); no server changes needed.

**Chosen stack (user-decided): React Native + Expo.** One TypeScript codebase for both platforms; reuse `src/lib/crypto.ts` logic and the API + types.

### Hard constraint / #1 risk — crypto interop
A file encrypted on **web** must decrypt on the **native app** and vice-versa. The native runtime has no `crypto.subtle`, so the app must reproduce `src/lib/crypto.ts` **byte-for-byte**: AES-128-GCM, IV-prepended packed format, SHA-256 password hashing, Base64URL. Plan: `react-native-quick-crypto` (JSI/OpenSSL, AES-GCM + secure RNG).

### Walking skeleton (build FIRST, before any screen)
An **encrypt-on-web → decrypt-on-native (and reverse) interop test**. If crypto parity holds, the rest is UI. Do not build screens before this passes.

### Repo shape — decide in discuss-phase
Recommended: **monorepo** — `apps/mobile` (Expo) alongside the Next app, sharing a `packages/crypto` (+ types) so crypto/validation are single-sourced. Alternative: separate repo (worse reuse).

### Then two flows
- Uploader: `expo-document-picker` → encrypt → PUT/upload via existing API → share link (`expo-clipboard`/share sheet).
- Downloader: parse link (key in fragment) → fetch ciphertext → decrypt → save via `expo-file-system` / `expo-sharing`.

## Android — publish native AAB to Google Play (REQUIRED)

The user explicitly wants the **native app published to Google Play**, not just the PWA/TWA.

- **Approach: replace the TWA in-place** under the SAME package `mba.ge.filesend` (versionCode ≥ 2). Existing users get a normal update (TWA → native). A new package = split listing (avoid).
- **EAS Build** produces the signed AAB; `eas submit` can push to Play (needs a Google Play **service-account JSON**).
- **BLOCKING DEPENDENCY — signing continuity (user checking):** to update the same listing, the new AAB must be signed acceptably:
  - If **Play App Signing** is ON → just need a registered upload key (EAS can manage). Easiest.
  - If **legacy self-signed** → must sign with the original `android.keystore` (alias `android`); its SHA-256 must match `public/.well-known/assetlinks.json`. Keystore is NOT in git (correct); user must locate it + passwords.
  - If keystore lost AND no Play App Signing → cannot update listing; recover key or use a new package.
  - **STATUS: user selected "Not sure — need to check."** Checklist below.
- `assetlinks.json` is a TWA-only mechanism — irrelevant once the app is native (harmless to leave).

### Play signing checklist (for the user)
1. Play Console → your app → **Setup → App integrity → Play app signing** — is it **active**? (If yes → path = "Play App Signing".)
2. Locate the Bubblewrap keystore: `android.keystore` (the `signingKey.path` in `android/twa-manifest.json` is `./android.keystore`) — likely in the local Android/Bubblewrap build dir or a password manager. Confirm you have the **store password + key password** (alias `android`).
3. Report back which of the 3 situations applies → that decides replace-in-place vs. new package.

## iOS — App Store (later in the milestone)
EAS Build → `eas submit` → App Store Connect. Needs an **Apple Developer account** ($99/yr), bundle id, provisioning (EAS-managed). No pre-existing iOS listing.

## Division of labor (what's human-gated)
- I (Claude) build + sign AABs/IPAs via EAS, write all app code, and the crypto-interop test.
- **User provides:** Google Play service-account JSON (or does the upload), the `android.keystore` + passwords (or confirms Play App Signing), and the Apple Developer account for iOS. Actual **store submission is human-gated** (same pattern as the deferred Upstash creds).

## GSD routing
This is a NEW milestone — run it through GSD: `/gsd-new-milestone` → discuss → plan → execute. Walking skeleton = the crypto-interop test. Suggested phase breakdown to propose in the milestone:
1. Monorepo + Expo scaffold + **crypto-interop walking skeleton** (web↔native decrypt parity).
2. Uploader flow (native).
3. Downloader flow (native).
4. Android release → EAS Build AAB → Google Play (replace TWA in-place). *(gated on signing answer)*
5. iOS release → EAS Build → App Store. *(gated on Apple Developer account)*

## Resume command (what to run after /clear)
```
/gsd-new-milestone Native mobile apps (React Native + Expo) for iOS + Android — encrypted file uploader/downloader front-ends over the existing API. Read .planning/HANDOVER-native-mobile-milestone.md first for full context, decisions, and constraints.
```
