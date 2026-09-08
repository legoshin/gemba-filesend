---
phase: 260908-s9a-allow-kyl-gemba-framing
plan: 01
subsystem: infra
tags: [csp, security-headers, next.config, framing, clickjacking]

# Dependency graph
requires: []
provides:
  - "CSP frame-ancestors allowlists 'self' and https://kyl.gemba.uk exactly"
  - "Deny-all X-Frame-Options header removed; CSP frame-ancestors is the sole framing-control mechanism"
affects: []

# Actuals (#2632)
actuals:
  tokens: 333
  tasks: 1
  commits: 1

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - apps/web/next.config.ts

key-decisions:
  - "Removed the X-Frame-Options: DENY header entirely rather than keeping it alongside the new CSP allowlist, since that header can only express DENY/SAMEORIGIN and would otherwise contradict the new cross-origin allowlist by forcing deny-all framing in browsers that honor it over CSP"

patterns-established: []

requirements-completed: [QUICK-260908-s9a]

coverage:
  - id: D1
    description: "CSP frame-ancestors directive changed from deny-all ('none') to an exact allowlist of 'self' https://kyl.gemba.uk, and the deny-all X-Frame-Options header removed so CSP frame-ancestors is the sole framing-control mechanism"
    requirement: "QUICK-260908-s9a"
    verification:
      - kind: other
        ref: "grep assertions (exact frame-ancestors string present once, 'none' value gone, X-Frame-Options key gone) + `npx tsc --noEmit` in apps/web"
        status: pass
    human_judgment: false

# Metrics
duration: 5min
completed: 2026-09-08
status: complete
---

# Quick Task 260908-s9a: Allow kyl.gemba.uk framing Summary

**CSP `frame-ancestors` now allowlists exactly `'self' https://kyl.gemba.uk`; the deny-all `X-Frame-Options: DENY` header was removed since it can't express a cross-origin allowlist.**

## Performance

- **Duration:** 5 min
- **Completed:** 2026-09-08
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- `apps/web/next.config.ts` CSP `frame-ancestors` directive changed from `'none'` to `'self' https://kyl.gemba.uk`, allowing kyl.gemba.uk (and only kyl.gemba.uk, plus same-origin) to embed send.gemba.uk in an iframe
- Removed the `X-Frame-Options: DENY` response-header object — that header can only express DENY/SAMEORIGIN and cannot allowlist a specific cross-origin embedder, so it would otherwise contradict the new CSP allowlist; CSP `frame-ancestors` is now the sole framing-control mechanism
- Extended the existing CSP comment block to document the framing acceptance (single trusted origin, all others still blocked, rationale for dropping X-Frame-Options), leaving the prior unsafe-inline / D-04..D-07 notes intact

## Task Commits

Each task was committed atomically:

1. **Task 1: Allowlist kyl.gemba.uk in frame-ancestors and drop the deny-all framing header** - `b88190f` (feat)

## Files Created/Modified
- `apps/web/next.config.ts` - CSP `frame-ancestors` allowlist changed to `'self' https://kyl.gemba.uk`; `X-Frame-Options: DENY` header object removed; CSP comment block extended to record the framing acceptance

## Decisions Made
- Removed X-Frame-Options entirely (no SAMEORIGIN fallback attempt) since it structurally cannot express a cross-origin allowlist and would otherwise contradict the new CSP directive in browsers that still honor it

## Deviations from Plan

None - plan executed exactly as written, with one wording adjustment: the task's suggested CSP comment wording repeated the literal string "frame-ancestors" in a way that would have broken the plan's own automated verify assertion (`grep -c 'frame-ancestors'` must equal 1, counting only the directive itself, not comment mentions). The comment was worded to describe "the CSP framing directive" instead of restating the literal directive name, preserving both the documentation intent and the exact-count verification. This is a same-scope wording fix within Task 1, not a new file or behavior change.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. This is a header-config-only change; no runtime/deploy action needed beyond normal deployment of the code change.

## Next Phase Readiness
- send.gemba.uk's CSP now allows kyl.gemba.uk to embed it in an iframe while all other cross-origin framing remains blocked
- No blockers or concerns

---
*Phase: 260908-s9a-allow-kyl-gemba-framing*
*Completed: 2026-09-08*

## Self-Check: PASSED
- FOUND: apps/web/next.config.ts
- FOUND: b88190f
