# Phase 3: Download Page Redesign & Dark Mode Complete - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-10
**Phase:** 3-Download Page Redesign & Dark Mode Complete
**Areas discussed:** Error & edge states, Theme control (system), File-details presentation (+ secure emphasis), Dark-mode QA rigor

---

## Error & edge states

| Option | Description | Selected |
|--------|-------------|----------|
| Inline states | Terminal errors → dedicated Gemba state card (icon + message + "try another link"); wrong-password → inline field error; toasts only for transient/network | ✓ |
| Toast-only (keep current) | Every failure stays an ephemeral toast; least churn but errors vanish and wrong-password leaves no persistent cue | |
| Hybrid: inline password only | Inline error under the password field; keep terminal errors as toasts | |

**User's choice:** Inline states (Recommended)
**Notes:** Download page is the most failure-prone surface (expired/exhausted/not-found/wrong-password/truncated). Composed Gemba state cards reuse the Card recipe; transient/network blips stay as toasts. → D-01.

---

## Theme control (system)

| Option | Description | Selected |
|--------|-------------|----------|
| 3-way light/dark/system | Replace the 2-way toggle with a control that can re-select "follow system" | ✓ |
| 2-way + system default | Default to system on first load; keep light↔dark flip (pins explicit theme once used) | |
| You decide | Planner picks cleanest implementation satisfying "system" | |

**User's choice:** 3-way light/dark/system (Recommended)
**Notes:** Success criterion 3 explicitly requires "system" to work; current `ThemeToggle` flips `resolvedTheme` and loses "follow system". Small shared-component change. Exact affordance (cycle vs segmented) left to planner/UI-SPEC. → D-02.

---

## File-details presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Phase-2 carry-forward | Inset-ring file row + Badges→Chips; consistent with upload, no new patterns | |
| Carry-forward + secure emphasis | Same, but extra emphasis on the E2E-encrypted reassurance (recipient's trust moment) | ✓ |
| You decide | Planner applies calm Gemba treatment per UI-SPEC | |

**User's choice:** Carry-forward + secure emphasis
**Follow-up (Secure):** How prominent, concretely?

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated secure row | Small inset-ring / success-subdued row inside the preview card: Lock/ShieldCheck glyph + "End-to-end encrypted — decrypted in your browser; the key never reaches our server" | ✓ |
| Leading success chip only | Make E2E-encrypted the leading success chip, no separate banner | |
| Subtle caption under filename | One-line subdued caption near the filename | |

**User's choice:** Dedicated secure row (Recommended)
**Notes:** Recipient is often a non-user landing on a link — an explicit, calm (low-chroma) E2E reassurance earns a distinct on-brand surface. Reassurance copy about the existing model, not new behavior. → D-03.

---

## Dark-mode QA rigor (DARK-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Checklist + human sign-off | Explicit trouble-spot checklist (toasts, native select, Public Sans webfont, focus rings, app-shell/tab-bar, scrollbars) × light/dark/system on every page + blocking sign-off | ✓ |
| Human visual sweep only | Manual pass with sign-off, no formal checklist | |
| You decide | Planner defines the verification gate | |

**User's choice:** Checklist + sign-off (Recommended)
**Notes:** Criterion 3 = "no mis-themed element anywhere." Checklist explicitly folds in the known Public Sans / Turbopack production font drop. Blocking human sign-off mirrors Phase 2's 02-03 gate. → D-04.

---

## Claude's Discretion

- Icon migration (7 lucide icons → Icon wrapper), Badge→Chip, Progress/spinner reskin, Button rank mapping, type/color token cleanups, Card inset-ring recipe.
- Exact 3-way theme control affordance (D-02) and exact per-error state-card copy/glyphs (D-01).

## Deferred Ideas

- Reusable design-system 3-way theme switcher component (implement locally for this app instead).
- Security headers / rate limiting / download-counter race fix / unit tests → Phase 4.
- Richer preview (thumbnail, QR of link) → future milestone.
