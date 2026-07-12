# Phase 3: Download Page Redesign & Dark Mode Complete - Pattern Map

**Mapped:** 2026-07-11
**Files analyzed:** 3 (2 modified in place, 1 reskinned-in-place primitive; no net-new files)
**Analogs found:** 3 / 3 (all exact — Phase 1/2 shipped components/pages)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|----------------|
| `src/app/download/page.tsx` | component (page) | request-response (client-side fetch + streaming decrypt, unchanged) | `src/app/upload/page.tsx` (Phase 2 reskin) | exact — same state-machine-page shape, same token/Icon/Chip/Card migration |
| `src/components/theme-toggle.tsx` | component | event-driven (UI selection → `next-themes` persistence) | itself (2-way → 3-way, same file) + `src/components/ui/dropdown-menu.tsx` (menu primitive, first Gemba use) | role-match — no prior 3-way menu control exists; composition of two existing analogs |
| `src/components/ui/dropdown-menu.tsx` | component (shadcn primitive) | request-response (render popover) | `src/components/ui/card.tsx` (inset-ring/shadow-token recipe) + `src/components/ui/input.tsx`-style token substitution used in Phase 2 for the native `<select>` | role-match — first Gemba reskin of this primitive, token recipe borrowed from Card/Input conventions |

No files are being created — all three are in-place visual/token redesigns or first-time reskins of an existing shadcn primitive. Business logic (`fetchFileInfo`, `handleDownload`, `handleReset`, state machine, crypto calls) is **out of scope** and must be preserved; only JSX/className/import changes and the D-01 state-representation addition apply.

## Pattern Assignments

### `src/app/download/page.tsx` (component, request-response)

**Primary analog:** `src/app/upload/page.tsx` (Phase 2 reskin — same lucide→Icon, Badge→Chip, inset-ring row, calm-success recipes)
**Secondary analogs:** `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/chip.tsx`, `src/components/icon.tsx`

**Current imports to replace** (`src/app/download/page.tsx` lines 1-27):
```tsx
import {
  Check,
  Download,
  File,
  Loader2,
  Lock,
  ShieldCheck,
  Timer,
} from "lucide-react";
...
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
```
Replace with (matching `upload/page.tsx`'s post-reskin import block):
```tsx
import { Icon } from "@/components/icon";
import { Chip } from "@/components/chip";
```
Keep `Button`, `Card`/`CardContent`/`CardDescription`/`CardHeader`/`CardTitle`, `Input`, `Label`, `Progress`, `toast`, `decryptPacked`/`importKeyBase64` — all unchanged (encryption boundary untouched). `Separator` import is dropped per UI-SPEC's discretion call (remove, not reskin) unless Claude opts to keep it as a hairline — if kept, reskin per Phase 1 pattern, not covered here since UI-SPEC recommends removal.

**Icon migration map** (locked in UI-SPEC §6, verified against `icon-data.js`):

| lucide-react (current, line) | Icon wrapper `name` | Notes |
|---|---|---|
| `Check` (line 5, 421) | `"Check"` | matches upload page's done-state icon exactly |
| `Download` (line 6, 311, 342, 389) | `"Download01"` | matches home/upload usage |
| `File` (line 7, 330) | `"File01"` | matches Phase 2 file-row icon |
| `Loader2` (line 8, 400) | `"Loading03"` + `animate-spin` (fallback `"Loading01"` if glyph reads wrong when spun) | new to codebase — no prior spinner analog to copy verbatim |
| `Lock` (line 9, 351) | `"Lock01"` | matches Phase 2 password-chip icon |
| `ShieldCheck` (line 10, 356) | `"ShieldTick"` | `ShieldCheck` glyph does not exist in `icon-data.js` |
| `Timer` (line 11, 346) | `"Clock"` | matches Phase 2 expiry-chip icon choice |

Usage pattern (from `upload/page.tsx`, mirrors `src/app/page.tsx` lines 41/47/63):
```tsx
<Icon name="Download01" size={16} />
```

**Card recipe (COMP-05)** — no change needed to `Card`/`CardHeader`/`CardContent`/`CardTitle` themselves (`src/components/ui/card.tsx` line 10: `shadow-[var(--ring-border),var(--shadow-card)]`, no CSS `border`). Only the page's own `className="text-lg"` on `CardTitle` (download/page.tsx lines 290, 322) becomes `className="gemba-h4"`, matching `upload/page.tsx`'s identical migration (02-PATTERNS.md lines 58-59).

**Header typography** (download/page.tsx line 281):
```tsx
<h1 className="text-3xl font-bold tracking-tight">Download File</h1>
```
becomes (matches `upload/page.tsx`'s exact migration, 02-PATTERNS.md lines 62-69):
```tsx
<h1 className="gemba-h2">Download File</h1>
```

**File-details inset-ring row** (download/page.tsx lines 328-338, current):
```tsx
<div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-4">
  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
    <File className="h-6 w-6 text-primary" />
  </div>
  <div className="min-w-0 flex-1">
    <p className="truncate font-medium">{fileInfo.name}</p>
    <p className="text-sm text-muted-foreground">
      {fileInfo.size} &middot; {fileInfo.type}
    </p>
  </div>
</div>
```
Replace using the exact Phase 2 file-row recipe (`02-PATTERNS.md` lines 183-190, `file-dropzone.tsx` selected-file row — same shape, neutral icon tile since this is just a filetype glyph, not a signal):
```tsx
<div className="flex items-center gap-4 rounded-[var(--radius-md)] bg-[var(--surface-card)] p-4 shadow-[var(--ring-border)]">
  <div className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-subdued)]">
    <Icon name="File01" size={24} className="text-[var(--icon-subdued)]" />
  </div>
  <div className="min-w-0 flex-1">
    <p className="gemba-body-strong truncate">{fileInfo.name}</p>
    <p className="gemba-body-sm text-[var(--text-subdued)]">
      {fileInfo.size} &middot; {fileInfo.type}
    </p>
  </div>
</div>
```

**Badge → Chip migration** (download/page.tsx lines 340-359, current 4 `Badge`s):
```tsx
<Badge variant="secondary" className="gap-1">
  <Download className="h-3 w-3" />
  {fileInfo.downloadsRemaining} downloads left
</Badge>
...
<Badge variant="outline" className="gap-1">
  <ShieldCheck className="h-3 w-3" />
  E2E Encrypted
</Badge>
```
Replace using the exact Chip API (`src/components/chip.tsx` lines 36-61) and the Phase 2 Chip usage precedent (`02-PATTERNS.md` lines 84-96 — ALL-CAPS labels, `icon` prop at `size={16}`):
```tsx
<div className="flex flex-wrap gap-2">
  <Chip variant="neutral" icon={<Icon name="Download01" size={16} />}>
    {fileInfo.downloadsRemaining} DOWNLOADS LEFT
  </Chip>
  <Chip variant="neutral" icon={<Icon name="Clock" size={16} />}>
    EXPIRES IN {fileInfo.expiresIn.toUpperCase()}
  </Chip>
  {fileInfo.passwordProtected && (
    <Chip variant="neutral" icon={<Icon name="Lock01" size={16} />}>
      PASSWORD REQUIRED
    </Chip>
  )}
  <Chip variant="success" icon={<Icon name="ShieldTick" size={16} />}>
    E2E ENCRYPTED
  </Chip>
</div>
```
Note the fourth chip uses `variant="success"` (not `neutral`), per UI-SPEC's explicit signal mapping — this is the one deviation from the otherwise-uniform neutral set, matching the Chip cva table's `success` variant (`chip.tsx` lines 15-16: `bg-[var(--gemba-success-subdued)] text-[var(--gemba-success)]`).

**Secure reassurance row (D-03, net-new element, UI-SPEC §5 — copy this verbatim):**
```tsx
<div className="flex items-start gap-3 rounded-[var(--radius-md)] bg-[var(--gemba-success-subdued)] p-4">
  <Icon name="ShieldTick" size={20} className="mt-0.5 shrink-0 text-[var(--gemba-success)]" />
  <p className="gemba-body-sm text-[var(--text-primary)]">
    End-to-end encrypted — decrypted in your browser; the key never reaches our server.
  </p>
</div>
```
Placed inside the File Details `CardContent`, below the Chips row and above the optional password field.

**Button rank mapping** (matches Phase 2's outline→secondary mapping exactly, `02-PATTERNS.md` lines 74-79):

| Current (download/page.tsx) | Replace with |
|---|---|
| `<Button variant="outline" className="flex-1" onClick={handleReset}>` (Cancel, line 382-387) | `<Button variant="secondary" className="flex-1">` |
| `<Button variant="outline" onClick={handleReset}>` (Download Another File, done state, line 429) | `<Button variant="secondary">` |
| `<Button className="w-full gap-2" ...>` (Fetch File Info, line 306) | keep default (primary) rank, `w-full` — unchanged rank |
| `<Button className="flex-1 gap-2" onClick={handleDownload}>` (Download & Decrypt, line 388) | keep default (primary) rank |

**Downloading-state spinner** (download/page.tsx lines 396-414, current):
```tsx
<Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
```
becomes:
```tsx
<Icon name="Loading03" size={32} className="mx-auto animate-spin text-[var(--icon-primary)]" />
```
(fall back to `"Loading01"` if the multi-tick glyph reads wrong when spun — UI-SPEC explicit visual-verification note). `Progress` component itself needs **no change** (already resolves through the Gemba `@theme` remap, confirmed in UI-SPEC §6 migration table).

**Done-state calm success tile** (download/page.tsx lines 420-421, current):
```tsx
<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
  <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
</div>
```
Replace with the exact Phase 2 D-04 calm-success recipe (`02-PATTERNS.md` lines 100-113 — same tokens, same `size-10`/`--radius-md` shape, no large colored circle):
```tsx
<div className="mx-auto flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--gemba-success-subdued)]">
  <Icon name="Check" size={20} className="text-[var(--gemba-success)]" />
</div>
```

**New: D-01 terminal error state cards** (net-new pattern, no direct prior analog on this page — but structurally mirrors the existing "done" state's centered layout, per UI-SPEC §1):
```tsx
<Card>
  <CardContent className="py-12">
    <div className="mx-auto max-w-sm space-y-4 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-subdued)]">
        <Icon name="LinkBroken02" size={24} className="text-[var(--icon-subdued)]" />
      </div>
      <div>
        <h3 className="gemba-h4">Invalid share link</h3>
        <p className="gemba-body mt-1 text-[var(--text-subdued)]">
          This link doesn't look right — check that you copied the whole URL, including the part after the #.
        </p>
      </div>
      <Button className="w-full" onClick={handleReset}>
        Try another link
      </Button>
    </div>
  </CardContent>
</Card>
```
Three variants (invalid link / file-not-found / expired-exhausted) — icon + tile-tint + copy per UI-SPEC §1 table. These replace the current `toast.error(...)` calls in `fetchFileInfo` for 404/410/parse-failure cases (lines 83-108) with a state transition instead. Action button is **primary** rank (unlike the done-state's secondary reset) — see UI-SPEC §1 rationale.

**New: inline wrong-password field error** (replaces `toast.error("Incorrect password...")` in `handleDownload`, lines 259-266 catch block, for the 401/403 case specifically):
```tsx
<div className="space-y-2">
  <Label htmlFor="password">Password</Label>
  <Input
    id="password"
    type="password"
    aria-invalid={hasPasswordError}
    className={hasPasswordError ? "shadow-[inset_0_0_0_1px_var(--gemba-critical),var(--shadow-field)]" : undefined}
    value={password}
    onChange={(e) => { setPassword(e.target.value); setHasPasswordError(false); }}
    onKeyDown={(e) => e.key === "Enter" && handleDownload()}
  />
  {hasPasswordError && (
    <p className="gemba-body-sm flex items-center gap-1 text-[var(--gemba-critical)]">
      <Icon name="AlertCircle" size={16} />
      Incorrect password — try again.
    </p>
  )}
</div>
```
The critical-ring pattern is a direct token substitution on the existing `--ring-border` inset-shadow convention (`Input` component, `src/components/ui/input.tsx`) — not a new pattern, just `--gemba-critical` swapped in for the default border token.

---

### `src/components/theme-toggle.tsx` (component, event-driven)

**Analog 1 (trigger button, unchanged):** itself — current file, lines 11-29 (Sun/Moon01 crossfade `Button` trigger stays exactly as-is per UI-SPEC §4)
**Analog 2 (menu composition):** `src/components/ui/dropdown-menu.tsx` (primitive) + Phase 1/2 Icon usage conventions

Current full file (`src/components/theme-toggle.tsx`, all 31 lines) uses `setTheme(resolvedTheme === "dark" ? "light" : "dark")` — a direct 2-way flip that loses "system". UI-SPEC §4 (verbatim target implementation):
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" aria-label="Change theme">
      {/* existing Sun / Moon01 crossfade icons, unchanged */}
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => setTheme("light")}>
      <Icon name="Sun" size={16} />
      <span className={theme === "light" ? "gemba-body-strong" : "gemba-body"}>Light</span>
      {theme === "light" && <Icon name="Check" size={16} className="ml-auto" />}
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setTheme("dark")}>
      <Icon name="Moon01" size={16} />
      <span className={theme === "dark" ? "gemba-body-strong" : "gemba-body"}>Dark</span>
      {theme === "dark" && <Icon name="Check" size={16} className="ml-auto" />}
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setTheme("system")}>
      <Icon name="Monitor01" size={16} />
      <span className={theme === "system" ? "gemba-body-strong" : "gemba-body"}>System</span>
      {theme === "system" && <Icon name="Check" size={16} className="ml-auto" />}
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```
Critical detail: use `theme` (selected preference) from `useTheme()`, **not** `resolvedTheme` — `resolvedTheme` always resolves to `"light"`/`"dark"` and can never represent "system" as a distinguishable, re-selectable state. Add `import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";` and `import { Icon } from "@/components/icon";` (already imported). `Check`/`Sun`/`Moon01`/`Monitor01` glyphs all confirmed present in `icon-data.js` per UI-SPEC.

---

### `src/components/ui/dropdown-menu.tsx` (shadcn primitive, first Gemba reskin)

**Analog for popover shadow/token recipe:** `src/components/ui/card.tsx` line 10 (`shadow-[var(--ring-border),var(--shadow-card)]` pattern — same inset-ring convention, different shadow token for popovers)
**Analog for hover/active-state token:** app-shell active-nav-item convention (`--surface-subdued`, per UI-SPEC §4 mandate) — not yet read in full but explicitly named as the target in UI-SPEC; do not invent a new hover token
**Analog for icon replacement:** `Icon` wrapper conventions used throughout Phase 1/2

Current raw shadcn `DropdownMenuContent` (`dropdown-menu.tsx` lines 34-52):
```tsx
className={cn(
  "bg-popover text-popover-foreground ... z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] ... overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md",
  className
)}
```
UI-SPEC §4 mandates replacing the raw `border`/`shadow-md`/`bg-popover` classes with the Gemba popover recipe (this is the exact instruction from UI-SPEC, apply verbatim at the call-site via `className` prop passed from `theme-toggle.tsx`, OR edit the base component directly since this is its first real use):
```tsx
className={cn(
  "bg-[var(--surface-card)] shadow-[var(--ring-border),var(--shadow-popover)] rounded-[var(--radius-sm)] ...",
  className
)}
```
Current `DropdownMenuItem` (lines 62-83) imports `CheckIcon`, `ChevronRightIcon`, `CircleIcon` from `lucide-react` (line 4) and uses `focus:bg-accent focus:text-accent-foreground` — UI-SPEC §4 mandates dropping the lucide imports (replaced by explicit `<Icon name="Check" .../>` usage at the call-site in `theme-toggle.tsx`, so the raw `CheckIcon` import in `DropdownMenuCheckboxItem`/`DropdownMenuRadioItem` can stay since those variants are unused by this feature) and swapping `focus:bg-accent` for `focus:bg-[var(--surface-subdued)]` on the plain `DropdownMenuItem` used by the 3-way menu specifically. Since `theme-toggle.tsx` uses plain `DropdownMenuItem` (not `CheckboxItem`/`RadioItem`), only that function needs the hover-token swap for this feature; the `lucide-react` import at line 4 is used by `CheckIcon`/`ChevronRightIcon`/`CircleIcon` in the *other* menu-item variants (Checkbox/Radio/SubTrigger) which remain out of scope — do not remove the import if those variants stay unmodified, but if project convention is zero-lucide-anywhere, those three glyphs also need `Icon` wrapper equivalents (`"Check"`, `"ChevronRight"`, — confirm a filled-circle glyph exists for `CircleIcon`, e.g. `"Circle"` — verify against `icon-data.js` before use, not pre-verified here since Checkbox/Radio variants are unused this phase).

---

## Shared Patterns

### Icon wrapper (replaces all lucide-react)
**Source:** `src/components/icon.tsx` + `src/components/icon-data.js`
**Apply to:** `download/page.tsx` (all 7 icons), `theme-toggle.tsx` (adds `Check`/`Monitor01` to existing `Sun`/`Moon01`), `dropdown-menu.tsx` `DropdownMenuItem` (drops `CheckIcon` reliance for the plain-item variant used here)
```tsx
<Icon name="Download01" size={16} />
```

### Button ranks (outline → secondary)
**Source:** `src/components/ui/button.tsx` cva table; precedent `02-PATTERNS.md` lines 71-79
**Apply to:** `download/page.tsx` Cancel + Download Another File buttons; theme control keeps `variant="ghost" size="icon"` trigger unchanged, `aria-label="Change theme"` mandatory (icon-only button rule)

### Chip (replaces Badge)
**Source:** `src/components/chip.tsx` lines 36-61
**Apply to:** `download/page.tsx` — 4 chips (3 neutral, 1 success for E2E)

### Card inset-ring recipe (no CSS `border`)
**Source:** `src/components/ui/card.tsx` line 10
**Apply to:** `download/page.tsx` file-details row (manual token application, raw `div` not `Card` component); D-01 error state cards use the `Card` component itself (already correct)

### Calm success tokens (D-04 carry-forward)
**Source:** `src/app/globals.css` `--gemba-success` / `--gemba-success-subdued`; precedent `02-PATTERNS.md` lines 100-113
**Apply to:** `download/page.tsx` done-state tile, D-03 secure-reassurance row, E2E Chip

### Gemba type scale
**Source:** UI-SPEC Typography table; precedent `02-PATTERNS.md` lines 251-253
**Apply to:** `download/page.tsx` header (`.gemba-h2`), card titles (`.gemba-h4`), error-card headline/body (`.gemba-h4`/`.gemba-body`), captions (`.gemba-body-sm`)

### Popover token recipe (new this phase)
**Source:** `src/components/ui/card.tsx` shadow-token pattern, applied to `--shadow-popover` (pre-provisioned Phase 1 token)
**Apply to:** `dropdown-menu.tsx` `DropdownMenuContent`, first real use

## No Analog Found

| File/Surface | Role | Reason |
|---|---|---|
| D-01 terminal error state cards (3 variants) | component surface | No prior error-state-card pattern exists anywhere in the app (all prior errors were toast-only); UI-SPEC §1 provides the full concrete JSX contract directly — use that as the source of truth instead of a codebase analog |
| Inline wrong-password field error | component surface | No prior inline-field-error pattern exists; UI-SPEC §2 provides the concrete JSX contract, derived from the existing `--ring-border` inset-shadow convention |
| `Loading03`/`Loading01` spinner glyph | icon usage | No prior spinner usage exists anywhere in the app to copy from (current `Loader2` is the first and only spinner); UI-SPEC flags this as needing visual verification, not a copy-paste analog |

## Metadata

**Analog search scope:** `src/app/`, `src/components/`, `src/components/ui/`
**Files read:** `src/app/download/page.tsx` (full, 438 lines), `.planning/phases/02-upload-page-redesign/02-PATTERNS.md` (full), `src/components/theme-toggle.tsx` (full), `src/components/ui/dropdown-menu.tsx` (full), `src/components/chip.tsx` (full), `src/components/ui/card.tsx` (full)
**Pattern extraction date:** 2026-07-11
