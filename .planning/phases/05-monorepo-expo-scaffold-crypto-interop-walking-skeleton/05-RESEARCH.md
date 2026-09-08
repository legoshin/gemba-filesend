# Phase 5: Monorepo, Expo Scaffold & Crypto-Interop Walking Skeleton - Research

**Researched:** 2026-07-12
**Domain:** npm-workspaces monorepo restructure + Expo/React Native New Architecture scaffold + cross-runtime AES-GCM crypto parity testing
**Confidence:** MEDIUM (mixed — see Metadata; two findings materially revise the locked CONTEXT.md plan and are flagged below)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `packages/crypto` uses a shared core + platform adapters model. Pure-TS parts (constants `AES_KEY_BITS=128`/`IV_BYTES=12`, Base64URL, packed `[iv(12)][ciphertext+tag]` format, password-hash/salt logic) written once. AES-GCM + SHA-256 primitives come from a platform-resolved file (`crypto.web.ts` → Web Crypto `crypto.subtle`; `crypto.native.ts` → `react-native-quick-crypto`) via RN platform-extension resolution. Both platforms expose the same public async API (`generateKey`, `exportKeyBase64`, `importKeyBase64`, `encryptPacked`, `decryptPacked`, `sha256Hex`, `randomSaltBase64`, `toBase64Url`, `fromBase64Url`).
- **D-02:** Rejected: (a) quick-crypto's `crypto.subtle` polyfill on both web and native; (b) fully injected crypto provider.
- **D-03:** Single-source crypto AND the metadata contract (`ClientMeta`, `validateClientMeta`, `MAX_*`) in this phase, hoisted out of `src/lib/storage.ts` into a shared package.
- **D-04:** Interop gate = golden test vectors (byte-equality) + one manual device round-trip. Automated CI gate: deterministic fixed-key + fixed-IV vectors asserting exact ciphertext bytes on both runtimes — web under Vitest, native under "jest-expo against a native dev build." Also assert cross-decrypt both directions. No production UI until this gate passes.
- **D-05:** The native side of the vectors runs under jest-expo with a native dev build, because `react-native-quick-crypto` is a JSI native module and will not load in a bare Node process. **⚠️ RESEARCH FINDING CONTRADICTS THIS — see "Critical Finding: D-05 Premise Is Incorrect" below. Flag for discuss-phase / planner re-confirmation.**
- **D-06:** npm workspaces (keep `package-lock.json`, no pnpm/Turborepo migration). Layout: `apps/web` (moved Next app), `apps/mobile` (Expo), `packages/*` (crypto + shared metadata contract).
- **D-07:** Moving Next app to `apps/web` requires a one-time Vercel Root Directory change to `apps/web`. `@/*` alias, `public/`, `sw.js`, `next.config.ts`, `scripts/`, `android/` TWA folder all move with it or are re-pathed. Web must remain build-and-deploy-correct.
- **D-08:** Scaffold with Expo prebuild + custom dev client + New Architecture enabled (required for quick-crypto's JSI module; Expo Go cannot load it). App identifier `gemba.filesend` both platforms.
- **D-09:** Scaffold `expo-router` + deep-link config now (not deferred). Throwaway interop-test harness screen lives inside this scaffold.

### Claude's Discretion

- Final split of `packages/*` (one shared package vs `packages/crypto` + `packages/shared`), workspace/package naming (root currently `ffsend-web` — rename as sensible), and exact jest-expo/EAS wiring.

### Deferred Ideas (OUT OF SCOPE)

- Uploader share controls, document picker, upload flow — Phase 6.
- Downloader deep-link parsing, decrypt-and-save flow — Phase 7.
- EAS Build production AAB/IPA, store submission — Phases 8–9 (human-gated).
- Consolidating additional web/native shared types beyond crypto + meta — revisit Phase 6 if needed.
- Retiring/handling the existing `android/` TWA config now living under `apps/web` — cosmetic cleanup, no action required this phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| APP-01 | Monorepo restructure — `apps/mobile` (Expo) coexists with the Next app; crypto/validation/types single-sourced in a shared package imported by both web and native | See "Standard Stack" (npm workspaces layout), "Architecture Patterns" (Metro monorepo config, Turbopack `resolveExtensions`), "Runtime State Inventory" (Vercel Root Directory, vercel.json cron path) |
| APP-02 | Expo app scaffold launches on iOS simulator and Android emulator under `gemba.filesend` | See "Environment Availability" (this machine is missing full Xcode, Android SDK, Java, watchman — blocking for local simulator/emulator launch), "Architecture Patterns" (prebuild + dev-client + New Architecture) |
| CRYPTO-01 | Native AES-128-GCM encrypt/decrypt reproduces web packed format byte-for-byte via `react-native-quick-crypto` | See "Critical Finding: Auth-Tag Packing" — the single highest-risk implementation detail; "Code Examples" |
| CRYPTO-02 | Native SHA-256 password hashing and Base64URL encoding match web exactly | See "Code Examples" (`createHash('sha256').digest('hex')` matches web's byte-array hex-join) |
| CRYPTO-03 | Automated interop test proves web↔native decrypt parity (walking-skeleton gate) | See "Critical Finding: D-05 Premise Is Incorrect" — jest-expo cannot execute real native JSI code; a Maestro/on-device harness is required instead |
</phase_requirements>

## Summary

This phase has two goals that are mechanically well-trodden (npm-workspaces monorepo restructure; Expo New Architecture scaffold with a custom dev client) and one goal that is the real risk gate (byte-exact web↔native AES-GCM parity). Research surfaced two findings that materially affect how the locked CONTEXT.md decisions should be executed, and the planner should account for both:

1. **Auth-tag packing is NOT symmetric between the two crypto backends.** Web Crypto's `crypto.subtle.encrypt("AES-GCM", …)` returns ciphertext with the 16-byte GCM authentication tag already appended — exactly matching `src/lib/crypto.ts`'s `[iv][ciphertext+tag]` packed format. `react-native-quick-crypto` exposes Node's classic `crypto` API (`createCipheriv`/`createDecipheriv`), where the tag is retrieved **separately** via `cipher.getAuthTag()` after `cipher.final()`, and must be **explicitly concatenated** by `crypto.native.ts` to reproduce the same packed bytes; decrypt must **split** the tag back off and call `decipher.setAuthTag(tag)` before `decipher.final()`. This is exactly the risk flagged in the phase brief, and it is now confirmed as the correct — and only — place drift can silently creep in. `crypto.native.ts` must own this concatenation/splitting logic; it cannot be delegated to the shared core if the core is meant to stay primitive-agnostic (though the byte-layout logic itself IS shared-core-eligible — see Architecture Patterns).

2. **jest-expo mocks native modules and runs in Node/jsdom — it cannot execute real JSI/Nitro code.** D-05 states the native golden vectors run "under jest-expo against a native dev build." This is not how jest-expo works: it is a Jest preset that stubs out Expo/RN native modules so *pure-JS* logic can be unit-tested outside a device. It does not attach to, or execute inside, a running dev-client process. A native module compiled as a Nitro/JSI C++ binding (like `react-native-quick-crypto`) cannot run inside a plain Jest/Node test — calling it there would hit an unimplemented mock, not real OpenSSL. To assert byte-exact output from the *real* native crypto implementation, the vectors must run **inside an actual dev-client build on a simulator/emulator** (or device), driven by an E2E harness such as **Maestro** (asserting rendered pass/fail text on the throwaway test-harness screen) or **Detox**. jest-expo remains appropriate for testing the shared pure-TS core (packing/Base64URL/format logic) in isolation, but not for exercising the real native primitive. This should be raised with the user/planner as a correction to D-05 before task-level planning locks in a technically-impossible test design.

Beyond these two findings: npm workspaces + Expo Metro is well supported out of the box (SDK 52+ auto-configures `watchFolders`/`nodeModulesPaths` for npm), and Next.js 16's Turbopack can be told to prefer `.web.ts` files via `turbopack.resolveExtensions` in `next.config.ts` — giving the web side an equivalent (though differently-configured) platform-extension mechanism to Metro's automatic `.native.ts`/`.web.ts` resolution. All package names in the Standard Stack were checked against the npm registry directly; several return a `package-legitimacy` verdict of `SUS` purely because they are actively-maintained fast-release packages published within the last few days — high weekly download counts (200k–6.7M/week) and official GitHub repos (`expo/expo`, `margelo/react-native-quick-crypto`, `mrousavy/nitro`) make these very likely false positives on the "too-new" heuristic, but the protocol below still requires a human-verify checkpoint before install.

**Primary recommendation:** Build the shared package's byte-format logic (packing/splitting/Base64URL) once in the platform-agnostic core so the auth-tag concatenation is centralized and unit-testable independent of which crypto backend is plugged in; get the two locked-decision corrections (D-05 native test harness, and confirming the auth-tag handling belongs in `crypto.native.ts`) explicitly re-confirmed before the planner commits task-level detail.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Monorepo/workspace layout (apps/web, apps/mobile, packages/*) | Build tooling | — | Root-level concern, not a runtime tier |
| Shared crypto core (constants, packing, Base64URL) | Shared package (packages/crypto) | — | Must be identical on both runtimes; owning it once eliminates drift |
| AES-GCM/SHA-256 primitive (Web Crypto) | Browser/Client (apps/web) | — | `crypto.subtle` only exists in a browser/Node context |
| AES-GCM/SHA-256 primitive (Nitro/JSI) | Mobile native runtime (apps/mobile) | — | `react-native-quick-crypto` is a native module, no browser equivalent |
| Metadata contract (`ClientMeta`, `validateClientMeta`, `MAX_*`) | Shared package (packages/shared or packages/crypto) | API/Backend (apps/web API routes) | Server enforces the same bounds it hands to clients; single source prevents native/web drift |
| Expo Router + deep-link scaffold | Mobile native runtime (apps/mobile) | — | Native-only concern this phase (throwaway harness screen); real screens land Phase 6/7 |
| Interop test harness (throwaway screen + vectors) | Mobile native runtime (on-device) + Web (Vitest) | CI/build tooling | Must execute inside a real native process for the native half — see Critical Finding below |
| Vercel deploy config (Root Directory, cron path) | Build/deploy tooling | API/Backend | Live service config, not code — must be manually updated post-move |

## Critical Finding: Auth-Tag Packing (highest crypto/interop risk)

**What goes wrong if unaddressed:** If `crypto.native.ts` calls `cipher.final()` and treats that as the complete ciphertext (ignoring `getAuthTag()`), the native-encrypted packed bytes will be 16 bytes short and never byte-match web output; conversely, if `crypto.native.ts`'s decrypt path doesn't split the last 16 bytes off the packed ciphertext before calling `setAuthTag()`, `decipher.final()` will throw or silently return garbage (Node crypto throws on bad tag, matching the web behavior of `subtle.decrypt` rejecting on tag mismatch — so a real implementation bug here fails loudly, which is good, but only if the golden-vector test actually exercises it).

**Confirmed via `npm view` (registry) + official docs API reference (margelo.github.io/react-native-quick-crypto/docs/api/cipher):**

```typescript
// crypto.web.ts (Web Crypto — tag is APPENDED to ciphertext automatically)
const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
// ciphertext.byteLength = plaintext.byteLength + 16 (tag already included)

// crypto.native.ts (react-native-quick-crypto / Node-style API — tag is SEPARATE)
import { createCipheriv, createDecipheriv } from "react-native-quick-crypto";

const cipher = createCipheriv("aes-128-gcm", keyBuffer /* 16 bytes */, ivBuffer /* 12 bytes */);
const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
const authTag = cipher.getAuthTag(); // 16 bytes, SEPARATE — must concatenate manually
const ciphertextWithTag = Buffer.concat([encrypted, authTag]); // now matches web's layout

// decrypt: split tag back off BEFORE calling final()
const tag = packedCiphertext.subarray(packedCiphertext.length - 16);
const ctOnly = packedCiphertext.subarray(0, packedCiphertext.length - 16);
const decipher = createDecipheriv("aes-128-gcm", keyBuffer, ivBuffer);
decipher.setAuthTag(tag); // MUST be called before update/final
const plaintext = Buffer.concat([decipher.update(ctOnly), decipher.final()]);
```

`[CITED: https://margelo.github.io/react-native-quick-crypto/docs/api/cipher]` `[CITED: https://github.com/margelo/react-native-quick-crypto]`

**Key/IV sizing confirmed:** `aes-128-gcm` key = 16 bytes, IV = 12 bytes — matches `AES_KEY_BITS=128` / `IV_BYTES=12` in `src/lib/crypto.ts` exactly. `[CITED: same source]`

**Recommendation for the planner:** put the "split last 16 bytes as tag" / "concat ciphertext+tag" logic in `crypto.native.ts` itself (it's the only place that needs to know the underlying primitive returns them separately) — but write it once, in one small helper, and have the golden-vector test assert the *exact byte length and exact byte content* of a fixed-key/fixed-IV vector on both platforms, not just "round-trip succeeds." A ciphertext-length-only bug (off-by-16) would still round-trip correctly on native-to-native but fail on cross-decrypt with web — the cross-decrypt assertion in D-04 is exactly what would catch it, so keep that assertion mandatory.

## Critical Finding: D-05 Premise Is Incorrect

**What CONTEXT.md says (D-05):** "The native side of the vectors runs under jest-expo with a native dev build... because `react-native-quick-crypto` is a JSI native module and will not load in a bare Node process."

**What research found:** The first half of the reasoning is right (JSI native modules don't load in bare Node) but the proposed fix is not how jest-expo works. `[CITED: https://docs.expo.dev/develop/unit-testing/]` states jest-expo "mocks the native part of the Expo SDK" — it is a Jest preset that runs in a **Node/jsdom** process on the host machine and replaces native module calls with mocks so pure-JS/business logic can be tested without a device. It does not spawn, attach to, or execute code inside an actual iOS/Android dev-client process. Calling `react-native-quick-crypto`'s real `createCipheriv` under jest-expo would hit Expo's own native-module mock scaffolding, not the compiled Nitro/C++ binding — so a "passing" jest-expo test using the real import would either fail immediately (module not mocked → throws) or silently test the wrong thing (if someone mocks it, defeating the purpose of an interop gate).

**What actually executes real native code:** Only a process running on an actual simulator/emulator/device with the prebuilt dev client installed. `[CITED: https://docs.expo.dev/eas/workflows/examples/e2e-tests/]` `[CITED: https://docs.expo.dev/tutorial/cicd/e2e-tests/]` confirm the standard Expo-recommended pattern for this exact class of problem is **Maestro** E2E flows run against an EAS-built simulator/dev-client binary, asserting on rendered UI text (e.g., `assertVisible: text: "VECTORS PASS"`). This lines up with the phase's own plan to build "a throwaway test-harness screen" — that screen is the natural target for a Maestro flow: run the golden vectors on-device, render a single PASS/FAIL string (or per-vector rows), and have Maestro assert on it. Detox is a documented alternative but has weaker/less-official Expo support (`Detox does not officially support Expo` per community sources) — Maestro is the leaner, more current, better-supported choice for this specific need.

**Recommended (revised) test architecture for CRYPTO-03:**
- Shared golden vectors (fixed key, fixed IV, fixed plaintext, expected exact packed-ciphertext bytes + SHA-256 hex + Base64URL strings) live as one TS/JSON fixture in the shared package, imported by both test suites.
- **Web:** Vitest test imports the fixture directly and asserts against `crypto.web.ts` — this part of D-04/D-05 is unaffected and works as designed.
- **Native (pure-TS logic only):** jest-expo *can* validly test the shared core's packing/splitting/Base64URL functions in isolation (these are plain TS, no native calls) — useful as a fast pre-check, but NOT a substitute for the real gate.
- **Native (real native-module gate):** the throwaway test-harness screen (already planned, scaffolded via expo-router) runs the vectors against the real `crypto.native.ts` on app launch/button-tap and renders a pass/fail result; a Maestro flow (run locally via `maestro test`, or in CI via EAS Workflows) launches the dev-client build and asserts the rendered result. This satisfies "automated interop test" without requiring jest-expo to do something it cannot do.
- The one manual device round-trip (encrypt-web → decrypt-native and reverse) stays as designed, unaffected.

**This is a correction to a locked decision, not a menu of new options.** Per the agent contract, present this to the user/planner explicitly rather than silently reinterpreting D-05 — the phase's success criteria (ROADMAP.md: "automated interop test proves... this must pass before any uploader/downloader work begins") do not require a specific runner, so satisfying the intent (automated, gates all further work) is achievable via Maestro instead of jest-expo-against-a-dev-build.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo` | 57.0.4 `[VERIFIED: npm registry]` | Expo SDK / managed workflow core | Current Expo SDK, verified via `npm view expo version` on 2026-07-12 |
| `expo-router` | 57.0.5 `[VERIFIED: npm registry]` | File-based routing + deep linking | Locked by D-09; auto-generates deep links for every route |
| `expo-dev-client` | (SDK-matched, install via `expo install`) `[ASSUMED]` | Custom dev client supporting native modules | Required — Expo Go cannot load `react-native-quick-crypto`'s JSI/Nitro module |
| `react-native-quick-crypto` | 1.1.6 `[VERIFIED: npm registry]`, published 2026-07-09 | AES-128-GCM + SHA-256 native primitives | Locked choice (HANDOVER doc); Node-`crypto`-shaped API, Nitro/JSI-based, ~199k weekly downloads |
| `react-native-nitro-modules` | 0.36.1 `[VERIFIED: npm registry]` | Peer dependency — Nitro Modules runtime that quick-crypto v1.x is built on | Required peer (`>=0.31.2`); by `mrousavy/nitro`, ~1.07M weekly downloads |
| `react-native-quick-base64` | (peer, `>=3.0.0`) `[VERIFIED: npm registry]` | Peer dependency of quick-crypto | Required transitively — verify version compatibility during install |
| `expo-build-properties` | (peer of quick-crypto) `[ASSUMED]` | Config plugin for native build tweaks (e.g. New Architecture flags on older SDKs) | Listed as a quick-crypto peer dep; on SDK 55+ New Arch is always-on so this may be a no-op, confirm during scaffold |
| `jest-expo` | 57.0.1 `[VERIFIED: npm registry]` | Jest preset for the Expo/RN JS-side test suite | Standard Expo unit-test runner — but see Critical Finding above for its actual scope |
| `vitest` | ^4.1.10 (already in repo) `[VERIFIED: package.json]` | Web-side test runner | Already wired in Phase 4; extend with golden vectors, no new tooling |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `maestro` (CLI, not an npm package) | current release via `curl -Ls "https://get.maestro.mobile.dev" \| bash` `[CITED: https://docs.expo.dev/tutorial/cicd/e2e-tests/]` | E2E driver for the on-device interop gate | Recommended replacement/complement for D-05's jest-expo-only plan — see Critical Finding |
| `eas-cli` | not installed locally; use `npx eas-cli` `[VERIFIED: local environment check]` | Builds the dev-client binary that Maestro/manual testing runs against | Needed to produce the simulator/emulator dev-client build this phase requires |
| `expo-linking` | 57.0.5 `[VERIFIED: npm registry]` | Deep-link URL parsing helper | Peer dep of expo-router; used for scheme/Universal Link config |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Maestro (for the real native-module gate) | Detox | Detox has first-class Jest integration but "does not officially support Expo" per community reports; more setup friction for less official-support payoff |
| npm workspaces | pnpm workspaces + Turborepo | Rejected by D-06 (least new tooling, keep `package-lock.json`); pnpm's stricter node_modules isolation avoids npm's hoisting-masks-transitive-deps gotcha, but that's an explicit accepted tradeoff |
| `react-native-quick-crypto` | `expo-crypto` (Expo's own crypto module) | `expo-crypto` doesn't expose AES-GCM cipher primitives with manual key import needed for this app's exact packed-format reproduction — insufficient for CRYPTO-01 |

**Installation:**
```bash
# From repo root, after workspaces are configured in root package.json:
npm install --workspace=apps/mobile expo@57.0.4 expo-router expo-dev-client expo-linking
npm install --workspace=apps/mobile react-native-quick-crypto react-native-nitro-modules react-native-quick-base64 expo-build-properties
npm install --workspace=apps/mobile --save-dev jest-expo
npx eas-cli --version   # confirm EAS CLI usable via npx (not globally installed on this machine)
```

**Version verification:** All Core-table versions above were checked via `npm view <pkg> version` against the live npm registry on 2026-07-12 — see raw output captured during this research session. Training-data versions (e.g. earlier web search results mentioning "SDK 55/56") were stale; the registry is the source of truth and shows **SDK 57.0.4** as current.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `react-native-quick-crypto` | npm | published 2026-07-09 (3 days old at research time) | 199,335/wk | github.com/margelo/react-native-quick-crypto | SUS (`too-new`) | Flagged — planner must add `checkpoint:human-verify` before install. High download count + established repo strongly suggest false positive on the freshness heuristic (frequent releases, not a new/unknown package). |
| `expo` | npm | published 2026-07-07 | 6,780,651/wk | github.com/expo/expo | SUS (`too-new`) | Flagged — same false-positive pattern; Expo ships very frequently. Checkpoint should be quick. |
| `expo-router` | npm | published 2026-07-07 | 3,540,037/wk | github.com/expo/expo | SUS (`too-new`) | Flagged — same pattern. |
| `expo-dev-client` | npm | published 2026-07-03 | 2,372,513/wk | github.com/expo/expo | SUS (`too-new`) | Flagged — same pattern. |
| `expo-linking` | npm | published 2026-07-07 | 5,033,670/wk | github.com/expo/expo | SUS (`too-new`) | Flagged — same pattern. |
| `jest-expo` | npm | published 2026-07-03 | 1,933,034/wk | github.com/expo/expo | SUS (`too-new`) | Flagged — same pattern. |
| `react-native-nitro-modules` | npm | published 2026-06-30 | 1,067,210/wk | github.com/mrousavy/nitro | SUS (`too-new`) | Flagged — same pattern; well-known maintainer (mrousavy), high downloads. |
| `react-native-quick-base64` | npm | published 2026-07-08 | 237,067/wk | github.com/craftzdog/react-native-quick-base64 | SUS (`too-new`) | Flagged — same pattern. |
| `expo-build-properties` | npm | published 2026-07-03 | 2,553,353/wk | github.com/expo/expo | SUS (`too-new`) | Flagged — same pattern. |

**Packages removed due to SLOP verdict:** none.
**Packages flagged as suspicious (SUS):** all 9 packages above — every one flagged purely on the `package-legitimacy` seam's "too-new" (recent-publish-date) heuristic, not on low downloads or missing source repo. Every flagged package has an official GitHub org repo (`expo/expo`, `margelo`, `mrousavy`, `craftzdog`) and six-to-seven-figure weekly downloads. **The planner must still insert a `checkpoint:human-verify` task before the first install of this dependency set** per protocol, but reviewers should expect this to be a fast confirmation, not a real red flag — the entire Expo/RN ecosystem releases on a near-daily cadence, which trips this heuristic for almost any current Expo-adjacent package.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  apps/web (Next.js 16)      │        │  apps/mobile (Expo, RN 0.83)  │
│                              │        │                                │
│  upload/download pages ─────┼──imports──▶ (Phase 6/7 — not this phase) │
│         │                    │        │         │                      │
│         ▼                    │        │         ▼                      │
│  import from workspace pkg  │        │  import from workspace pkg    │
└─────────┬────────────────────┘        └─────────┬──────────────────────┘
          │                                        │
          ▼                                        ▼
   packages/crypto (shared)              packages/crypto (shared)
   ┌────────────────────────────────────────────────────────────┐
   │  index.ts — shared core (constants, packing, Base64URL,    │
   │             password-hash/salt logic) — ONE implementation │
   │                                                              │
   │  crypto.web.ts  ◀── resolved when bundler=Turbopack/webpack │
   │    (crypto.subtle — tag auto-appended)                     │
   │                                                              │
   │  crypto.native.ts ◀── resolved when bundler=Metro           │
   │    (react-native-quick-crypto — tag SEPARATE,               │
   │     manually concatenated/split here)                       │
   └────────────────────────────────────────────────────────────┘
                              │
                              ▼
                packages/shared-meta (or same package)
                ClientMeta / validateClientMeta / MAX_*
                consumed by: apps/web API routes (server-side
                enforcement) + apps/mobile (Phase 6, client-side
                pre-check before upload)

   Interop gate (this phase, gates all further work):
   ┌───────────────┐        ┌────────────────────────────────────┐
   │ Vitest (web)  │        │ apps/mobile throwaway harness screen │
   │ golden vectors│        │ runs real crypto.native.ts on-device │
   │ vs crypto.web │        │ renders PASS/FAIL text               │
   └───────────────┘        └───────────────┬────────────────────┘
                                              ▼
                                    Maestro flow (launches dev-client
                                    build, asserts rendered text) ──▶ CI gate
                                    + one manual encrypt-web→decrypt-native
                                      (and reverse) device round-trip
```

### Recommended Project Structure
```
gemba-filesend/                  # workspace root (private, no publish)
├── package.json                 # "workspaces": ["apps/*", "packages/*"]
├── package-lock.json            # kept (D-06) — becomes workspace-aware after next install
├── apps/
│   ├── web/                     # moved Next.js app (was repo root)
│   │   ├── src/                 # unchanged internal structure
│   │   ├── public/
│   │   ├── scripts/
│   │   ├── android/             # TWA config, superseded, moved verbatim (no action)
│   │   ├── next.config.ts       # + turbopack.resolveExtensions for .web.ts priority
│   │   ├── tsconfig.json        # @/* alias unchanged, now scoped to apps/web
│   │   ├── vitest.config.ts
│   │   └── vercel.json          # cron path — verify against new Root Directory
│   └── mobile/                  # new Expo app
│       ├── app/                 # expo-router routes (throwaway harness screen)
│       ├── app.json / app.config.ts   # newArchEnabled (if applicable), scheme, gemba.filesend ids
│       ├── metro.config.js      # workspace watchFolders/nodeModulesPaths (often auto)
│       ├── index.js             # quick-crypto install()/global polyfill entry point
│       └── package.json
├── packages/
│   └── crypto/                  # shared core + platform adapters (D-01)
│       ├── src/index.ts         # constants, packing, Base64URL, password-hash
│       ├── src/crypto.web.ts
│       ├── src/crypto.native.ts
│       └── package.json
└── (packages/shared-meta/ — or folded into packages/crypto, planner's discretion per D-06 note)
```

### Pattern 1: Platform-Resolved Shared Module (Metro side)
**What:** Metro's bundler resolves `crypto.native.ts` automatically for any bare import of `./crypto` when bundling for iOS/Android, and falls back to `crypto.ts` otherwise — this is Metro's built-in Haste-style platform extension resolution, and it applies to workspace package internals, not just app-local files.
**When to use:** `apps/mobile` consuming `packages/crypto`.
**Example:**
```typescript
// packages/crypto/src/index.ts
export { encryptPacked, decryptPacked, sha256Hex } from "./crypto"; // resolves per-platform
```
`[CITED: general Metro/RN platform-extension behavior — cross-checked across multiple sources]`

### Pattern 2: Platform-Resolved Shared Module (Turbopack side)
**What:** Next.js 16's Turbopack does not natively apply `.native.ts`/`.web.ts` resolution like Metro; it must be told explicitly via `turbopack.resolveExtensions` in `next.config.ts`.
**When to use:** `apps/web` consuming the same `packages/crypto` package.
**Example:**
```typescript
// apps/web/next.config.ts
const nextConfig: NextConfig = {
  turbopack: {
    // Prepend .web.ts/.web.tsx so Turbopack prefers them over plain .ts —
    // deliberately DO NOT include .native.ts/.native.tsx here, so web
    // bundling can never accidentally pick up the native adapter.
    resolveExtensions: [".web.ts", ".web.tsx", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
  },
  // ...existing headers() config unchanged
};
```
`[CITED: https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack]`

**Verification needed during planning:** confirm this resolution order does not regress any existing `apps/web` import (a full-repo grep for filenames ending `.web.ts`/`.web.tsx` should currently be empty, so this is additive-only risk).

### Pattern 3: npm Workspaces + Expo Metro Auto-Config
**What:** Since Expo SDK 52+, `expo/metro-config`'s `getDefaultConfig()` auto-detects and configures monorepo `watchFolders`/`nodeModulesPaths` for npm/yarn/pnpm/bun — manual Metro config is usually unnecessary.
**When to use:** `apps/mobile/metro.config.js`, only if the auto-config needs to be overridden (e.g., excluding `apps/web` from the mobile bundle's watch set for performance).
**Example (manual override, only if needed):**
```javascript
// apps/mobile/metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
```
`[CITED: https://docs.expo.dev/guides/monorepos/]`

### Anti-Patterns to Avoid

- **Testing the real native crypto module under jest-expo:** Will either throw (module not mocked) or silently validate a mock instead of real OpenSSL/Nitro code — see Critical Finding above. Use an on-device Maestro/Detox flow for the real gate.
- **Letting `.native.ts` appear in the web bundler's resolve list:** If `turbopack.resolveExtensions` ever includes `.native.ts`/`.native.tsx`, the web build could silently pick up the RN-only crypto adapter and fail to compile (Node-`Buffer`-shaped API imported into a browser bundle) — keep the two extension lists platform-exclusive.
- **Round-trip-only interop assertions:** A same-platform encrypt→decrypt round trip can pass even with an auth-tag-length bug, because both sides make the same mistake consistently. Only exact-byte-equality vectors + cross-platform decrypt (web-encrypted bytes decrypted on native and vice versa) actually catch packing drift — keep both per D-04.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AES-128-GCM on native | A custom native module or JS-only polyfill | `react-native-quick-crypto` (locked choice) | JSI/Nitro native binding is far faster and more audited than a hand-rolled JS AES-GCM implementation; already the project's chosen library |
| Cross-platform E2E assertion on a real device | A custom native harness/reporting protocol | Maestro (`assertVisible` on rendered text) | Maestro is the Expo-documented, actively maintained pattern for exactly this need — asserting app-rendered state from an external CI-friendly CLI |
| Monorepo package resolution | Manual symlinking / custom Metro resolver plumbing | Expo's built-in `expo/metro-config` auto-monorepo support (SDK 52+) | Already handles npm workspaces; manual config is legacy/only-if-needed |
| Metadata validation duplicated in web API + native client | A second, native-only copy of `validateClientMeta`/`MAX_*` | The shared package hoisted per D-03 | Duplicated validation is exactly the kind of drift this phase exists to prevent (locked decision, not just best practice) |

**Key insight:** Every "don't hand-roll" item above maps to an already-locked decision in CONTEXT.md — this phase's job is executing those decisions correctly with current APIs, not evaluating alternatives.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no database/KV keys reference file paths or the package name being restructured. | None. |
| Live service config | **Vercel project "Root Directory" setting** — currently implicitly the repo root; must be changed to `apps/web` in the Vercel dashboard (D-07 already identifies this) — this is a UI-only setting, not in git. **Also:** `vercel.json`'s cron `path: "/api/cleanup"` and any Vercel env vars (`BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`, Upstash creds) are configured at the Vercel *project* level, not path-scoped — these should carry over automatically when Root Directory changes, but must be verified post-move (treat as a build-and-deploy verification step, matching D-07's own stated criterion). | Manual Vercel dashboard change (Root Directory) + post-move deploy verification that cron/env vars still resolve. |
| OS-registered state | None applicable — no Task Scheduler/launchd/pm2 registrations in this web-app + new-mobile-scaffold phase. The existing Android TWA (`mba.ge.filesend`) is a separate, already-published listing untouched by this phase. | None. |
| Secrets/env vars | `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`, `GEMBA_STORAGE_DIR`, Upstash creds — none reference the package name or directory path being restructured; `.env.local` moves with `apps/web` unchanged in content. | Move `.env.local`/`.env.example` into `apps/web/` alongside the app; no key renames needed. |
| Build artifacts | Root `package-lock.json` becomes workspace-aware on next `npm install` after `workspaces` is added to root `package.json` — expect a large lockfile diff (expected, not a bug). `tsconfig.tsbuildinfo` and `.next/` cache are stale after the move and should be regenerated (gitignored already, low risk). The root package name `ffsend-web` is private/unpublished, so renaming it (Claude's discretion) has no external registry impact. | Regenerate lockfile via `npm install` at root after adding `workspaces`; no other cleanup needed (build caches already gitignored). |

## Common Pitfalls

### Pitfall 1: Assuming jest-expo can exercise real native crypto
**What goes wrong:** A test suite written under `jest-expo` that imports `react-native-quick-crypto` directly and expects real AES-GCM output will either throw (unmocked native module) or pass against a meaningless mock, giving false confidence that CRYPTO-03's interop gate is satisfied.
**Why it happens:** jest-expo's purpose (mocking native modules so pure-JS logic can be tested off-device) is easy to conflate with "runs inside Expo, therefore runs natively."
**How to avoid:** Split the test strategy per the Critical Finding above — jest-expo for the shared pure-TS packing logic only; a Maestro (or Detox) flow against a real dev-client build for the actual native-crypto byte-equality assertion.
**Warning signs:** A jest-expo test "passes" without ever launching a simulator/emulator process or an EAS dev-client build.

### Pitfall 2: Auth-tag byte-length drift
**What goes wrong:** Native-encrypted packed bytes are 16 bytes shorter (or longer, if double-appended) than web-encrypted bytes for the identical plaintext/key/IV.
**Why it happens:** `react-native-quick-crypto`'s Node-shaped API returns the GCM tag separately from `cipher.final()`'s output; a naive port of `encryptPacked` from `crypto.web.ts` (which just returns `subtle.encrypt`'s single buffer) will forget to call and append `getAuthTag()`.
**How to avoid:** Centralize the concat/split logic in `crypto.native.ts`, write a unit test asserting exact output byte length (`IV_BYTES + plaintext.length + 16`), and assert exact ciphertext byte-equality (not just successful round-trip) in the golden vectors.
**Warning signs:** Native-to-native round trip passes, but cross-platform decrypt (web ciphertext → native decrypt, or vice versa) fails or throws "unable to authenticate data."

### Pitfall 3: Turbopack silently resolving the wrong platform file
**What goes wrong:** If `.native.ts`/`.native.tsx` are ever added to `apps/web`'s `turbopack.resolveExtensions`, or if `crypto.web.ts` is missing and `.ts` fallback accidentally resolves to `crypto.native.ts` due to file-naming coincidence, the web build could import RN-only APIs (`Buffer`, native modules) and fail at build time — or worse, fail only at runtime in a code path not exercised by the build.
**Why it happens:** Turbopack's resolution is fully explicit/config-driven (unlike Metro's automatic platform-extension convention), so a copy-paste of Metro-style expectations into `next.config.ts` without testing can miss this.
**How to avoid:** Keep `.native.ts` entirely out of the web `resolveExtensions` list; add a build-time smoke test (`npm run build` in `apps/web`) as a phase verification step.
**Warning signs:** `apps/web` build fails referencing `Buffer is not defined` or similar RN-only globals.

### Pitfall 4: Local dev environment cannot actually launch simulators/emulators
**What goes wrong:** APP-02's success criterion ("Expo app launches on the iOS simulator and Android emulator") cannot be verified on this machine as currently provisioned.
**Why it happens:** This development environment has only Xcode Command Line Tools (not full Xcode — `xcodebuild` unavailable), no Android SDK/`adb`, no `watchman`, and no Java runtime installed. See Environment Availability below.
**How to avoid:** Plan for either (a) provisioning full Xcode + Android Studio + Java locally before this phase's execution, or (b) using EAS Build's cloud simulator/emulator builds + Maestro Cloud / EAS Workflows to satisfy the launch criterion without local device tooling. Flag this as a phase-blocking dependency to resolve during planning, not discovered mid-execution.
**Warning signs:** `npx expo run:ios` / `npx expo run:android` fail with missing-toolchain errors.

## Code Examples

### SHA-256 hex digest — native vs web (CRYPTO-02)
```typescript
// crypto.web.ts (existing src/lib/crypto.ts behavior)
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// crypto.native.ts
import { createHash } from "react-native-quick-crypto";
export async function sha256Hex(input: string): Promise<string> {
  // Same public async signature (D-01) even though the native call is sync —
  // wrap in Promise.resolve() to preserve the shared interface.
  return createHash("sha256").update(input, "utf8").digest("hex");
}
```
`[CITED: https://margelo.github.io/react-native-quick-crypto/docs/api — createHash example]` `[CITED: src/lib/crypto.ts, this repo]`

### Random bytes — native vs web (used by IV generation, salts)
```typescript
// web: crypto.getRandomValues(new Uint8Array(n))
// native:
import { randomBytes } from "react-native-quick-crypto";
const iv: Buffer = randomBytes(12); // sync, returns Buffer — convert to Uint8Array as needed
```
`[CITED: https://margelo.github.io/react-native-quick-crypto/docs/api/random]`

### Turbopack platform-extension config (apps/web/next.config.ts)
```typescript
const nextConfig: NextConfig = {
  turbopack: {
    resolveExtensions: [".web.ts", ".web.tsx", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
  },
  // ...existing headers() from Phase 4 (SEC-01) — do not remove
};
```
`[CITED: https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack]`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `react-native-quick-crypto` v0.x (Old Architecture, Bridge+JSI) | v1.x (Nitro Modules, New-Architecture-only) `[VERIFIED: npm registry — 1.1.6 current]` | v1.0 refactor (per package README) | Old-Architecture apps cannot use v1.x — this phase's New-Architecture-always-on scaffold (D-08) is required, not optional, for the current library major version |
| Manual Metro `watchFolders`/`nodeModulesPaths` config for every monorepo | Auto-configured by `expo/metro-config` for npm/yarn/pnpm/bun | Expo SDK 52+ `[CITED: https://docs.expo.dev/guides/monorepos/]` | Less boilerplate; manual config only needed for edge cases |
| `experimental.turbo` in `next.config.js` | Top-level `turbopack` key in `next.config.ts` | Next.js 16 `[CITED: https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack]` | Confirms this repo (already on Next 16.1.6) uses the current config location |
| Assuming jest-expo = "runs in Expo, therefore native-capable" | jest-expo mocks native modules, runs in Node/jsdom; real native-module testing needs Maestro/Detox on a built dev client | Ongoing Expo testing-docs guidance | Directly revises this phase's D-05 — see Critical Finding |

**Deprecated/outdated:** `react-native-quick-crypto` v0.x — do not install; v1.1.6 is the correct, current, New-Architecture-only major version and is what the peer-dependency chain (`react-native-nitro-modules`) requires.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `expo-dev-client`'s exact version isn't independently confirmed (assumed SDK-matched, installed via `expo install` which pins compatible versions) | Standard Stack | Low — `expo install` auto-resolves the correct version for the installed SDK; a mismatched manual version could cause build errors, caught immediately at `expo prebuild` |
| A2 | `expo-build-properties` is needed for New Architecture config on this SDK line | Standard Stack | Low-Medium — if SDK 57 truly has New Arch always-on with no toggle, this package may be unnecessary scaffolding; verify during scaffold task whether `expo-doctor` flags it as unused |
| A3 | Node v24.13.0 (locally installed, this machine) is compatible with Expo/EAS tooling despite being a non-LTS release | Environment Availability | Medium — some native build toolchains (node-gyp, prebuild scripts) have historically had friction with very new/odd Node majors; if `expo prebuild`/EAS CLI errors reference Node compatibility, pin to the LTS Expo recommends (per WebSearch: "React Native now requires Node.js 20.19.4+") via nvm for this workspace |
| A4 | Maestro is deployable/runnable in this project's CI without additional paid EAS Workflows tier | Critical Finding (D-05) | Medium — if EAS Workflows/Maestro Cloud requires a paid plan the user hasn't provisioned, local `maestro test` against a locally-run simulator/emulator is the fallback, but that reintroduces the Environment Availability gap (Pitfall 4) |
| A5 | `react-native-quick-crypto`'s `install()` global polyfill (overriding `global.Buffer`/`global.crypto`) is required for `createHash`/`createCipheriv` to work, based on a general mention in search results, not confirmed against the exact API surface this phase needs | Code Examples | Low — if unnecessary, it's a harmless extra import; if necessary and omitted, native crypto calls could throw at runtime, caught immediately by the interop gate itself |

**If this table is empty:** N/A — see entries above; several higher-confidence findings (auth-tag packing, jest-expo scope, Turbopack `resolveExtensions`, npm-registry versions) are NOT in this table because they were independently confirmed via authoritative sources or the registry directly, not merely assumed.

## Open Questions

1. **Does the auth-tag concatenation logic belong in the shared core or strictly in `crypto.native.ts`?**
   - What we know: the *byte layout* (`[iv][ciphertext][tag]`) is identical to web's already-appended layout, so conceptually the "pack" step is shared logic; only the *source* of the tag (built-in vs separate call) differs per platform.
   - What's unclear: whether D-01's "shared core / platform adapter" split intends the adapter to return a single already-packed buffer (adapter owns concatenation) or return `{ciphertext, tag}` separately (shared core owns concatenation). Both satisfy D-01's stated public API surface (`encryptPacked` returns one packed value either way).
   - Recommendation: let the planner decide at task-design time; either is correct as long as one code path (not duplicated) does the concatenation, and the golden vectors are exhaustive enough to catch a mistake in either location.

2. **Does the URL-fragment (`#key`) survive a real Universal Link / App Link tap into the native app?**
   - What we know: `expo-router` treats an in-app `#` as a special search param once the app has fully loaded and routed `[CITED: expo-router docs]`; official Linking docs describe `Linking.parse()` extracting "path, hostname, and query parameters" with no explicit mention of fragment handling on cold-start `getInitialURL()` `[CITED: https://docs.expo.dev/linking/into-your-app/]`; separately, in-app browsers (WhatsApp/Instagram/etc.) and server-side redirect chains are a documented source of stripped fragments/params for deep links in general `[CITED: cross-checked via WebSearch — multiple independent sources agree fragments are a known fragile point in deep-link chains]`.
   - What's unclear: whether a direct OS-level Universal Link tap (no intermediate redirect/in-app-browser) reliably preserves the fragment through to `Linking.getInitialURL()` on both iOS and Android with this Expo SDK version — this needs an empirical, on-device test, not just documentation reading.
   - Recommendation: this is explicitly a **Phase 7 (downloader) risk**, not this phase's blocker — but since D-09 scaffolds `expo-router` + deep-link config *now*, use this phase's scaffold work to run one quick empirical check (open a `gemba.filesend://` or universal-link URL containing a `#fragment` from a real device/simulator Safari/Chrome, confirm what `useLocalSearchParams`/`Linking.getInitialURL()` actually receives) and record the result for Phase 7 planning. Note this is exactly why REQUIREMENTS.md's DL-01 already offers "deep link **or paste**" as a fallback — the requirement was written anticipating this exact risk.

3. **Is `expo-build-properties` actually needed on Expo SDK 57, given New Architecture is reportedly always-on?**
   - What we know: quick-crypto lists it as a peer dependency; some older-SDK guidance uses it to set `newArchEnabled` flags.
   - What's unclear: whether SDK 57 exposes any New-Architecture-related build property that still needs configuring (e.g., iOS deployment target bumps, Android minSdkVersion for Nitro), or whether it's vestigial guidance from quick-crypto's own docs not yet updated for "New Arch always-on" SDKs.
   - Recommendation: run `npx expo-doctor@latest` during scaffold; it explicitly validates third-party library / config-plugin compatibility per Expo's own new-architecture guidance.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All tooling | ✓ | v24.13.0 | Non-LTS; pin to an LTS (e.g. 20.x/22.x) via nvm if native-toolchain errors appear during prebuild (see A3) |
| npm | Workspaces, installs | ✓ | 11.11.1 | — |
| Full Xcode (not just CLT) | `expo run:ios`, iOS simulator launch (APP-02) | ✗ | — (only Command Line Tools present) | Install full Xcode from the App Store, or use EAS Build's cloud iOS simulator builds instead of a local simulator |
| Android SDK / `adb` | `expo run:android`, Android emulator launch (APP-02) | ✗ | — | Install Android Studio + SDK, or use EAS Build's cloud Android builds instead of a local emulator |
| Java runtime | Android Gradle builds | ✗ | — | Install a JDK (Android Studio bundles one) — required regardless of local vs. cloud build if any local Gradle step runs |
| `watchman` | Metro file-watching performance (not strictly required, but recommended by RN docs) | ✗ | — | Metro works without it (slower FS polling); low-priority install |
| `eas-cli` | Producing dev-client builds for simulator/emulator/Maestro | ✗ (globally) | usable via `npx eas-cli` | No fallback needed — `npx` invocation works without global install |
| Maestro CLI | On-device interop-gate assertion (Critical Finding, D-05 replacement) | ✗ | — | Install via documented curl script before this phase's native interop-gate task is executed |

**Missing dependencies with no fallback:**
- None outright block the phase's code/config work, but full Xcode + Android SDK + Java are required before APP-02's "launches on iOS simulator and Android emulator" criterion can be verified locally on this machine.

**Missing dependencies with fallback:**
- iOS/Android local simulator/emulator → EAS Build cloud simulator/emulator builds (requires an Expo/EAS account, already implied by the milestone's EAS usage in Phases 8–9).
- `watchman` → Metro falls back to slower polling; not blocking.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture | yes | Shared-package single-sourcing of crypto + validation (D-01/D-03) is itself the ASVS-aligned control — eliminates the classic "client validation drifts from server validation" architecture flaw |
| V2 Authentication | no | No accounts in this product (by design — anonymous link-based sharing) |
| V3 Session Management | no | Stateless; no sessions |
| V4 Access Control | no | Access control is link-possession + optional password, unchanged by this phase |
| V5 Input Validation | yes | `validateClientMeta`/`MAX_*` hoisted to the shared package — must not regress the existing bounds-checking behavior during extraction (verify with the existing Phase 4 Vitest suite after the move) |
| V6 Cryptography | yes | AES-128-GCM + SHA-256 reproduction is the entire point of this phase — the auth-tag packing finding above IS the primary V6 risk for this phase; never hand-roll the primitive itself (already using vetted libraries on both sides) |
| V14 Configuration | yes | Monorepo build/deploy config correctness (Vercel Root Directory, Turbopack resolveExtensions, Metro config) — a misconfiguration here is a build/availability risk, not a data-exposure risk, but still worth a build-time smoke test |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Auth-tag mishandling (dropped/truncated/reused tag) silently producing "valid-looking" but non-authenticated ciphertext | Tampering | Always call `getAuthTag()`/`setAuthTag()` explicitly in the native adapter; never skip AAD/tag verification; golden-vector exact-byte assertions catch this class of bug at the phase gate, before any UI is built |
| Supply-chain risk from freshly-published native crypto/build dependencies (all Standard Stack packages currently flag `SUS`/"too-new") | Tampering / Elevation of Privilege | `checkpoint:human-verify` before install per the Package Legitimacy Audit above; prefer pinning exact versions (not floating ranges) for anything touching the crypto path |
| Metadata-contract drift between native client and server if the hoisted shared package is ever forked/copy-pasted instead of imported | Tampering | D-03's single-source requirement is the mitigation — the planner must ensure Phase 6's native uploader imports the shared package, not a re-implementation |
| Monorepo secret leakage (env vars or `.env.local` inadvertently committed or exposed across workspace boundaries during the move) | Information Disclosure | Verify `.gitignore` continues to exclude `.env.local` after the `apps/web` move; no code change needed, just confirm during the move task |

## Sources

### Primary (HIGH confidence)
- None captured this session at HIGH tier — this project's research seam classifies `context7` (not accessible via my available tools this session) as the only MEDIUM-or-above unverified provider, and no HIGH-confidence provider fired. All findings below are MEDIUM or LOW per the `classify-confidence` seam; treat accordingly.

### Secondary (MEDIUM confidence)
- Direct `npm view <pkg> version|peerDependencies|dependencies` output (registry ground truth) for: `react-native-quick-crypto` (1.1.6), `expo` (57.0.4), `expo-router` (57.0.5), `jest-expo` (57.0.1), `expo-dev-client` (57.0.5 range), `react-native-nitro-modules` (0.36.1), `react-native` (0.83.0/0.87.0-nightly line) — `[VERIFIED: npm registry]`
- Cross-checked WebSearch findings appearing consistently across 2+ independent sources (auth-tag separateness, jest-expo mocking behavior, Turbopack `resolveExtensions` capability, npm-workspaces Metro auto-config) — treated as `[CITED]`/cross-verified per the `classify-confidence --verified` bump to MEDIUM.
- [react-native-quick-crypto official docs](https://margelo.github.io/react-native-quick-crypto/docs/api/cipher) — Cipher/Decipher API, auth tag handling
- [react-native-quick-crypto official docs — Random](https://margelo.github.io/react-native-quick-crypto/docs/api/random) — randomBytes API
- [Expo monorepo guide](https://docs.expo.dev/guides/monorepos/) — npm workspaces + Metro config
- [Expo New Architecture guide](https://docs.expo.dev/guides/new-architecture/) — SDK/New Arch status
- [Expo unit-testing guide](https://docs.expo.dev/develop/unit-testing/) — jest-expo scope/mocking
- [Expo E2E Maestro + EAS Workflows guide](https://docs.expo.dev/eas/workflows/examples/e2e-tests/) — recommended native-gate pattern
- [Next.js Turbopack config reference](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack) — `resolveExtensions`/`resolveAlias`
- [Expo Linking into your app](https://docs.expo.dev/linking/into-your-app/) — fragment-handling ambiguity

### Tertiary (LOW confidence)
- General WebSearch results not independently fetched/cross-checked (e.g., single-source claims about `expo-build-properties` necessity, `install()` global-polyfill requirement, exact `expo-dev-client` version) — flagged `[ASSUMED]` in the Assumptions Log above.

## Metadata

**Confidence breakdown:**
- Standard stack (versions): MEDIUM-HIGH for anything confirmed via direct `npm view` (registry ground truth); LOW-MEDIUM for anything sourced only from WebFetch/WebSearch summaries (per this project's `classify-confidence` seam, which rates `webfetch` as LOW even when the underlying page is authoritative, since it's an LLM-mediated summary)
- Architecture (monorepo/Metro/Turbopack patterns): MEDIUM — cross-checked across multiple independent search results and one official-docs fetch each
- Crypto interop (auth-tag packing, jest-expo scope): MEDIUM-HIGH in substance (confirmed against the library's own official API docs and Expo's own testing docs), though the underlying fetch mechanism (WebFetch) is rated LOW by this project's confidence seam — treat the *conclusions* as reliable given they're corroborated by the package's documented Node-`crypto`-compatible API surface, but re-verify the exact `getAuthTag()`/`setAuthTag()` signatures hands-on during implementation before relying on them for the golden vectors
- Environment availability: HIGH — directly probed on this machine via Bash (`xcodebuild`, `adb`, `java`, `watchman`, `node --version` all directly executed, not inferred)

**Research date:** 2026-07-12
**Valid until:** 2026-07-19 (7 days) — this domain (Expo SDK releases, `react-native-quick-crypto` major-version churn) moves fast; re-verify exact versions immediately before executing Wave 1 tasks if planning is delayed beyond a few days.
