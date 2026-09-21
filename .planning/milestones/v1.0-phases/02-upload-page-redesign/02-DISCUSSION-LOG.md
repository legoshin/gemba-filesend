# Phase 2: Upload Page Redesign - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-10
**Phase:** 02-upload-page-redesign
**Areas discussed:** Page layout / structure, Share-option controls, Dropzone treatment, Success / share-link state

---

## Page layout / structure

| Option | Description | Selected |
|--------|-------------|----------|
| Keep two-card stack (reskinned) | Select Files card → Options card → full-width Upload button + separate result card, reskinned to Gemba. Least churn. | ✓ |
| Single consolidated card | Dropzone + options combined into one card. | |
| Tight single column, minimal cards | Drop most card chrome; sections separated by spacing/hairlines. | |

**User's choice:** Keep two-card stack (reskinned)
**Notes:** Least churn, functionality untouched, familiar flow. Cards use the Phase 1 inset-ring recipe.

---

## Share-option controls (password / download limit / expiry)

| Option | Description | Selected |
|--------|-------------|----------|
| Reskin native select + number inputs | Reskin the raw expiry-unit `<select>` to Gemba tokens; keep number inputs + Switch. No new component. | ✓ |
| Add a shadcn Select component | Install/reskin a proper reusable Select for the expiry unit. | |
| Richer controls (segmented / stepper) | Segmented expiry unit + stepper download limit. | |

**User's choice:** Reskin native select + number inputs
**Notes:** Minimal new surface; native select must visually match the sibling reskinned inputs. A reusable Gemba Select is deferred.

---

## Dropzone treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Dashed ring, accent tint on drag | Dashed border on Gemba border token idle; accent border + accent-subdued tint on drag. Selected files as inset-ring rows. | ✓ |
| Solid inset-ring card, subdued tint on drag | Match the Card recipe (no dashed); fill with `--surface-subdued` on drag. | |
| You decide (match Gemba) | Claude picks the most on-system treatment. | |

**User's choice:** Dashed ring, accent tint on drag
**Notes:** Dashed border reads as "droppable"; active state uses `--gemba-accent` + `--gemba-accent-subdued`.

---

## Success / share-link "done" state

| Option | Description | Selected |
|--------|-------------|----------|
| Calm ink + minimal success accent | Small success-token check, readonly link + square copy button, summary as Chips. No big green block. | ✓ |
| Celebratory green success block | Prominent success card with a large green check + success-tinted surface. | |
| You decide (match Gemba) | Claude picks the most on-system treatment. | |

**User's choice:** Calm ink + minimal success accent
**Notes:** Restrained, on-brand; uses Gemba `success` signal tokens (with lightened dark variants); Badges → Chips.

---

## Claude's Discretion

Mechanical migrations delegated to downstream, all governed by the Phase 1 UI-SPEC:
- Icon migration (11 lucide icons → Icon-wrapper glyphs)
- Badge → Chip migration
- Progress bar reskin to Gemba tokens
- Button `variant="outline"` / `size="icon"` → Gemba ranks + square variant
- Raw typography/color cleanups (header type scale; green success → `--gemba-success`)
- Label reskin to match the field spec

## Deferred Ideas

- A dedicated reusable Gemba **Select** component (shadcn Select reskinned) — this phase reskins the native `<select>` in place.
- Richer share-option controls (segmented expiry unit, +/- stepper for download limit).
- Encryption/upload behavior changes — explicitly out of scope (locked by success criterion 3).
