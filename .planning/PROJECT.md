# Gemba Filesend

## What This Is

Gemba Filesend is an anonymous, client-side-encrypted file-sharing web app: a user drops files, they're encrypted in the browser (the key never leaves the client — it lives in the share link's URL fragment), and the recipient decrypts on download. It ships as a web app, an installable PWA, and an Android app (TWA) on Google Play. This milestone re-skins the entire app to the **Gemba design system** (`design-system/`), adds a proper **dark mode**, and closes the highest-priority **security/reliability gaps**.

## Core Value

Anyone can share a file securely — encrypted end-to-end, no account, no friction — through a single link. Everything else serves that.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. Inferred from existing codebase (see .planning/codebase/). -->

- ✓ Client-side AES-128-GCM encryption; decryption key stays in the URL fragment, never sent to server — existing
- ✓ Upload flow: drag-drop, multi-file (each file gets its own link), up to 15 GB — existing
- ✓ Download flow: fetch metadata → optional password → decrypt in browser — existing
- ✓ Share controls: password protection, download limits, expiry — existing
- ✓ Dual storage backend: Vercel Blob (prod) / local filesystem (dev), auto-selected — existing
- ✓ Cleanup cron: expires old / exhausted files — existing
- ✓ PWA (installable, service worker app-shell cache) — existing
- ✓ Android TWA shipped to Google Play (`mba.ge.filesend`) — existing
- ✓ Theme scaffolding: `next-themes` + light/dark toggle, `gemba-logo.svg` + `gemba-logo-dark.svg` in `public/` — existing
- ✓ Upload page redesigned to the Gemba design system (dropzone, share options, share-link result), theme-aware light/dark, reusing the Phase 1 component layer — Validated in Phase 2 (PAGE-02)
- ✓ Download page redesigned to the Gemba design system (all states, error cards, secure row, inline password error); 3-way light/dark/system theme control; Public Sans production-font fix; full-app light/dark/system theming human-signed-off — Validated in Phase 3 (PAGE-03, DARK-02)

### Active

<!-- Current scope. This milestone: redesign + hardening. -->

**Redesign (apply Gemba design system):**
- [ ] Wire Gemba design tokens (`design-system/tokens/` + `styles.css`) globally into the Next.js app
- [ ] Refactor shared UI components to the design system (button ranks, Input/Checkbox/Radio/Toggle, Chip, Icon wrapper, card/inset-ring recipe)
- [ ] Redesign all pages to the system: home, upload, download
- [ ] Replace ad-hoc icons with the Untitled UI `Icon` wrapper (`currentColor` stroke icons, no emoji as UI icons)

**Dark mode:**
- [ ] Define a dark-mode token layer (design system tokens are currently light-only `:root`)
- [ ] Make every redesigned surface theme-aware (light/dark) via `next-themes`
- [ ] Adapt logos/brand mark to dark mode (correct asset per theme)

**Hardening (highest-priority gaps from codebase map):**
- [ ] Automated tests: crypto round-trip, password validation, download-counter, metadata (target 80% on those units)
- [ ] Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- [ ] Rate limiting on upload/download endpoints (anti-abuse, password brute-force)
- [ ] Fix download-counter race condition (concurrent requests over-decrement)

### Out of Scope

<!-- Explicit boundaries with reasoning. -->

- User accounts / authentication — the product is deliberately anonymous; sharing is link-based. (Map flagged it; not this milestone.)
- AES-256-GCM / PBKDF2 crypto migration — valuable but requires a re-encryption migration of existing shares; a separate crypto milestone, not this one.
- Admin dashboard, abuse reporting, privacy-policy page — operational/compliance work deferred to a later milestone.
- Marketing website — the Gemba design system also covers a website product; this repo is the file-send app only.
- Streaming/chunked encryption, larger presigned-URL TTL, cleanup indexing — performance/scaling items deferred.

## Context

- **Brownfield.** Full codebase map in `.planning/codebase/` (STACK, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, INTEGRATIONS, CONCERNS).
- **Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, shadcn/Radix, `next-themes`, `@vercel/blob`. Node 18+ for Web Crypto.
- **Design system:** `design-system/` at repo root is the single source of truth for visuals. `APPLY-GUIDE.md` is written explicitly for the coding agent: wire `tokens/` + `styles.css`, use semantic CSS variable aliases (never raw values), borders as inset box-shadow rings, soft cool-grey shadows, Public Sans, Untitled UI stroke icons. Gemba Yellow `#FFDA44` is brand-mark-only.
- **Dark mode gap:** `tokens/colors.css` defines only a light `:root`. A dark token layer must be authored (not just toggled) so semantic aliases (`--surface-page`, `--text-primary`, `--border-default`, etc.) resolve correctly in dark.
- **Testing gap:** 0% test coverage today — highest-priority hardening item per the map.
- **Known race:** download counter double-decrements under concurrent requests (`src/app/api/files/[id]/route.ts`).

## Constraints

- **Design fidelity**: Only use tokens defined in `design-system/tokens/`; derive from the nearest token when a value isn't covered — do not invent colours/type/spacing/radii/shadows. — Source of truth is the Figma-derived system.
- **Tech stack**: Stay on Next.js 16 / React 19 / Tailwind 4; reuse existing shadcn/Radix component layer rather than introducing a parallel UI kit. — Avoid divergent duplicate components.
- **Encryption boundary**: Redesign and hardening must not weaken the client-side-encryption model (key never reaches the server). — Core value.
- **Platform parity**: Changes must hold across web, PWA, and Android TWA (theme + logos render correctly in all three). — TWA/asset-links are fragile.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fold `/gsd-phase` redesign request into project initialization | No roadmap existed; GSD requires init first. Redesign becomes the roadmap's driving scope. | — Pending |
| Milestone scope = redesign + hardening | User chose to bundle the flagged security/reliability gaps with the visual redesign. | — Pending |
| Coarse phase granularity | Focused redesign; fewer broad phases (foundation → components → pages → dark mode/logos → hardening). | — Pending |
| Author a dark token layer (not just toggle) | Design system tokens are light-only; dark mode needs real dark values mapped to semantic aliases. | — Pending |
| Reuse existing shadcn/Radix component layer | Avoid a second divergent UI kit; lift design-system structure into current components. | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-11 — Phase 3 complete (download page redesigned + full-app light/dark/system theming verified; DARK-02 human-signed-off)*
