# Phase 10: Component Re-shape - Context

**Gathered:** 2026-09-21
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped; milestone brief is the spec)

<domain>
## Phase Boundary

Re-shape EVERY shared and app-specific UI component onto the SmoothUI geometry + motion language, reusing the Phase 9 foundation (`src/lib/motion.ts`, `src/lib/use-motion-preset.ts`, `src/lib/shape.ts`, app-root `MotionConfig`, `design-system/MOTION.md`). Restyle the existing shadcn/Radix components **in place** — keep Radix behaviour/a11y; add SmoothUI shape (radii/border/clip geometry) and SmoothUI motion (via the Phase 9 presets). This phase does NOT add page-level entrance motion or scroll progress (that's Phase 11) and does NOT change colours or type.

Requirements in scope: FORM-01, FORM-02, FORM-03, FORM-04, BTN-01, SURF-01, SURF-02, SURF-03, SURF-04, FDBK-01, FDBK-02, FDBK-03, FILE-01, FILE-02, SHELL-01, SHELL-02.
</domain>

<decisions>
## Implementation Decisions (from milestone brief — Claude's discretion within these)

- **Reuse Phase 9 foundation, no new magic numbers.** Every component draws its motion from the centralized presets in `src/lib/motion.ts` (`resolveMotionPreset`/`useMotionPreset`, transitions snappy/fill/micro/backdrop, the 8 variant pairs) and its geometry from `src/lib/shape.ts` (radii/ring/clip presets). If a component needs a motion/shape flavor not yet in the foundation, ADD it to the foundation module (and update `design-system/MOTION.md`), do NOT inline it locally.
- **In place on Radix.** Restyle `src/components/ui/*` (shadcn/Radix) and app-specific `src/components/*` — do NOT fork a parallel kit. Preserve every Radix primitive's behaviour, keyboard interaction, focus management, and ARIA. Motion wraps/decorates; it must not remove Radix functionality.
- **Keep colours + Public Sans type unchanged.** Only shape (radii/border/clip geometry) and motion change. No edits to `design-system/tokens/colors.css` or type tokens; keep using the existing semantic colour aliases.
- **Reduced motion.** Every animated component degrades correctly under `prefers-reduced-motion` for free by using the Phase 9 presets / `useMotionPreset` (never raw inline animate props with hardcoded values).
- **SSR/RSC safe.** Next 16 / React 19: `"use client"` only where motion hooks/state require it; keep server-safe imports server-safe. Import the client hook from `src/lib/use-motion-preset.ts`, pure data/`resolveMotionPreset` from `src/lib/motion.ts`.
- **Theming intact.** Light/dark/system must still render correctly on every re-shaped component (the milestone's INV-01 is verified in Phase 12, but do not regress it here).
- **Encryption boundary untouched.** The file-dropzone re-shape (FILE-01) is presentational only — do NOT change encryption/upload/download logic or the client-side key handling; keep the live encryption-progress + multi-file behaviour working.

## Component → SmoothUI analog map (planner refines; SmoothUI = https://smoothui.dev/docs/components)
- Forms: `input.tsx` → Animated Input; `checkbox.tsx` → Checkbox; `radio-group.tsx` → Radio Group; `switch.tsx` → Animated Toggle; `label.tsx` → consistent shape/focus. (FORM-01..04)
- Buttons: `button.tsx` → Smooth Button / Clip-Corners Button geometry + press/hover motion, preserving ALL existing ranks/variants/sizes. (BTN-01)
- Surfaces: `card.tsx` → card entrance/hover; `dialog.tsx` + `sheet.tsx` → SmoothUI Dialog/Drawer open-close motion (Radix focus-trap kept); `dropdown-menu.tsx` → dropdown motion; `tabs.tsx` → Animated Tabs indicator; `badge.tsx`+app `chip.tsx` (chip already migrated in Phase 9 — keep consistent) → SmoothUI badge/chip; `avatar.tsx`; `separator.tsx`. (SURF-01..04)
- Feedback: `sonner.tsx` (toasts) → Basic Toast enter/exit; `progress.tsx` → Animated Progress Bar; a SmoothUI skeleton/loading treatment where loading states exist. (FDBK-01..03)
- File/list: app `file-dropzone.tsx` → Animated File Upload (drag/drop motion, keep encryption progress + multi-file); selected-file / share-result rows → Animated List add/remove; any inline images → SmoothUI media treatment. (FILE-01/02)
- Shell: app `app-shell.tsx` (sidebar) + `mobile-tab-bar.tsx` → SmoothUI navigation motion/geometry; `theme-toggle.tsx` → SmoothUI Animated Theme Toggle keeping 3-way light/dark/system. (SHELL-01/02)

## Constraints (hard)
- No colour/type token changes; no crypto/network/upload/download logic changes; SSR-safe; reduced-motion honored; Radix a11y preserved; `npm run build` + `npm test` + `tsc` stay green.
</decisions>

<code_context>
## Existing Code Insights

- Shared UI: `src/components/ui/` (avatar, badge, button, card, checkbox, dialog, dropdown-menu, input, label, progress, radio-group, separator, sheet, sonner, switch, tabs).
- App-specific: `src/components/` (file-dropzone, chip [migrated Phase 9], app-shell, mobile-tab-bar, theme-toggle, icon, embed-provider, theme-provider).
- Foundation (Phase 9): `src/lib/motion.ts` (transitions + variants + `resolveMotionPreset`), `src/lib/use-motion-preset.ts` (client hook), `src/lib/shape.ts` (radii/ring/clip presets), `src/components/motion-config.tsx` (app-root, mounted in `layout.tsx`). Documented in `design-system/MOTION.md`.
- `cn` class-merge helper exists; existing components use CVA variants + semantic colour aliases + the Tailwind `rounded-*` that already map to Gemba radii.
- Pages consuming these: `/` (home), `/upload`, `/download`.
</code_context>

<specifics>
## Specific Ideas
- Plan as coarse waves grouped by cohesion (e.g. forms, buttons, surfaces, feedback, file/list, shell) with a tracer-first proof on ONE representative component (e.g. button) that the foundation presets produce the SmoothUI feel + build green, before fanning out.
- Where a component is used across pages, re-shape the component itself so all usages update at once (no per-page duplication).
</specifics>

<deferred>
## Deferred Ideas
- Page/section entrance motion + scroll progress → Phase 11.
- Cross-platform (web/PWA/TWA) + theming + encryption parity verification + human sign-off → Phase 12.
- IN-01/IN-02 from Phase 9 code review (minor duplicated magic number; preset-composition footgun docs) — address opportunistically here.
</deferred>
