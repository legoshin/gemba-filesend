# Phase 11: Page Motion - Context

**Gathered:** 2026-09-21
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped; milestone brief is the spec)

<domain>
## Phase Boundary

Add SmoothUI page-level motion on top of the now-reshaped components (Phases 9–10): (1) section/entrance motion on the primary content of the three pages — home (`src/app/page.tsx`), upload (`src/app/upload/page.tsx`), download (`src/app/download/page.tsx`); and (2) a SmoothUI scroll-progress indicator on scrollable page(s). Reuse the Phase 9 foundation (`src/lib/motion.ts`, `use-motion-preset.ts`, presets) — no per-page motion magic numbers.

Requirements in scope: MOT-01, MOT-02.
</domain>

<decisions>
## Implementation Decisions (from milestone brief — Claude's discretion within these)

- **MOT-01 (entrance motion):** animate the primary content of each page in on load — e.g. a staggered entrance of the main sections/cards using the Phase 9 entrance + stagger variants. Keep it tasteful (this is a file-share utility, not a marketing site): subtle, fast, once-on-mount. Use `AnimatePresence`/`motion` sections driven by named presets; if a new "page/section entrance" preset is warranted, ADD it to `src/lib/motion.ts` (+ document in MOTION.md) rather than inline magic numbers.
- **MOT-02 (scroll progress):** add a SmoothUI-style scroll-progress indicator (e.g. a thin top progress bar using `motion`'s `useScroll` + `scaleX`/`spring`). Only render it where the page actually scrolls (the download/upload pages can be long; the home page is short). Component must be reusable + reduced-motion-aware (respect `useReducedMotion` — the bar can still reflect position but without spring j-itter, or be hidden if it adds no value under reduced motion).
- **Reuse, in place:** wire motion into the existing page components; do NOT restructure page logic. Reuse existing app-shell if a scroll-progress belongs there. Keep it a shared component (`src/components/scroll-progress.tsx` or similar), not per-page copies.
- **Keep colours + type unchanged.** Only motion added. No colour/type token edits.
- **SSR/RSC safe** (Next 16 / React 19): scroll/entrance motion needs `"use client"`; keep server components server-safe.
- **Encryption boundary untouched:** these are page-presentation wrappers only — do NOT change upload/download/crypto logic or the live progress UI.
- **Theming intact:** entrance/scroll motion must render correctly in light/dark/system.
</decisions>

<code_context>
## Existing Code Insights
- Pages: `src/app/page.tsx` (home, ~2.7K — short), `src/app/upload/page.tsx` (~31K), `src/app/download/page.tsx` (~35K). Upload/download are long and scroll; home is short.
- App shell: `src/components/app-shell.tsx` wraps pages (sidebar + top bar) — a shared scroll-progress could mount here or per-page.
- Foundation (Phases 9–10): `src/lib/motion.ts` (transitions/variants/`resolveMotionPreset`), `src/lib/use-motion-preset.ts`, `src/components/motion-config.tsx` (app-root MotionConfig). `design-system/MOTION.md` documents the language.
- `motion` provides `useScroll`, `useSpring`, `motion.div style={{ scaleX }}` for a progress bar.
</code_context>

<specifics>
## Specific Ideas
- A shared `ScrollProgress` component (top hairline bar, `useScroll` + `useSpring`) mounted in the app shell or per long page; reduced-motion-aware.
- Page entrance: wrap each page's main content sections in `motion` with a staggered entrance preset, once-on-mount, subtle.
- If adding a preset for page/section entrance, name it and add to the foundation + MOTION.md.
- Plan tracer: prove entrance motion on ONE page (home — smallest) + the scroll-progress component build green, before applying to the two long pages.
</specifics>

<deferred>
## Deferred Ideas
- Cross-platform (web/PWA/TWA) + theming + encryption parity verification + human sign-off → Phase 12.
- Any heavier SmoothUI scroll effects (parallax, image reveals) — not needed for this utility; keep to entrance + progress.
</deferred>
