# Roadmap: Gemba Filesend

## Milestones

- ✅ **v1.0 Redesign + Hardening** — Phases 1–8 (shipped 2026-07 → 2026-09): Gemba design-system re-skin, dark mode, security/reliability hardening, recipient email verification + notify, multi-file single link, native macOS sender app.
- ✅ **v1.1 SmoothUI Re-shape** — Phases 9–12 (shipped 2026-09-21): entire web UI re-shaped onto the SmoothUI motion + geometry language, colours/type unchanged, encryption boundary intact, human sign-off received.

## Phases

<details>
<summary>✅ v1.0 Redesign + Hardening (Phases 1–8) — SHIPPED</summary>

Archived: `milestones/v1.0-ROADMAP.md`, phases under `milestones/v1.0-phases/`.

- [x] Phase 1: Design Foundation & Home Page
- [x] Phase 2: Upload Page Redesign
- [x] Phase 3: Download Page Redesign & Dark Mode Complete
- [x] Phase 4: Security, Reliability & Test Hardening
- [x] Phase 5: Recipient Email Verification (optional per-upload gate)
- [x] Phase 6: Notify Recipient by Email
- [x] Phase 7: Multi-file Single Download Link
- [x] Phase 8: Native macOS Sender App

</details>

<details>
<summary>✅ v1.1 SmoothUI Re-shape (Phases 9–12) — SHIPPED 2026-09-21</summary>

Archived: `milestones/v1.1-ROADMAP.md`, `milestones/v1.1-REQUIREMENTS.md`, `milestones/v1.1-MILESTONE-AUDIT.md`, phases under `milestones/v1.1-phases/`.

- [x] Phase 9: SmoothUI Foundation — `motion` dep + shared shape/motion preset layer + reduced-motion + `design-system/MOTION.md` (FND-01/02/03, DOC-01)
- [x] Phase 10: Component Re-shape — all 20 shared + app-specific components onto SmoothUI geometry/motion (FORM/BTN/SURF/FDBK/FILE/SHELL)
- [x] Phase 11: Page Motion — entrance motion + scroll progress across home/upload/download (MOT-01/02)
- [x] Phase 12: Verification & Parity — colours/type/theming, encryption boundary, web/PWA/TWA parity + human sign-off (INV-01/02/03)

**Audit:** 25/25 requirements satisfied, integration solid, all flows complete. Tech debt (non-blocking): `clipCorner` orphan; partial `shape.*` preset adoption; pre-existing home-grid/heading/skip-link items — see `milestones/v1.1-MILESTONE-AUDIT.md`.

</details>

---

*Next milestone: run `/gsd-new-milestone`. Backlog / carried-forward: embed mode (`.planning/quick/260908-tv6-embed-mode`), recipient email-verification follow-ups, v1.1 tech-debt items.*
