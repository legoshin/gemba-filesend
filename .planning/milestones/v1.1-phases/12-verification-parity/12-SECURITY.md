# Phase 12: Verification & Parity — Accepted Risk Note

Terminal-phase record of pre-existing accepted-risk items surfaced during the
Phase 9–11 SmoothUI re-shape's threat-mitigation review, carried forward
unchanged by this phase's design/a11y fix pass (no scroll-handler code was
touched by any Phase 12 fix).

## Accepted Risks

| ID | Category | Location | Severity | Disposition | Rationale |
|---|---|---|---|---|---|
| T-11-06 | Denial of Service | Upload page scroll handler (`ScrollProgress`) | Low | Accepted | Passive `MotionValue`-driven progress bar, no per-scroll React state churn; `prefers-reduced-motion` drops the spring entirely. |
| T-11-09 | Denial of Service | Download page scroll handler (`ScrollProgress`) | Low | Accepted | Same as T-11-06 — passive `MotionValue`-driven bar, no per-scroll state churn; reduced-motion drops the spring. |

**Source:** `.planning/phases/11-page-motion/11-02-PLAN.md` (T-11-06),
`.planning/phases/11-page-motion/11-03-PLAN.md` (T-11-09).

**Phase 12 disposition:** No new mitigation applied. Both risks remain low
severity — the `ScrollProgress` component drives its bar via a Motion
`MotionValue` subscription (no `setState` per scroll event), so there is no
unbounded render loop or memory growth path a malicious/pathological scroll
stream could exploit; reduced-motion users bypass the spring animation
entirely. No code in either scroll handler was modified by this phase's
fix commits (`ec72146a`..`16ac17bb`), so the original Phase 11 risk
assessment stands unchanged.

---

_Recorded: 2026-09-21_
_Phase: 12-verification-parity_
