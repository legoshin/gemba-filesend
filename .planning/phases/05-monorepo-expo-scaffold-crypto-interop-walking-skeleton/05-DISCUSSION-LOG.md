# Phase 5: Monorepo, Expo Scaffold & Crypto-Interop Walking Skeleton - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-12
**Phase:** 5-monorepo-expo-scaffold-crypto-interop-walking-skeleton
**Areas discussed:** Shared crypto boundary, Interop test = the gate, Monorepo tooling, Expo scaffold approach, Shared-package scope, Native test harness

---

## Shared crypto boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Shared core + platform adapters | Pure-TS core (constants, Base64URL, packed format, password-hash) once; AES-GCM+SHA-256 from crypto.web.ts (subtle) / crypto.native.ts (quick-crypto) via RN platform resolution; same async API both sides | ✓ |
| quick-crypto webcrypto on both | One literal impl via quick-crypto's subtle polyfill on web + native; forces RN polyfill into web bundle | |
| Injected crypto provider | Runtime-agnostic package; caller passes a crypto provider; most boilerplate | |

**User's choice:** Shared core + platform adapters
**Notes:** Keeps format/encoding (highest drift risk) single-sourced; only the primitive call differs per platform.

---

## Interop test = the gate (CRYPTO-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Golden vectors + a manual round-trip | Byte-equality vectors on both runtimes = CI gate; plus one real device encrypt-web→decrypt-native (and reverse) smoke | ✓ |
| Golden vectors only | Byte-equality on both runtimes; no manual device step | |
| Live round-trip only | Manual device round-trip; not in CI | |

**User's choice:** Golden vectors + a manual round-trip
**Notes:** Automatable gate plus real-world proof; no production UI until it passes.

---

## Monorepo tooling & layout

| Option | Description | Selected |
|--------|-------------|----------|
| npm workspaces, move web → apps/web | Root workspace manager; apps/web + apps/mobile + packages/*; stay npm; one-time Vercel Root Directory change | ✓ |
| npm workspaces, keep Next at root | Add apps/mobile + packages/* beside root Next app; zero Vercel change; asymmetric layout | |
| pnpm workspaces | Best RN hoisting; migrates package manager + Vercel install | |

**User's choice:** npm workspaces, move web → apps/web
**Notes:** Conventional, symmetric imports; accept the one-time Vercel Root Directory update; "web still builds + deploys" becomes a phase verification criterion.

---

## Expo scaffold approach

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal skeleton, no router yet | Prebuild + dev client + New Arch + one throwaway screen; add expo-router in Phase 6 | |
| Scaffold expo-router now | File-based routing + deep-link config now for Phases 6–7 foundation | ✓ |

**User's choice:** Scaffold expo-router now
**Notes:** prebuild + custom dev client + New Architecture are required regardless (quick-crypto JSI); router foundation set up now.

---

## Shared-package scope

| Option | Description | Selected |
|--------|-------------|----------|
| Crypto + shared meta types/validation | Hoist crypto AND ClientMeta/validateClientMeta/MAX_* so web routes + native uploader validate against one source | ✓ |
| Crypto only | Only packages/crypto; native duplicates meta shape for now | |

**User's choice:** Crypto + shared meta types/validation
**Notes:** Prevents native client drifting from server-side validation; native consumption of meta lands in Phase 6.

---

## Native test harness

| Option | Description | Selected |
|--------|-------------|----------|
| jest-expo + dev build | Run byte-equality vectors under jest-expo against a native dev build so quick-crypto JSI loads; CI-scriptable | ✓ |
| On-device test screen | Skeleton screen runs vectors on device, reports PASS/FAIL; manual | |
| You decide | Defer harness choice to research/planning | |

**User's choice:** jest-expo + dev build
**Notes:** quick-crypto can't load in plain Node/Vitest; jest-expo keeps the native gate scriptable.

---

## Claude's Discretion

- Final `packages/*` split (single shared package vs `packages/crypto` + `packages/shared`), workspace/package naming (current root `ffsend-web`), and exact jest-expo/EAS wiring — left to research/planning provided the locked decisions hold.

## Deferred Ideas

- Uploader flow (Phase 6), downloader flow (Phase 7), EAS builds + store submission (Phases 8–9, human-gated).
- Consolidating additional shared types beyond crypto + meta (e.g., API response shapes) — revisit in Phase 6 if needed.
- Cleaning up the `android/` TWA config that moves under `apps/web` — cosmetic; TWA already superseded.
