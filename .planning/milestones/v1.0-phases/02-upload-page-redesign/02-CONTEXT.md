# Phase 2: Upload Page Redesign - Context

**Gathered:** 2026-07-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Re-skin the **upload page** (`src/app/upload/page.tsx`) and its **dropzone**
(`src/components/file-dropzone.tsx`) to the Gemba design system established in
Phase 1, reusing the Phase 1 shared component layer, and make it theme-aware in
light and dark. Surfaces in scope: the file dropzone, the selected-file list, the
share-option controls (password toggle + field, download limit, expiry value +
unit), the in-progress upload state, and the post-upload share-link "done" state.

**Locked by ROADMAP success criterion 3 (do NOT change):** existing upload
functionality — drag-drop, multi-file selection, client-side encryption
(`src/lib/crypto.ts`), storage-mode dispatch (blob vs. fs), progress reporting,
and share-link generation (`/download?id=…#<key>`) — must keep working exactly as
today. This is a **visual/token redesign only**; the encryption boundary (key
lives only in the URL fragment, never reaches the server) is untouched.

This is a per-page application of Phase 1's system — not a re-litigation of the
design system itself. Phase 1's decisions are inherited wholesale (see Canonical
References).
</domain>

<decisions>
## Implementation Decisions

### Page layout / structure
- **D-01:** Keep the current **two-card stacked structure** — "Select Files" card
  (dropzone) → "Options" card (share settings) → full-width primary Upload button,
  plus the separate post-upload result card — reskinned to Gemba. No consolidation
  or restructuring; least churn, functionality untouched, familiar flow. Cards use
  the Phase 1 inset-ring Card recipe (COMP-05).

### Share-option controls (password / download limit / expiry)
- **D-02:** **Minimal-new-surface approach.** Reskin the existing raw native
  `<select>` (expiry unit) to Gemba field tokens in place — do NOT add a new shadcn
  Select component this phase. Keep the number `<Input>`s for download limit and
  expiry value, and the `Switch` for password protection, all reskinned to the
  Phase 1 Gemba field/toggle tokens (40px height, `--radius-sm`, `--ring-border` +
  `--shadow-field`, focus → `--ring-focus`). The native select should visually match
  the sibling reskinned inputs (same height, radius, ring, focus).

### Dropzone treatment
- **D-03:** Keep a **dashed border** on the dropzone (universally reads as
  "droppable"). Idle = dashed on the Gemba border token (`--border-default`); active
  (dragging) = accent border (`--gemba-accent`) + `--gemba-accent-subdued` (8%) fill
  tint. Selected-file rows render as **inset-ring rows** (Card-recipe styling:
  `--surface-card` + `--ring-border`, `--radius-md`/`lg`), each with a file glyph
  (Icon wrapper), name, size, and a ghost/ square remove button.

### Success / share-link "done" state
- **D-04:** **Calm ink + minimal success accent** — restrained, on-brand; NO large
  green success block. A small success-token confirmation (e.g. a `--gemba-success`
  check glyph via the Icon wrapper), the share link(s) in readonly field(s) + a
  square copy button (Phase 1 square Button variant), and the summary
  (password / downloads / expiry) rendered as **Chips** (COMP-03) — replacing the
  current `Badge`s. Use the Gemba `success` signal tokens (`--gemba-success` /
  `--gemba-success-subdued`), which must have lightened/desaturated dark-mode
  variants per the Phase 1 dark layer.

### Claude's Discretion
Downstream (researcher/planner/executor) owns these mechanical migrations — all
governed by the Phase 1 UI-SPEC and design-fidelity constraint, no user input needed:
- **Icon migration:** replace all 11 `lucide-react` icons on the page + dropzone
  (`Check`, `Copy`, `Download`, `File`, `Link2`, `Lock`, `Timer`, `Upload`,
  `CloudUpload`, `X`) with the closest Untitled UI glyphs via the `Icon` wrapper.
  Confirm each chosen glyph name exists in `src/components/icon-data.js`.
- **Badge → Chip:** migrate the summary `Badge`s to the Phase 1 `Chip` component
  (neutral / success / accent variants as appropriate).
- **Progress bar:** reskin the shadcn `Progress` to Gemba tokens (track
  `--surface-subdued`, fill ink or `--gemba-accent`).
- **Button variant mapping:** map the page's `variant="outline"` and `size="icon"`
  usages to Phase 1 Gemba ranks (secondary/tertiary) and the square variant.
- **Typography/color cleanups:** replace raw `text-3xl font-bold` header with the
  Gemba type scale (`.gemba-h2`/`h3`), and the raw `bg-green-100`/`text-green-600`
  success colors with `--gemba-success` tokens. `text-muted-foreground` may stay
  (it resolves through the Phase 1 `@theme` remap) or move to `--text-subdued`.
- **Label reskin** if needed to match the Gemba field spec.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design contract (inherited from Phase 1 — authoritative)
- `.planning/phases/01-design-foundation-home-page/01-UI-SPEC.md` — the Gemba
  visual/interaction contract: token tables, Button ranks (COMP-01), Card recipe
  (COMP-05), Chip (COMP-03), form controls (COMP-02), Icon wrapper (COMP-04),
  dark-mode rules, Registry Safety. Phase 2 realizes this contract on the upload page.
- `.planning/phases/01-design-foundation-home-page/01-CONTEXT.md` — Phase 1 locked
  decisions (D-01…D-10): token wiring, Icon wrapper (no lucide/emoji), dark-mode
  near-black + lightened signals. All inherited.

### Design system tokens (source of truth — do not invent values)
- `design-system/tokens/*.css` (colors, typography, spacing, fonts) — the only
  permitted source of color/type/spacing/radii/shadow values.
- `design-system/APPLY-GUIDE.md` and `design-system/DESIGN-SYSTEM.md` — application
  guardrails and voice/tone.
- `design-system/components/forms/` — reference Input/Switch/Checkbox/Radio token
  usage for the share-option controls.

### Project constraints
- `.planning/PROJECT.md` — design-fidelity constraint ("only design-system tokens,
  do not invent"), reuse-first, and the **encryption-boundary** constraint (key
  never reaches the server) that success criterion 3 protects.

### Phase 2 requirement
- `.planning/REQUIREMENTS.md` — **PAGE-02** (upload page redesigned to Gemba).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (from Phase 1)
- `src/components/ui/button.tsx` — Gemba Button ranks + square variant (COMP-01).
- `src/components/ui/card.tsx` — inset-ring Card recipe (COMP-05).
- `src/components/chip.tsx` — Chip (COMP-03), replaces `Badge` in the result state.
- `src/components/icon.tsx` + `icon-data.js` — Icon wrapper (COMP-04); all icons go through it.
- `src/components/ui/{input,switch,checkbox,radio-group}.tsx` — reskinned Gemba
  form controls; the upload page's password/limit/expiry controls reuse these.
- `src/app/globals.css` — Gemba `@theme` + `.dark` token layer already wired app-wide.

### Established Patterns
- No `lucide-react` and no emoji on redesigned surfaces (Phase 1 D-06/D-07).
- Gemba tokens only; Card = inset-ring (no CSS `border`); icon-only controls carry `aria-label`.
- Page renders inside the top-nav app shell (`src/components/app-shell.tsx`).

### Integration Points
- `src/app/upload/page.tsx` — the page being redesigned (state machine, options, result).
- `src/components/file-dropzone.tsx` — the dropzone being reskinned (drag state, file list, size-limit toast).
- `src/lib/crypto.ts`, `/api/files`, `/api/storage-mode`, `@vercel/blob/client` —
  the upload/encryption pipeline that MUST remain functionally unchanged.

</code_context>

<specifics>
## Specific Ideas

- User chose the Gemba-restrained defaults across all four areas: minimal new
  surface (no new Select component), keep the familiar two-card flow, dashed
  drop-target with an accent-tinted active state, and a calm (non-celebratory)
  success state. The through-line is **reuse-first and low-chroma restraint** —
  consistent with Phase 1 and the Gemba brand.

</specifics>

<deferred>
## Deferred Ideas

- A dedicated reusable **Select** component (shadcn Select reskinned to Gemba) —
  deferred; this phase reskins the native `<select>` in place. Revisit if a later
  phase needs a richer/reusable select.
- Richer share-option controls (segmented expiry unit, +/- stepper for download
  limit) — deferred in favor of the minimal reskin.

*Discussion stayed within phase scope; encryption/upload behavior explicitly out of
scope for change (locked by success criterion 3).*

</deferred>

---

*Phase: 02-upload-page-redesign*
*Context gathered: 2026-07-10*
