# Gemba Filesend

## What This Is

Gemba Filesend is an anonymous, client-side-encrypted file-sharing web app: a user drops files, they're encrypted in the browser (the key never leaves the client — it lives in the share link's URL fragment), and the recipient decrypts on download. It ships as a web app, an installable PWA, and an Android app (TWA) on Google Play, with a native macOS sender app. The app is already re-skinned to the **Gemba design system** (`design-system/`) with full light/dark mode and hardened security. This milestone re-shapes the entire web UI onto the **SmoothUI** component language (motion-forward geometry) while keeping the existing colour and type tokens unchanged.

## Core Value

Anyone can share a file securely — encrypted end-to-end, no account, no friction — through a single link. Everything else serves that.

## Current Milestone: v1.1 SmoothUI Re-shape

**Goal:** Re-shape every web UI component onto the SmoothUI component library — new geometry (radii/borders/shape) and SmoothUI motion — while keeping the existing colour palette and Public Sans type, without weakening client-side encryption or breaking web/PWA/TWA parity.

**Target features:**
- Re-shape the shared component layer (forms, buttons, cards, toasts, progress, dialog/sheet/drawer, dropdown, tabs, badge/chip, avatar, separator, lists, file-dropzone) onto SmoothUI geometry + motion, restyling the existing shadcn/Radix components in place (no parallel UI kit).
- Add SmoothUI page/section motion, scroll progress, and animated list/image treatments across home, upload, and download.
- Keep colour + type tokens unchanged; document the new shape + motion language in `design-system/`; hold theme + asset parity across web, PWA, and Android TWA; keep the E2E-encryption boundary intact.

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
- ✓ Gemba design system wired app-wide + shared component layer (button ranks, Input/Checkbox/Radio/Toggle, Chip, Icon wrapper, card/inset-ring recipe); home page redesigned — Validated in Phase 1
- ✓ Dark token layer authored; every surface theme-aware via `next-themes`; theme-adaptive logos/brand mark — Validated in Phases 1–3
- ✓ Security & reliability hardening: CSP/HSTS/X-Frame-Options/X-Content-Type-Options headers, upload/download rate limiting, download-counter race fixed, crypto/password/counter/metadata unit tests — Validated in Phase 4
- ✓ Optional per-upload recipient email verification gate — Validated in Phase 5
- ✓ Notify recipient by email (Mailgun) — Validated in Phase 6
- ✓ Multiple files under a single download link + key — Validated in Phase 7
- ✓ Native macOS sender app (SwiftUI + CryptoKit; SmoothUI-based redesign, folder sharing, DMG/installer) matching the web AES-GCM wire format — Validated in Phase 8

### Active

<!-- Current scope. This milestone: v1.1 SmoothUI Re-shape (web UI). -->

**Re-shape the web UI onto SmoothUI (keep colours + type):**
- [ ] Add the `motion` dependency and a small SmoothUI motion/shape utility layer (respecting `prefers-reduced-motion`)
- [ ] Re-shape shared form controls onto SmoothUI: Input, Checkbox, Radio, Switch/Toggle, Label
- [ ] Re-shape buttons onto SmoothUI (smooth/clip-corners geometry + press/hover motion) preserving button ranks
- [ ] Re-shape surfaces onto SmoothUI: card, dialog, sheet/drawer, dropdown-menu, tabs, badge/chip, avatar, separator
- [ ] Re-shape feedback/indicators onto SmoothUI: toasts (sonner), progress bar, skeleton/loading
- [ ] Re-shape the file-dropzone (animated file upload) and file/list rows (animated list) onto SmoothUI
- [ ] Add page/section entrance motion + scroll progress across home, upload, download
- [ ] Re-shape app-shell/sidebar, mobile-tab-bar, and theme-toggle onto SmoothUI motion
- [ ] Update `design-system/` docs: colour/type tokens unchanged; document the new shape + motion language

**Invariants (must remain true after the re-shape):**
- [ ] Colour palette and Public Sans type tokens unchanged; light/dark/system theming still correct everywhere
- [ ] Client-side E2E encryption boundary intact (key never reaches the server)
- [ ] Web, PWA, and Android TWA parity (theme + assets render correctly in all three)

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
| Reuse existing shadcn/Radix component layer | Avoid a second divergent UI kit; lift design-system structure into current components. | ✓ Good |
| Adopt SmoothUI by restyling existing components in place (v1.1) | SmoothUI ships as copy-paste source (Motion+GSAP+Tailwind), like shadcn — restyle Radix components in place rather than adding a parallel kit; keep Radix a11y behavior. | — Pending |
| Keep colour + Public Sans tokens; change only shape + motion (v1.1) | User directive: keep the established Gemba palette/type; the SmoothUI change is geometry + animation only. | — Pending |

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
*Last updated: 2026-09-21 — started milestone v1.1 SmoothUI Re-shape (web UI onto SmoothUI geometry + motion; colours/type unchanged)*
