# Phase 2: Upload Page Redesign - Pattern Map

**Mapped:** 2026-07-10
**Files analyzed:** 2 (both modified in place, no new files)
**Analogs found:** 2 / 2 (both exact — Phase 1 shipped components)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|----------------|
| `src/app/upload/page.tsx` | component (page) | request-response (client-side crypto + XHR/blob upload, unchanged) | `src/app/page.tsx` (Phase 1 home page — Icon/Chip/Button/Card token usage) | exact (token/composition pattern) |
| `src/components/file-dropzone.tsx` | component | event-driven (drag/drop + file-select) | `src/app/page.tsx` + `src/components/ui/card.tsx` (ring/token recipe) | role-match (no existing dropzone-shaped analog; token recipe is exact) |

No files are being created — both are in-place visual/token redesigns. Business logic (`uploadOneFile`, `uploadDirect`, `handleUpload`, `writeClipboard`, state machine) is **out of scope** and must be preserved byte-for-byte; only JSX/className/import changes apply.

## Pattern Assignments

### `src/app/upload/page.tsx` (component, request-response)

**Primary analog:** `src/app/page.tsx` (lines 1-77, full file — Phase 1 reference for Icon/Chip/Button/Card composition)
**Secondary analogs:** `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/chip.tsx`, `src/components/icon.tsx`, `src/components/ui/input.tsx`, `src/components/ui/switch.tsx`

**Imports pattern** — replace `lucide-react` + `Badge` imports with Icon/Chip (from `src/app/page.tsx` lines 1-5):
```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/chip";
import { Icon } from "@/components/icon";
```
Applied to `upload/page.tsx`: drop the `lucide-react` import block (lines 4-13) and the `Badge` import (line 27); add:
```tsx
import { Icon } from "@/components/icon";
import { Chip } from "@/components/chip";
```
Keep `CardDescription`, `Input`, `Label`, `Switch`, `Progress`, `Separator`, `FileDropzone`, `toast`, and the `@/lib/crypto` imports — all unchanged (D-01, encryption boundary untouched).

**Icon migration map (Claude's Discretion item, resolved against `icon-data.js`):**

| lucide-react (current) | Icon wrapper `name` prop | Verified in icon-data.js |
|---|---|---|
| `Check` | `"Check"` | yes |
| `Copy` | `"Copy01"` | yes |
| `Download` | `"Download01"` | yes (matches home page's Receive-a-file icon) |
| `FileIcon` (`File as FileIcon`) | `"File01"` | yes |
| `Link2` | `"Link02"` | yes |
| `Lock` | `"Lock01"` | yes (matches home page's "End-to-end encryption" feature icon) |
| `Timer` | `"Clock"` | yes (matches home page's "Auto-expiring links" feature icon — no `Timer` glyph exists, `Clock` is the closest and already-used analog) |
| `Upload` (primary CTA icon) | `"Upload01"` | yes (matches home page's Send-a-file icon) |
| `CloudUpload` (dropzone, in file-dropzone.tsx) | `"UploadCloud01"` | yes |
| `X` (remove-file button, in file-dropzone.tsx) | `"XClose"` | yes |

Usage pattern (from `src/app/page.tsx` lines 41, 47, 63):
```tsx
<Icon name="Upload01" size={20} />
```
Icon replaces the lucide `<Check className="h-4 w-4" />` etc. — swap `size={16|20}` for the equivalent px, drop `className="h-4 w-4"` sizing (Icon's `size` prop replaces Tailwind h/w classes); keep any color/utility classes (e.g. `text-muted-foreground`) passed through via `className` (Icon spreads `...rest` onto the `<svg>`, `src/components/icon.tsx` lines 11-25).

**Card recipe (COMP-05)** — no change needed to `Card`/`CardHeader`/`CardContent`/`CardTitle` usage; the component itself already carries the inset-ring recipe (`src/components/ui/card.tsx` lines 5-16: `shadow-[var(--ring-border),var(--shadow-card)]`, no `border` class). Page-level Card usage (lines 416-513 of current `page.tsx`) stays structurally the same — D-01 keeps the two-card stack. Only replace the raw `text-lg` CardTitle sizing with `.gemba-h4` per the type-scale table (UI-SPEC "Typography") if the checker flags raw Tailwind text sizing; `CardTitle` itself applies no size (`src/components/ui/card.tsx` line 35, `leading-none font-semibold` only), so the page's own `className="text-lg"` (upload/page.tsx lines 504, 517) should become `className="gemba-h4"`.

**Header typography cleanup** (Claude's Discretion — replace raw `text-3xl font-bold`):
Current (`upload/page.tsx` line 409):
```tsx
<h1 className="text-3xl font-bold tracking-tight">Upload Files</h1>
```
Replace with the Gemba scale used on the home hero (`src/app/page.tsx` line 33 uses `.gemba-h1` for the hero; a page header like this is a sub-section heading, so use `.gemba-h2` or `.gemba-h3` per UI-SPEC Typography table — h3/h2-equivalent is 24-28px):
```tsx
<h1 className="gemba-h2">Upload Files</h1>
```

**Button variant/size mapping (Claude's Discretion — `variant="outline"` / `size="icon"`):**
`src/components/ui/button.tsx` cva variants (lines 11-23) and sizes (lines 24-34) — the Gemba ranks are `default` (primary/ink), `secondary`, `tertiary`, `ghost`; `outline` still exists in the cva table (line 15-16) but is the *pre-Gemba* shadcn variant, not a Gemba rank — UI-SPEC COMP-01 defines only Primary/Secondary/Tertiary/Ghost. Map:

| Current usage in upload/page.tsx | Replace with |
|---|---|
| `<Button variant="outline" size="icon" onClick={handleCopy...}>` (copy button, line 449-454) | `<Button variant="secondary" size="icon">` — square icon button, secondary rank (not primary CTA); **must add `aria-label="Copy link"`** per UI-SPEC accessibility rule (icon-only buttons require aria-label) |
| `<Button variant="outline" className="flex-1" onClick={handleReset}>` (line 490, "Upload More") | `<Button variant="secondary" className="flex-1">` |
| `<Button size="icon" ...>` remove-file button in file-dropzone.tsx (line 162-169, currently `variant="ghost" size="icon"`) | keep `variant="ghost" size="icon"` (already a valid Gemba rank) — **add `aria-label="Remove file"`** |
| Primary Upload CTA (`<Button size="lg" className="w-full gap-2 text-base" ...>`, line 634) | Gemba `size="default"` is the standard CTA size (40px tall per UI-SPEC); `size="lg"` exists in cva but is not a documented Gemba rank size — prefer `size="default"` with `className="w-full"` to match the home page's primary CTA sizing convention (`src/app/page.tsx` line 40, `<Button size="default">`) |

**Chip migration (Badge → Chip, Claude's Discretion):**
Current `Badge` usage (upload/page.tsx lines 466-485) — 3 pills: password (conditional), download limit, expiry. Replace with `Chip` (`src/components/chip.tsx` lines 36-61), following the home page's usage pattern (`src/app/page.tsx` line 53: `<Chip variant="accent">END-TO-END ENCRYPTED</Chip>`):
```tsx
<div className="flex flex-wrap gap-2">
  {usePassword && (
    <Chip variant="neutral" icon={<Icon name="Lock01" size={16} />}>
      PASSWORD PROTECTED
    </Chip>
  )}
  <Chip variant="neutral" icon={<Icon name="Download01" size={16} />}>
    {downloadLimit} DOWNLOAD{Number(downloadLimit) !== 1 ? "S" : ""} EACH
  </Chip>
  <Chip variant="neutral" icon={<Icon name="Clock" size={16} />}>
    EXPIRES IN {expiryValue} {(Number(expiryValue) === 1 ? expiryUnit.slice(0, -1) : expiryUnit).toUpperCase()}
  </Chip>
</div>
```
Note: Chip labels are ALL-CAPS per COMP-03 (`.gemba-chip-label` uses `uppercase`, `src/components/chip.tsx` line 8) — uppercase the dynamic text, and Chip's `icon` prop renders at a fixed internal `size-4` wrapper (line 54) so pass `size={16}` on the Icon to match.

**Success state (D-04 — calm ink + minimal success accent, replaces the green circle block):**
Current (upload/page.tsx lines 417-420):
```tsx
<div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
  <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
</div>
```
Replace with the Gemba success signal tokens (`src/app/globals.css` lines 118-129 — `.dark` layer already defines lightened `--gemba-success: #4ec06a` and `--gemba-success-subdued: rgba(78,192,106,0.16)`; light-mode equivalents live in the `:root`/light token block earlier in the same file, same variable names). Per D-04, keep it small/restrained — no large colored block:
```tsx
<div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--gemba-success-subdued)]">
  <Icon name="Check" size={20} className="text-[var(--gemba-success)]" />
</div>
```
This mirrors the home page's feature-icon-tile recipe (`src/app/page.tsx` lines 62-64: `size-10 rounded-[var(--radius-md)] bg-[var(--surface-subdued)]` + `Icon` inside) but swaps the neutral subdued fill for the success-subdued token — same shape/sizing convention, different signal color.

**Form controls (password/limit/expiry, D-02 minimal-new-surface):**
`Input` (`src/components/ui/input.tsx` lines 5-19) and `Switch` (`src/components/ui/switch.tsx` lines 8-33) are **already reskinned to Gemba tokens** — no JSX change needed for the existing `<Input>`/`<Switch>` usages in `upload/page.tsx` (lines 543-549, 533-537, 561-568, 576-583); they inherit the 40px height / `--radius-sm` / `--ring-border`+`--shadow-field` / `--ring-focus` automatically through the shared component. Only the **native `<select>`** (lines 584-595) needs manual reskin to match sibling `Input` styling — copy the Input's token recipe directly since no shadcn `Select` exists yet (D-02):
```tsx
<select
  aria-label="Expiry unit"
  value={expiryUnit}
  onChange={(e) => setExpiryUnit(e.target.value as ExpiryUnit)}
  className="h-10 rounded-[var(--radius-sm)] bg-[var(--surface-card)] px-4 text-base shadow-[var(--ring-border),var(--shadow-field)] outline-none transition-[color,box-shadow] focus-visible:shadow-[var(--ring-focus)] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
>
  <option value="hours">Hours</option>
  <option value="days">Days</option>
  <option value="months">Months</option>
</select>
```
This is the Input component's exact className (`src/components/ui/input.tsx` lines 11-14) minus the `file:*`/`selection:*` utilities that don't apply to `<select>`.

**Label reskin (Claude's Discretion):** `Label` usages carry `text-muted-foreground` on helper icons (e.g. line 526 `<Lock className="h-4 w-4 text-muted-foreground" />` inside the Label). Since `text-muted-foreground` resolves through the Gemba `@theme` remap already (per Phase 1 D-01 token wiring), it is safe to leave as-is; optionally move to `text-[var(--text-subdued)]` for consistency with the Chip/success token style used elsewhere on this page — either is acceptable per Claude's Discretion note.

---

### `src/components/file-dropzone.tsx` (component, event-driven)

**Analog for card-recipe/ring styling:** `src/components/ui/card.tsx` (lines 5-16, inset-ring recipe)
**Analog for token/Icon usage:** `src/app/page.tsx` (Icon usage, feature-tile recipe)
**Analog for button:** `src/components/ui/button.tsx`

**Imports pattern** — replace `lucide-react` with Icon wrapper:
```tsx
import { Icon } from "@/components/icon";
```
Drop `import { CloudUpload, File, X } from "lucide-react";` (line 4).

**Dropzone border pattern (D-03 — dashed idle, accent+tint active):**
Current (lines 118-123):
```tsx
className={cn(
  "relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors",
  isDragging
    ? "border-primary bg-primary/5"
    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
)}
```
Replace with Gemba border/accent tokens per D-03 (idle = dashed `--border-default`; active = `--gemba-accent` border + `--gemba-accent-subdued` fill):
```tsx
className={cn(
  "relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-[var(--radius-lg)] border-2 border-dashed p-8 text-center transition-colors",
  isDragging
    ? "border-[var(--gemba-accent)] bg-[var(--gemba-accent-subdued)]"
    : "border-[var(--border-default)] hover:border-[var(--gemba-accent)]/50"
)}
```
Note: `--gemba-accent-subdued` is already the canonical 8%-tint token (`src/app/globals.css` line 124, `rgba(91,156,255,0.16)` in dark — light-mode equivalent is the un-lightened accent at 8%, defined earlier in the same token block) — do not invent a new opacity utility like `bg-primary/5`.

**Selected-file rows (D-03 — inset-ring Card-recipe styling):**
Current (lines 149-171):
```tsx
<div className="flex items-center gap-3 rounded-lg border bg-card p-3">
  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
    <File className="h-4 w-4 text-muted-foreground" />
  </div>
  ...
  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeFile(index)}>
    <X className="h-4 w-4" />
  </Button>
</div>
```
Replace with the Card recipe's shadow token (`--ring-border` + `--surface-card`) instead of a CSS `border` class, per UI-SPEC Card recipe guardrail ("do not use Tailwind `border` utilities on redesigned card surfaces"):
```tsx
<div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--surface-card)] p-3 shadow-[var(--ring-border)]">
  <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--surface-subdued)]">
    <Icon name="File01" size={16} className="text-[var(--icon-subdued)]" />
  </div>
  <div className="min-w-0 flex-1">
    <p className="gemba-body-strong truncate">{file.name}</p>
    <p className="gemba-body-sm text-[var(--text-subdued)]">{formatSize(file.size)}</p>
  </div>
  <Button
    variant="ghost"
    size="icon-sm"
    className="shrink-0"
    aria-label={`Remove ${file.name}`}
    onClick={() => removeFile(index)}
  >
    <Icon name="XClose" size={16} />
  </Button>
</div>
```
`size="icon-sm"` maps to the existing 32px square icon-button size (`src/components/ui/button.tsx` line 32, `size-8 rounded-[var(--radius-sm)]`) — replaces the current manual `h-8 w-8` override. **`aria-label` is mandatory** here per UI-SPEC accessibility rule (icon-only square button).

**Dropzone glyph + copy (idle/active state icon, lines 131-143):**
```tsx
<Icon
  aria-hidden="true"
  name="UploadCloud01"
  size={40}
  className={cn(
    "pointer-events-none mb-4",
    isDragging ? "text-[var(--gemba-accent)]" : "text-[var(--icon-subdued)]"
  )}
/>
<p className="gemba-body-strong pointer-events-none">
  {isDragging ? "Drop files here" : "Drag & drop files here"}
</p>
<p className="gemba-body-sm pointer-events-none mt-1 text-[var(--text-subdued)]">
  or click to browse &middot; Max {maxSizeMb >= 1024 ? `${maxSizeMb / 1024} GB` : `${maxSizeMb} MB`} per file
</p>
```

---

## Shared Patterns

### Icon wrapper (replaces all lucide-react on this page)
**Source:** `src/components/icon.tsx` (lines 11-26) + `src/components/icon-data.js` (glyph registry, verified names above)
**Apply to:** Both `upload/page.tsx` and `file-dropzone.tsx` — every icon usage
```tsx
<Icon name="Upload01" size={20} />
```
Zero `lucide-react` imports may remain on either file after redesign (Phase 1 D-06/D-07, inherited).

### Button ranks + square variant
**Source:** `src/components/ui/button.tsx` (cva table, lines 7-41)
**Apply to:** Both files — map old `variant="outline"`/`size="icon"` to `secondary`/`icon` or `icon-sm`, add `aria-label` to every icon-only instance (mandatory, no exceptions).

### Card inset-ring recipe (no CSS `border`)
**Source:** `src/components/ui/card.tsx` (lines 5-16, `shadow-[var(--ring-border),var(--shadow-card)]`)
**Apply to:** `upload/page.tsx` page-level `Card` usages (already correct via the shared component — no change needed) and `file-dropzone.tsx` selected-file rows (needs manual token swap since rows are raw `div`s, not the `Card` component).

### Chip (replaces Badge)
**Source:** `src/components/chip.tsx` (lines 36-61), usage precedent `src/app/page.tsx` line 53
**Apply to:** `upload/page.tsx` result-state summary pills only.

### Success signal tokens
**Source:** `src/app/globals.css` (`--gemba-success` / `--gemba-success-subdued`, light block + `.dark` block lines 118-129)
**Apply to:** `upload/page.tsx` "done" state check-circle (D-04).

### Gemba type scale
**Source:** UI-SPEC Typography table (`.gemba-h2`/`h3`/`h4`, `.gemba-body`, `.gemba-body-strong`, `.gemba-body-sm`, `.gemba-chip-label`)
**Apply to:** Both files — replace raw `text-3xl font-bold`, `text-lg`, `text-sm font-medium`, `text-xs text-muted-foreground` with the matching Gemba class.

## No Analog Found

None — both files have a direct Phase 1 token/component analog for every element being redesigned (Card, Button, Chip, Icon, Input, Switch all already exist and are already Gemba-tokenized). The only net-new pattern is the manually-reskinned native `<select>` (D-02, deferred from a full Select component) — its pattern is derived directly from `Input`'s existing className, not invented.

## Metadata

**Analog search scope:** `src/app/`, `src/components/`, `src/components/ui/`
**Files read:** `src/app/upload/page.tsx`, `src/components/file-dropzone.tsx`, `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/chip.tsx`, `src/components/icon.tsx`, `src/components/icon-data.js` (grep only, targeted glyph lookups), `src/components/ui/input.tsx`, `src/components/ui/switch.tsx`, `src/app/page.tsx`, `src/app/globals.css` (lines 100-139)
**Pattern extraction date:** 2026-07-10
