---
phase: 05-monorepo-expo-scaffold-crypto-interop-walking-skeleton
plan: 01
subsystem: infra
tags: [npm-workspaces, monorepo, nextjs, turbopack, vercel]

# Dependency graph
requires: []
provides:
  - "npm-workspaces monorepo root (workspaces: apps/*, packages/*)"
  - "Next.js app relocated to apps/web, building/testing/linting green from its new home"
  - "apps/web/package.json (@gemba/web) as the standalone app manifest"
affects: [05-02-shared-crypto-metadata-package, 05-03-expo-scaffold, vercel-deploy-config]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "npm workspaces root (workspaces: [\"apps/*\", \"packages/*\"]), private, no app deps at root"
    - "turbopack.root pinned explicitly in apps/web/next.config.ts to prevent lockfile-based root-inference from walking into unrelated ancestor directories"

key-files:
  created: [apps/web/package.json, package.json (rewritten), .planning/phases/05-monorepo-expo-scaffold-crypto-interop-walking-skeleton/05-01-SUMMARY.md]
  modified: [apps/web/next.config.ts, apps/web/src/app/globals.css, package-lock.json, .gitignore]

key-decisions:
  - "Moved screenshots/, play-screenshots/, and root screenshot-*.png into apps/web alongside README.md/ANDROID.md (which reference them) — not explicitly listed in the plan's file set, but leaving them orphaned at repo root would break relative references and split app-owned assets across two locations"
  - "Added turbopack.root: path.join(__dirname, \"../..\") to apps/web/next.config.ts — Turbopack's automatic root inference otherwise walks past the repo into an unrelated sibling directory (/Users/lego/dev/package-lock.json) since apps/web has no lockfile of its own under npm workspaces"
  - "Vercel Root Directory change (D-07) deferred to deploy time per the plan's own resume-signal text — no interactive human present in this execution session; flagged as a required pre-production-deploy action"

patterns-established:
  - "Relocation path fixes are additive/config-only (turbopack.root, one extra ../ in a CSS @import) — no application logic touched"

requirements-completed: [APP-01]

duration: 25min
completed: 2026-07-12
---

# Phase 5 Plan 1: Monorepo Restructure & Next.js App Relocation Summary

**Root converted to an npm-workspaces manager; Next.js app relocated to `apps/web` with build/lint/test green and Phase 4 security headers unchanged.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-12T10:26:00Z
- **Completed:** 2026-07-12T10:51:06Z
- **Tasks:** 2 of 3 completed (Task 3 is a human-gated deploy-verification checkpoint, deferred per plan text)
- **Files modified:** 100 files moved (git mv, history preserved) + 4 files created/modified (root `package.json`, `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/src/app/globals.css`) + `package-lock.json` regenerated

## Accomplishments
- Root `package.json` is now a private npm-workspaces manager (`workspaces: ["apps/*", "packages/*"]`), renamed `gemba-filesend`
- Entire Next.js app (`src/`, `public/`, `scripts/`, `android/`, configs, docs, screenshot assets) relocated into `apps/web/` via `git mv` — full git history preserved for every file
- `apps/web/package.json` (`@gemba/web`) carries the app's scripts/deps, split cleanly out of the old root manifest
- `npm run build --workspace=apps/web`, `npm run test --workspace=apps/web` (33/33 tests), and lint (0 errors) all pass from the new location
- Phase 4 CSP/HSTS/X-Frame-Options/X-Content-Type-Options headers verified byte-identical in the relocated `next.config.ts`
- `.env.local`/`.env.example` verified still git-ignored/tracked correctly at their new `apps/web/` path (no secret-leak regression, T-05-06 closed)

## Task Commits

1. **Task 1: Convert root to npm-workspaces manager and relocate the Next app into apps/web** - `52aab27` (feat)
2. **Task 2: Prove the relocated app builds, tests green, and keeps its security headers** - `56459d8` (fix)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `package.json` (root) - rewritten as the private workspace manager (`workspaces: ["apps/*", "packages/*"]`, no app deps)
- `apps/web/package.json` - new, holds `@gemba/web`'s scripts/dependencies (split from the old root manifest)
- `package-lock.json` - regenerated workspace-aware via `npm install` from the root
- `apps/web/**` - the entire relocated Next.js app (`src/`, `public/`, `scripts/`, `android/`, `next.config.ts`, `tsconfig.json`, `next-env.d.ts` (regenerated), `vitest.config.ts`, `vercel.json`, `components.json`, `eslint.config.mjs`, `postcss.config.mjs`, `.env.local`, `.env.example`, `take-screenshots.mjs`, `README.md`, `ANDROID.md`, `screenshots/`, `play-screenshots/`, `screenshot-*.png`)
- `apps/web/next.config.ts` - added `turbopack.root` (relocation path fix); CSP/headers block unchanged
- `apps/web/src/app/globals.css` - design-system token `@import` paths corrected for the new directory depth

## Decisions Made
- Moved `screenshots/`, `play-screenshots/`, and root `screenshot-*.png` into `apps/web` alongside the docs that reference them (`README.md`, `ANDROID.md`), even though the plan's explicit file list didn't name them — keeping app-owned visual assets together avoids orphaned root files and broken relative doc references.
- Pinned `turbopack.root` in `apps/web/next.config.ts` rather than leaving Turbopack's automatic inference in place — see Deviations below.
- Left the pre-existing hardcoded absolute path in `take-screenshots.mjs` (`/home/user/ffsend-web/screenshots`) untouched — it predates this move (already non-functional on this machine) and is out of scope per the surgical-changes rule.
- Vercel Root Directory change (D-07, Task 3) explicitly deferred to deploy time — the plan's own resume-signal permits this ("or explicitly deferred to deploy time"), and no interactive human is present in this execution session.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed broken `design-system` token import path in `globals.css`**
- **Found during:** Task 2 (build verification)
- **Issue:** `globals.css` imported `../../design-system/tokens/*.css`, correct when `src/app` was at the repo root (2 levels up to `design-system/`). After the move to `apps/web/src/app`, the same relative path resolved to a nonexistent `apps/web/design-system/`, and `npm run build --workspace=apps/web` failed with `Can't resolve '../../design-system/tokens/fonts.css'`.
- **Fix:** Changed all four `@import` paths to `../../../../design-system/tokens/*.css` (4 levels up, matching the new depth).
- **Files modified:** `apps/web/src/app/globals.css`
- **Verification:** `npm run build --workspace=apps/web` compiles successfully.
- **Committed in:** `56459d8`

**2. [Rule 3 - Blocking] Pinned `turbopack.root` to fix incorrect workspace-root inference**
- **Found during:** Task 2 (build verification)
- **Issue:** After the fix above, the build succeeded but Turbopack printed a workspace-root warning: it selected `/Users/lego/dev/package-lock.json` (an unrelated sibling directory's lockfile) as the inferred root instead of the repo's own `package-lock.json`, because `apps/web` no longer has its own lockfile under npm workspaces and Turbopack's lockfile-walk-up heuristic kept climbing past the repo root.
- **Fix:** Added `turbopack: { root: path.join(__dirname, "../..") }` to `apps/web/next.config.ts` (Next.js's own documented fix for this exact warning). First attempt used `__dirname` alone (pointing at `apps/web`), which broke `next`-package resolution since npm workspaces hoists deps to the root `node_modules`; corrected to point at the monorepo root two levels up.
- **Files modified:** `apps/web/next.config.ts`
- **Verification:** `npm run build --workspace=apps/web` completes with zero warnings.
- **Committed in:** `56459d8`

---

**3. [Rule 1 - Bug] Fixed `.gitignore` anchored patterns that stopped matching after relocation**
- **Found during:** Final verification pass (post Task 2)
- **Issue:** `.gitignore`'s root-anchored patterns (`/node_modules`, `/.next/`, `/out/`, `/build`, `/data/`, `/coverage`) only matched at the repo root; `git status --ignored` confirmed `apps/web/.next/` and `apps/web/node_modules/` showed as untracked-but-not-ignored (`??`) after the move, meaning a future `git add -A` could accidentally commit build caches. Likewise `android/build/`, `android/.gradle/`, `android/*.keystore` etc. no longer matched their new `apps/web/android/` location.
- **Fix:** Unanchored `node_modules/`, `.next/`, `out/`, `build/`, `coverage/`, `data/` (now match at any depth) and updated the `android/*` keystore/build-artifact entries to `apps/web/android/*`. `.gitignore` was already listed in this plan's `files_modified`.
- **Files modified:** `.gitignore`
- **Verification:** `git check-ignore -v apps/web/.next/cache/foo apps/web/node_modules apps/web/android/android.keystore` all resolve to the updated rules; `git status --ignored=matching` shows both as `!!` (ignored) instead of `??`; re-confirmed `.env.local`/`.env.example` exclusion rules are unaffected.
- **Committed in:** (this plan's metadata commit)

---

**Total deviations:** 3 auto-fixed (2 bug/relocation-path, 1 blocking-config) — all are relocation-induced repairs, no application logic changed.
**Impact on plan:** All three fixes were anticipated by the plan's own Task 2 action text ("fix any path breakage introduced by the move") or explicitly listed as an in-scope file (`.gitignore`). No scope creep.

## Issues Encountered
None beyond the two auto-fixed path breakages documented above.

## User Setup Required

**A Vercel dashboard change is required before the next production/preview deploy.** This is Task 3 of the plan (`checkpoint:human-verify`, gate: blocking) and could not be completed in this autonomous execution session — it requires access to the Vercel project dashboard, which this agent does not have.

**Required action (before merging/deploying this branch to a Vercel environment that builds from repo root):**
1. Open Vercel Dashboard → the Gemba Filesend project → Settings → Build & Deployment.
2. Set **Root Directory** to `apps/web` and save.
3. Trigger a redeploy (or push the branch) and confirm the build succeeds.
4. Confirm the cron job still resolves (`apps/web/vercel.json` → `/api/cleanup`) and that project env vars (`BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`, Upstash creds) still resolve.

The plan's own text explicitly allows deferring this to deploy time ("Note: this can be deferred until the next deploy of a deploying branch; the local build/test in Task 2 already proves the move is correct. It must be done before merging to a branch that deploys to production."). Local build/test/lint from `apps/web` are already proven green in this plan — this is the only remaining step to close out D-07.

## Next Phase Readiness

- The workspace root (`apps/*`, `packages/*`) exists and is proven with a real, green app inside it — 05-02 (shared crypto/metadata package) and 05-03 (Expo scaffold) can now add `packages/crypto` and `apps/mobile` without re-touching `apps/web`'s internals.
- **Blocker for production deploys only:** the Vercel Root Directory change above must be made before this branch (or any branch built from this monorepo layout) is deployed to a Vercel environment — local dev/build/test are unaffected and already verified.

---
*Phase: 05-monorepo-expo-scaffold-crypto-interop-walking-skeleton*
*Completed: 2026-07-12*

## Self-Check: PASSED

All created/modified files verified present on disk; both task commits (`52aab27`, `56459d8`) verified present in git history.
