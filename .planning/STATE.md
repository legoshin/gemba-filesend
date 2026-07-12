---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Native Mobile Apps
status: planning
stopped_at: Phase 5 context gathered
last_updated: "2026-07-12T07:40:00.828Z"
last_activity: 2026-07-12 — ROADMAP.md v1.1 created (Phases 5-9), 16/16 requirements mapped
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-12)

**Core value:** Anyone can share a file securely — encrypted end-to-end, no account, no friction — through a single link.
**Current focus:** Phase 5 — Monorepo, Expo Scaffold & Crypto-Interop Walking Skeleton

## Current Position

Phase: 5 of 9 (Monorepo, Expo Scaffold & Crypto-Interop Walking Skeleton) — 1st phase of v1.1
Plan: — (not yet planned)
Status: Ready to plan
Last activity: 2026-07-12 — ROADMAP.md v1.1 created (Phases 5-9), 16/16 requirements mapped

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 14
- Average duration: - min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 7 | - | - |
| 02 | 3 | - | - |
| 3 | 4 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 01 P1 | 12min | 3 tasks | 1 files |
| Phase 01-design-foundation-home-page P2 | ~15min | 2 tasks | 4 files |
| Phase 01-design-foundation-home-page P3 | 20min | 3 tasks | 3 files |
| Phase 01 P04 | 14min | 2 tasks | 4 files |
| Phase 01 P05 | 12min | 3 tasks | 3 files |
| Phase 01 P06 | 15min | 2 tasks | 1 files |
| Phase 02 P01 | 12min | 2 tasks | 1 files |
| Phase 02 P02 | 14min | 2 tasks | 1 files |
| Phase 02 P03 | 8min | 2 tasks | 0 files |
| Phase 03 P01 | 6min | 2 tasks | 1 files |
| Phase 03 P02 | 10min | 2 tasks | 2 files |
| Phase 03 P03 | 6min | 1 tasks | 1 files |
| Phase 03 P04 | 12min | 2 tasks | 1 files |
| Phase 04 P01 | 8min | 1 tasks | 1 files |
| Phase 04 P02 | ~18min | 2 tasks | 5 files |
| Phase 04 P03 | 10min | 3 tasks | 6 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: Coarse granularity, vertical-slice structure — Phase 1 bundles design tokens + shared components + home page (foundation must ship with a visibly complete, themed page); Phases 2-3 redesign upload/download pages end-to-end reusing that foundation; Phase 4 bundles all security/reliability/testing hardening.
- Roadmap: DARK-01 (dark token layer) and DARK-03 (logo swap) close in Phase 1 since the shared Header renders on every page from the start; DARK-02 (all pages/components verified in light/dark/system) closes in Phase 3, once every page is redesigned.
- [Phase ?]: Gemba token @import chain placed before @import "tailwindcss" (not after shadcn/tailwind.css as literally written in the plan) to prevent the remote Public Sans Google Fonts import from being stripped by Lightning CSS's import-ordering rule — Building with the plan's literal placement produced a CSS warning and the remote @import was silently dropped from every build artifact regardless
- [Phase ?]: Sun/Moon glyph names confirmed for icon.tsx: exact key Sun, nearest equivalent Moon01 (no plain Moon key exists in icon-data.js) - reuse these exact names downstream
- [Phase ?]: icon.tsx widens icon-data.js's TS-inferred literal-key type to Record<string, viewBox/body> so strict-mode indexing by name: string type-checks
- [Phase ?]: No new npm deps for checkbox/radio-group — resolved via existing radix-ui meta-package; components.json/package.json unchanged
- [Phase ?]: Task 1 blocking-human supply-chain checkpoint satisfied via documented verification steps under orchestrator-relayed user pre-authorization for this plan's network install
- [Phase ?]: AppShell kept ThemeToggle in sidebar footer for desktop; top bar shows it only on mobile via a plain md:hidden wrapper div (theme-toggle.tsx not modified, no className prop)
- [Phase ?]: Chose Home01/Upload01/Download01 Untitled UI glyphs for nav/tab icons, matching the numbered-variant convention already used by Sun/Moon01 in theme-toggle.tsx
- [Phase ?]: 01-06: Tightened home feature row to 3 cards (encryption/auto-expiry/password) instead of 5, per D-05 tighter-row instruction
- [Phase ?]: 02-01: Split single-file plan (file-dropzone.tsx) into two atomic task commits by staging an intermediate Task-1-only file state rather than a combined commit
- [Phase ?]: 02-02: Kept a temporarily-reduced lucide-react+Badge import through Task 1's commit (only icons still referenced by the not-yet-migrated done-branch) so it type-checks independently, removed entirely in Task 2
- [Phase ?]: 02-03: Checkpoint satisfied via explicit orchestrator-relayed user sign-off (approved) after reviewing the Vercel preview (feat/android-twa-pwa, commit 81b939b) in light and dark; upload confirmed working end-to-end
- [Phase 03]: 03-01: DownloadState extended with invalid-link/file-not-found/expired literal states rather than a discriminated error field — Simplest option matching the file's existing four-state union pattern
- [Phase 03]: 03-01: isPasswordError local boolean distinguishes 401/403 from other download failures in the shared catch block — Avoids string-matching the thrown Error's message while keeping the single try/catch structure intact
- [Phase 03]: 03-01: Kept Loading03 spinner glyph (no Loading01 fallback needed) — Glyph reads correctly under CSS rotation; final visual confirmation deferred to the DARK-02 sign-off gate
- [Phase 03]: 03-02: Scoped dropdown-menu reskin strictly to DropdownMenuContent + plain DropdownMenuItem — Checkbox/Radio/SubTrigger/SubContent variants are unused by the theme menu; PATTERNS.md explicitly scoped them out to avoid unnecessary lucide-icon migration work
- [Phase 03]: 03-02: ThemeToggle reads theme (not resolvedTheme) from useTheme() — resolvedTheme always collapses to light/dark and can never represent 'system' as a distinct, re-selectable state
- [Phase 03]: Used a document-head <link> (preconnect + stylesheet) for Public Sans instead of next/font/google, since fonts.css's @import is stripped by Turbopack/Lightning CSS in production. — Preferred approach per plan (reuse-first, surgical); keeps the existing @theme Public Sans token chain as sole source of the font-family value; verified the font request survives npm run build across all prerendered pages.
- [Phase 03]: 03-04: DARK-02 human sign-off APPROVED on Vercel preview commit f8416e4 (legoshin/lego@ge.mba) — all 8 completeness-bar surfaces pass in light/dark/system — Mobile tab bar top corners (mobile-tab-bar.tsx) found square during the sign-off sweep and fixed to rounded-t-[var(--radius-lg)] in commit f8416e4 before approval was given; reviewed build already includes the fix
- [Phase 04]: Pragmatic enforced CSP (no nonce, no Report-Only) shipped per D-04; unsafe-inline accepted for next-themes/sw.js inline scripts, nonce hardening deferred to D-07
- [Phase 04]: 04-02: ONE shared getRedisClient() serves both the rate limiter and the atomic download counter (D-10) — no second store; env-gated with an in-memory dev shim when Upstash creds are unset (mirrors getStorageMode())
- [Phase 04]: 04-02: Rate limiters fail OPEN (availability) while the atomic download counter fails CLOSED (503 on Redis outage) — deliberate opposite policies so a Redis outage can never over-issue downloads past the limit
- [Phase 04]: 04-02: Redis dl:{id} is the live download-counter authority (D-09); the decremented value is NOT written back to metadata (metadata keeps the original limit for display/expiry only); NX self-heal before DECR prevents a TTL-evicted key from under-counting
- [Phase 04]: 04-02: Live Upstash verification (real 429 + real DECR/410) deferred to deploy by explicit user decision — creds not provisioned in this env; all code + build criteria satisfied, concurrency correctness proven by the hermetic fake in 04-03
- [Phase ?]: 04-03: Vitest is the project's first test runner (D-11); vitest.config.ts adds a resolve.alias for @ to ./src because Vitest does not read tsconfig paths by default
- [Phase ?]: 04-03: TEST-03 REL-01 concurrency regression uses a hermetic in-memory Redis fake injected via the counter's optional client arg (D-13); validateClientMeta + MAX_* bounds promoted to named exports (no logic change) so TEST-04 tests the real predicate
- Roadmap (v1.1): 5 phases derived directly from HANDOVER hard-sequencing constraints — Phase 5 bundles the monorepo/Expo scaffold with the crypto-interop walking skeleton (APP-01/02, CRYPTO-01..03) and gates all screens; Phase 6 (uploader) and Phase 7 (downloader) sequenced after the gate passes; Phase 8 (Android) and Phase 9 (iOS) are the final release phases, each split into an automated EAS build success criterion and a separate human-gated store-submission criterion.

### Pending Todos

None yet.

### Blockers/Concerns

None currently open.

Resolved: Public Sans webfont did not load in production build (Turbopack/Lightning CSS dropped the remote Google Fonts @import regardless of ordering) — fixed in 03-03 via a document-head <link rel="stylesheet"> in src/app/layout.tsx, independent of the CSS @import pipeline; confirmed present in the npm run build output for all prerendered pages. Final deployed-Vercel visual confirmation remains a Plan 04 DARK-02 sign-off checklist row.

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-07-12T07:40:00.824Z
Stopped at: Phase 5 context gathered
Resume file: .planning/phases/05-monorepo-expo-scaffold-crypto-interop-walking-skeleton/05-CONTEXT.md
