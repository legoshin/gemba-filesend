---
phase: quick-260908-tv6-embed-mode
plan: 01
subsystem: ui
tags: [nextjs, react, embed, iframe, context, suspense]

# Dependency graph
requires: []
provides:
  - "EmbedProvider client component (src/components/embed-provider.tsx) exposing isEmbed/backgroundColor via context, Suspense-guarded useSearchParams read"
  - "AppShell chrome (header + MobileTabBar) hidden and background overridden when mode=embed / color=<hex>"
  - "Upload page heading block hidden in embed mode"
affects: [upload-page, app-shell, embed-consumers]

actuals:
  tokens: 2020
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Suspense-guarded useSearchParams reader with a DEFAULT-context fallback so server-prerendered pages (e.g. static home) always render full content while the client hydrates real embed state after mount"
    - "Untrusted URL param -> strictly regex-validated hex color -> applied ONLY as an inline style object value, never string-interpolated into CSS"

key-files:
  created:
    - src/components/embed-provider.tsx
  modified:
    - src/app/layout.tsx
    - src/components/app-shell.tsx
    - src/app/upload/page.tsx

key-decisions:
  - "EmbedProvider wraps AppShell (outside it, inside ThemeProvider) in layout.tsx so both the chrome (AppShell) and page content (upload page) read one shared embed context instead of each parsing search params independently"
  - "Suspense fallback renders the context Provider with the DEFAULT (non-embed) value wrapping children, not a null/skeleton — this is what keeps the static home page (and every other page) prerendering real content instead of blanking during the client-only useSearchParams read"

patterns-established:
  - "normalizeEmbedColor(raw): strict /^#?[0-9a-fA-F]{3,8}$/ test, returns null on any mismatch, never touches CSS string interpolation — reusable pattern for any future untrusted-param-to-style flow"

requirements-completed: [EMBED-01, EMBED-02]

coverage:
  - id: D1
    description: "/upload?mode=embed hides AppShell header + MobileTabBar and the upload page heading, while dropzone/Options/upload button/results remain"
    requirement: "EMBED-01"
    verification:
      - kind: other
        ref: "npm run build (static prerender of /upload succeeds); manual code-path reasoning per plan <done> criteria"
        status: pass
    human_judgment: true
    rationale: "Visual chrome-hidden behavior in an iframe embed depends on runtime browser rendering; no automated UI test exists in this repo for this flow, so a human should confirm the rendered result in a browser matches expectations."
  - id: D2
    description: "color=<hex> query param overrides app background via inline style object value only; invalid values are ignored (no CSS injection)"
    requirement: "EMBED-01"
    verification:
      - kind: other
        ref: "normalizeEmbedColor implementation matches plan's threat-model mitigation (regex validation, inline style object only); npm run build passes"
        status: pass
    human_judgment: true
    rationale: "Security-relevant validation behavior benefits from a human spot-check against the threat model's malformed-input examples (color=red;background:url(x), color=xyz, color=12) in a live browser before relying on it for the kyl.gemba.uk embed."
  - id: D3
    description: "/upload with no params and the static home page render byte-for-byte unchanged (full chrome, heading, encrypt->upload->share flow intact)"
    requirement: "EMBED-02"
    verification:
      - kind: other
        ref: "npm run build: / and /upload still listed as ○ (Static) prerendered content, identical route table to pre-change build"
        status: pass
    human_judgment: false

duration: ~15min
completed: 2026-09-08
status: complete
---

# Quick Task 260908-tv6: Embed Mode Summary

**Added `mode=embed` and `color=<hex>` URL params to `/upload` via a shared Suspense-guarded EmbedProvider context, hiding AppShell chrome + page heading and overriding the background through a strictly hex-validated inline style — no changes to CSP/framing config or the crypto flow.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- New `EmbedProvider` (src/components/embed-provider.tsx): context + `useEmbed()` hook + `normalizeEmbedColor()` pure validator, wrapped in a `<Suspense>` whose fallback supplies the DEFAULT (non-embed) context so prerendering is unaffected
- `layout.tsx` wraps `<AppShell>` with `<EmbedProvider>` (outside AppShell, inside ThemeProvider)
- `app-shell.tsx` conditionally omits the `<header>` and `<MobileTabBar />` when `isEmbed`, and applies `style={{ backgroundColor }}` to both `<main>` and the outer flex container when a valid color is present
- `upload/page.tsx` conditionally omits the "Upload Files" heading block when `isEmbed`, leaving the dropzone, Options, upload button, and results/share output rendered in both modes
- `npm run build` succeeds after each task; `/` and `/upload` remain statically prerendered (○) — no prerender bailout from the client-only `useSearchParams` read

## Task Commits

Each task was committed atomically:

1. **Task 1: EmbedProvider + AppShell chrome/background branch (tracer)** - `caf2715` (feat)
2. **Task 2: Hide the upload page heading block in embed mode** - `edd529a` (feat)

**Plan metadata:** (this docs commit, made separately by the orchestrator)

## Files Created/Modified
- `src/components/embed-provider.tsx` - New client component: EmbedState context, useEmbed() hook, normalizeEmbedColor() validator, Suspense-guarded EmbedReader/EmbedProvider
- `src/app/layout.tsx` - Wraps `<AppShell>` in `<EmbedProvider>`
- `src/components/app-shell.tsx` - Conditionally renders header/MobileTabBar based on isEmbed; applies inline backgroundColor style to main + outer container
- `src/app/upload/page.tsx` - Conditionally renders the heading block based on isEmbed

## Decisions Made
- EmbedProvider is a single shared context (not duplicated `useSearchParams()` reads in AppShell and the upload page) so both consumers see identical embed state derived from one parse
- The Suspense fallback renders the DEFAULT-value Provider around `children` (not a skeleton/null) specifically to preserve static prerendering of pages like the home page

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. `npm run lint` reported pre-existing errors/warnings entirely in unrelated files (`design-system/`, `apps/web/.next/` build output, `src/components/icon-data.js`) — none in any file touched by this plan. Left untouched per scope boundary rule.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `/upload?mode=embed&color=<hex>` is ready for kyl.gemba.uk (or any framing app) to embed chrome-free
- No changes to CSP/framing headers were made — if kyl.gemba.uk needs to actually load `/upload` in an iframe, `next.config.ts` frame-ancestors/X-Frame-Options will need separate review (explicitly out of scope for this task)
- No blockers

---
*Task: quick-260908-tv6-embed-mode*
*Completed: 2026-09-08*

## Self-Check: PASSED

All created/modified files and both task commits (caf2715, edd529a) verified present.
