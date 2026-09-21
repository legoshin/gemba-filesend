# Phase 9: SmoothUI Foundation - Context

**Gathered:** 2026-09-21
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped; milestone brief is the spec)

<domain>
## Phase Boundary

Install the `motion` dependency and build the shared **shape + motion utility layer** that every later component re-shape (Phase 10) and page motion (Phase 11) will draw from, plus reduced-motion handling, and document the new shape + motion language in `design-system/`. This is the foundation phase — no user-facing component is re-shaped here beyond what is needed to prove the utility layer works.

Requirements in scope: FND-01, FND-02, FND-03, DOC-01.
</domain>

<decisions>
## Implementation Decisions (from milestone brief — Claude's discretion within these)

- **Library:** SmoothUI (https://smoothui.dev/docs/components) — copy-paste source built on **Motion** (the `motion` package, Framer Motion successor) + Tailwind. Add `motion` as a dependency. GSAP is only needed for specific SmoothUI effects; do NOT add GSAP in this phase unless a concrete Phase 10/11 component requires it — prefer `motion` alone to keep the bundle lean.
- **Keep, don't change:** colour tokens and Public Sans type stay exactly as they are. This phase changes only *shape* (radii/border geometry presets) and introduces *motion* presets. Do not touch `design-system/tokens/colors.css` or type tokens.
- **Shape presets:** define a small, reusable set of SmoothUI-flavoured geometry tokens/utilities (radii scale, border/ring treatment, clip-corner helper) layered on top of the existing Gemba tokens — derive from existing radii where possible; no invented colours.
- **Motion presets:** a single shared module of reusable `motion` transition + variant presets (e.g. entrance/exit, press/tap, hover, list stagger, toast, progress, dropdown/dialog). Components must import these — **no per-component motion magic numbers** (FND-02).
- **Reduced motion (FND-03):** presets must resolve to instant/opacity-only when `prefers-reduced-motion: reduce`. Provide a hook/util (e.g. wrapping `useReducedMotion` from `motion`) and/or CSS fallback so every consumer gets it for free.
- **In place, not parallel:** these utilities restyle the existing shadcn/Radix components in Phase 10; do NOT fork a parallel component kit. Keep Radix behaviour.
- **Docs (DOC-01):** update `design-system/` (e.g. a MOTION/shape doc) recording the new shape + motion language and stating explicitly that colour + type tokens are unchanged.

## Constraints (hard)
- Must not weaken client-side E2E encryption (this phase touches no crypto/network path).
- Must hold web/PWA/TWA parity; respect SSR (Next.js 16 / React 19) — motion presets must be SSR-safe ("use client" where needed).
- Tailwind 4 + existing token pipeline.
</decisions>

<code_context>
## Existing Code Insights

- Live web app is the root `src/` Next.js 16 / React 19 / Tailwind 4 app.
- Shared UI layer: `src/components/ui/` (shadcn/Radix). App-specific: `src/components/` (file-dropzone, chip, app-shell, mobile-tab-bar, theme-toggle, icon).
- `clsx` + `tailwind-merge` already present (`cn` helper likely in `src/lib/`). Reuse the existing `cn`/class-merge utility for the shape utilities.
- Design tokens live in `design-system/tokens/` and are wired into the app globals; Gemba tokens are the single source of truth for colour/type.
- `motion` / framer-motion is NOT yet a dependency — this phase adds it.
</code_context>

<specifics>
## Specific Ideas

- Create something like `src/lib/motion.ts` (transition + variant presets, reduced-motion-aware) and `src/lib/shape.ts` (or Tailwind layer) for radii/border/clip presets — final naming at planner's discretion, but keep them small, discoverable, and the single source consumers import.
- Prove the layer with at least one real usage (e.g. wire a preset into one existing component or a small demo) so success criterion 1 ("imported/used") is genuinely met.
- Document in `design-system/` (e.g. `design-system/MOTION.md` or extend `DESIGN-SYSTEM.md`).
</specifics>

<security_approval>
## Locked Decision — `motion` package vetted & approved (human-verify checkpoint satisfied)

RESEARCH.md's package-legitimacy audit flagged `motion` as **SUS (reason: "too-new")** — a false positive of the "latest publish date" heuristic (a recent patch publish). Protocol requires a `checkpoint:human-verify` before installing a SUS-flagged package. That checkpoint is **satisfied here** by the orchestrator's manual vetting on 2026-09-21, recorded as this locked decision (verifiable artifact — this is the authorization the plan must cite; there is NO separate "planning directive"):

**Evidence (npm registry + downloads API, checked 2026-09-21):**
- Package: `motion` version `13.4.0`
- Repository: `github.com/motiondivision/motion` — the official Motion (Framer Motion successor) monorepo
- Maintainers: `popmotion` (Matt Perry — creator of Framer Motion / Popmotion), `motionone` (`matt@motion.dev`)
- **Install-time scripts: NONE** — no `preinstall`/`install`/`postinstall`; the package's `scripts` are dev/test/build/prepack/postpublish only, which do NOT execute on consumer `npm install`. Zero install-time code-execution surface.
- Popularity: ~15.4M weekly downloads.

**Verdict: APPROVED for install.** The plan may install `motion` without a further blocking human checkpoint, citing THIS locked decision as the authorization. Keep the threat-register entry (T-09-SC) but point its mitigation at this recorded vetting.
</security_approval>

<deferred>
## Deferred Ideas

- Re-shaping the actual components (forms, buttons, surfaces, feedback, file/list, shell) → Phase 10.
- Page/section entrance motion + scroll progress → Phase 11.
- Cross-platform parity verification + human sign-off → Phase 12.
</deferred>
