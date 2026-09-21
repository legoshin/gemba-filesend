# Retrospective — Gemba Filesend

## Milestone: v1.1 — SmoothUI Re-shape

**Shipped:** 2026-09-21
**Phases:** 4 (9–12) | **Plans:** 12 | **Tasks:** 27 | **Commits:** ~79 | tag `v1.1`

### What Was Built
The entire web UI re-shaped onto the SmoothUI motion + geometry language while keeping the Gemba colour palette and Public Sans type unchanged: a centralized `motion` preset foundation (`src/lib/motion.ts`/`shape.ts`/`use-motion-preset.ts` + app-root `MotionConfig`), all 20 shared + app-specific components re-shaped in place on Radix, page entrance motion + a scroll-progress indicator across the three pages, and `design-system/MOTION.md` documenting the language. Verified across INV-01/02/03 (colours/type, encryption boundary SECURED, web/PWA/TWA parity) with human sign-off.

### What Worked
- **Tracer-first per phase** de-risked the unknowns cheaply (chip.tsx proved the foundation; Button proved the component pattern; home proved page motion) before fanning out.
- **Parallel wave-2 execution** with exclusive file ownership: 6 component plans (Phase 10) and 2 page plans (Phase 11) ran concurrently in isolated worktrees and octopus-merged cleanly with zero conflicts.
- **The review→fix loop earned its keep** — reviewers caught real latent bugs that build+tests missed: a Dialog/Sheet "trigger never mounts" regression, a download-page entrance replaying on every state change, and an a11y-critical `Progress` `aria-valuenow` drop on the live transfer bars.
- **Centralized presets (FND-02)** meant reduced-motion and consistency came for free across 17 consumers.

### What Was Inefficient
- **Executor worktrees spawned from a stale base** (session `origin/main`, not local `main`), forcing an orchestrator-authorized `git merge --ff-only main` on nearly every executor. Root cause: local commits weren't pushed before dispatch. Fix that emerged: **push `main` before fanning out worktree executors** so their base is current.
- **An RTK `git` PreToolUse hook** mis-fired inside worktrees, so every executor had to fall back to `/usr/bin/git`. Worth fixing the hook's worktree handling.
- Untracked review files (`NN-REVIEW.md`) don't travel through worktree branches — needed manual copy-out before worktree removal.

### Patterns Established
- SmoothUI adoption = **shape + motion over existing Radix**, never a parallel kit; hoist `motion.create(...)` to module scope (never inline in render).
- Radix portal exit animation = `forceMount` + `AnimatePresence` + wrapper-owned open state via context (keeps the always-visible trigger mounted).
- `sonner` is CSS-driven — re-skin via `toastOptions.classNames`, not a `motion.*` wrap.

### Key Lessons
- Push before parallel worktree dispatch.
- `npm run build` passing can mask both a11y regressions (aria) and latent composition bugs (unused-today code paths) — the adversarial review pass is not optional.
- A "renders once on mount" wrapper replays if it wraps per-state cards individually; wrap one stable container instead.

### Cost Observations
- Model mix: orchestration + planning on Opus; research/execute/review/verify subagents on Sonnet.
- Fully autonomous end-to-end (single human gate: the final visual/on-device sign-off).

## Cross-Milestone Trends

| Milestone | Phases | Plans | Shipped | Notable |
|-----------|--------|-------|---------|---------|
| v1.0 Redesign + Hardening | 1–8 | 31 | 2026-07→09 | Gemba design system, dark mode, hardening, notify/verify/multi-file, macOS app |
| v1.1 SmoothUI Re-shape | 9–12 | 12 | 2026-09-21 | Web UI onto SmoothUI motion+geometry; colours/type unchanged; E2E encryption SECURED |
