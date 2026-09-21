# Phase 3: Download Page Redesign & Dark Mode Complete - Context

**Gathered:** 2026-07-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Two deliverables:

1. **Reskin the download page** (`src/app/download/page.tsx`, ~438 lines) to the
   Gemba design system established in Phase 1 and applied to the upload page in
   Phase 2. Surfaces in scope: the `input` state (share-link field + fetch
   button), the `preview` state (file-details card, metadata chips, secure
   reassurance, optional password field, Cancel / Download actions), the
   `downloading` state (spinner + progress), the `done` state (calm completion),
   and the failure paths (invalid link, file-not-found, expired/exhausted,
   wrong password, truncated download). Reuses the Phase 1 shared component layer.

2. **Complete app-wide theming (DARK-02).** With all three pages (home, upload,
   download) now redesigned, verify that **every page and every shared component**
   renders correctly under **light, dark, and system** themes via `next-themes` —
   no unstyled or mis-themed element remains anywhere in the app.

**Locked by ROADMAP success criterion 4 (do NOT change):** existing download
functionality — metadata fetch (`/api/files/{id}/meta`), password validation
(`x-password` header → presigned URL), streaming download from the Blob CDN,
client-side AES-GCM decryption (`decryptPacked` / `importKeyBase64`), and the
final file save — must keep working exactly as today. This is a **visual/token
redesign only**; the encryption boundary (the AES key lives only in the URL
fragment `#<key>`, is read client-side, and never reaches the server) is
untouched. Server API routes and `src/lib/crypto.ts` are out of scope for change.

This is a per-page application of Phase 1's system plus a cross-app theme
verification pass — not a re-litigation of the design system itself. Phase 1's
and Phase 2's decisions are inherited wholesale (see Canonical References).
</domain>

<decisions>
## Implementation Decisions

### Error & edge-state treatment
- **D-01:** **Inline Gemba states, not toast-only.** Terminal / non-recoverable
  failures — invalid link, file-not-found (404), expired-or-exhausted (410) —
  render as a **dedicated Gemba state card** inside the page (Icon glyph +
  headline + short explanation + a primary "Try another link" action that resets
  to the `input` state), using the Phase 1 inset-ring Card recipe. **Wrong
  password** (401/403) shows an **inline error under the password field**
  (Gemba error/destructive tokens on the field + a short message) and keeps the
  user on the `preview` state so they can retry immediately. Reserve ephemeral
  `sonner` toasts for **transient / network** blips only (fetch network error,
  presigned-URL-expired retry hint, truncated-download retry). The current
  behavior — every failure is a disappearing toast — is replaced.

### Theme control (system)
- **D-02:** **Make the theme control 3-way: light / dark / system.** Replace the
  current 2-way `ThemeToggle` (which flips `resolvedTheme` between light and dark
  and thereby *pins* an explicit theme, losing "follow system") with a control
  that lets the user select **light, dark, or system** and re-select "follow
  system" at any time. This directly satisfies success criterion 3's "system"
  requirement. Exact control affordance (cycling icon-button vs. small
  segmented/menu control) is planner/UI-SPEC discretion, but all three states
  must be reachable and the choice must persist via `next-themes`.

### File-details / metadata presentation (preview state)
- **D-03:** **Phase-2 carry-forward + a dedicated "secure" reassurance row.**
  Base treatment is the upload-page pattern: file-details as an **inset-ring row**
  (file glyph via the Icon wrapper + filename + size · type), and the four current
  `Badge`s migrated to **Chips** (downloads-left, expires-in, password-required as
  neutral/accent signal; the encryption reassurance as a success-signal element).
  **Additionally**, because the download preview is the recipient's trust moment,
  render a **dedicated secure row** inside the preview card: a Lock/ShieldCheck
  glyph + one trust line — e.g. *"End-to-end encrypted — decrypted in your
  browser; the key never reaches our server."* — on a calm `--gemba-success` /
  `success-subdued` tint (low-chroma, on-brand; NOT a loud green block). This is
  reassurance copy about the existing E2E model, not new behavior.

### Dark-mode completeness verification (DARK-02)
- **D-04:** **Explicit trouble-spot checklist + blocking human sign-off.** The
  phase's verification gate runs an explicit checklist of known theme trouble
  spots across **light / dark / system on every page** (home, upload, download),
  covering at minimum: `sonner` toasts, the native `<select>` (expiry unit on
  upload), the **Public Sans webfont** (the known Turbopack/Lightning-CSS
  production drop — see Deferred/known-issue note), focus rings, the app shell
  (`app-shell.tsx`) + mobile tab bar (`mobile-tab-bar.tsx`), and scrollbars —
  then requires a **blocking human visual sign-off** (same gate style as Phase 2's
  02-03). Rigorous and repeatable; a bare visual sweep is not sufficient.

### Claude's Discretion
Downstream (researcher / planner / executor) owns these — all governed by the
Phase 1 UI-SPEC, Phase 2 patterns, and the design-fidelity constraint; no user
input needed:
- **Icon migration:** replace all 7 `lucide-react` icons on the download page
  (`Check`, `Download`, `File`, `Loader2`, `Lock`, `ShieldCheck`, `Timer`) with
  the closest Untitled UI glyphs via the `Icon` wrapper; confirm each chosen glyph
  name exists in `src/components/icon-data.js` (e.g. `Loader2` → the established
  spinner glyph/pattern).
- **Badge → Chip** migration (neutral / accent / success variants as appropriate).
- **Progress + spinner** reskin to Gemba tokens (matching the upload page's
  reskinned `Progress`).
- **Button rank mapping:** map `variant="outline"` (Cancel) and the primary
  Download / Fetch buttons to the Phase 1 Gemba ranks; full-width primary CTA
  pattern as on upload.
- **Typography/color cleanups:** `text-3xl font-bold` header → Gemba type scale
  (`.gemba-h2`/`h3`); `bg-muted/30`, `bg-primary/10`, `text-primary`,
  `bg-green-100`/`text-green-600` success colors → Gemba surface/accent/success
  tokens. `text-muted-foreground` may stay (resolves through the Phase 1 `@theme`
  remap) or move to `--text-subdued`.
- **Card recipe** (inset-ring) for all card surfaces; `Separator` reskin/removal.
- Exact **3-way theme control affordance** (D-02) and the exact **state-card
  copy/glyphs** for each terminal error (D-01).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design contract (inherited from Phase 1 — authoritative)
- `.planning/phases/01-design-foundation-home-page/01-UI-SPEC.md` — the Gemba
  visual/interaction contract: token tables, Button ranks (COMP-01), Card recipe
  (COMP-05), Chip (COMP-03), form controls (COMP-02), Icon wrapper (COMP-04),
  dark-mode rules, Registry Safety.
- `.planning/phases/01-design-foundation-home-page/01-CONTEXT.md` — Phase 1 locked
  decisions (D-01…D-10): token wiring, Icon wrapper (no lucide/emoji), dark-mode
  near-black + lightened signals. All inherited.

### Phase 2 patterns to carry forward (the direct precedent for this page)
- `.planning/phases/02-upload-page-redesign/02-CONTEXT.md` — D-01…D-04: calm
  non-celebratory success (D-04), Chips-replace-Badges, inset-ring rows, minimal
  native-control reskin. The download page mirrors these.
- `.planning/phases/02-upload-page-redesign/02-PATTERNS.md` — concrete
  icon/button/chip/success recipes mapping surfaces to Phase 1 analogs.
- `.planning/phases/02-upload-page-redesign/02-01-SUMMARY.md` and `02-02-SUMMARY.md`
  — what the upload reskin actually produced (reuse its conventions verbatim).

### Design system tokens (source of truth — do not invent values)
- `design-system/tokens/*.css` (colors, typography, spacing, fonts) — the only
  permitted source of color/type/spacing/radii/shadow values.
- `design-system/APPLY-GUIDE.md` and `design-system/DESIGN-SYSTEM.md` — application
  guardrails and voice/tone (relevant to the D-03 secure-reassurance copy).

### Project constraints
- `.planning/PROJECT.md` — design-fidelity constraint ("only design-system tokens,
  do not invent"), reuse-first, and the **encryption-boundary** constraint that
  success criterion 4 protects.

### Phase 3 requirements
- `.planning/REQUIREMENTS.md` — **PAGE-03** (download page redesigned to Gemba)
  and **DARK-02** (all pages/components correct in light, dark, and system).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (from Phases 1–2)
- `src/components/ui/{button,card,input,label,progress}.tsx` — Gemba-reskinned
  primitives already used by the upload page.
- `src/components/chip.tsx` — Chip (COMP-03); replaces the download page's four `Badge`s.
- `src/components/icon.tsx` + `icon-data.js` — Icon wrapper (COMP-04); all icons go through it.
- `src/components/theme-toggle.tsx` — the current **2-way** toggle to be replaced
  with the D-02 3-way control (uses `next-themes` `useTheme`).
- `src/components/theme-provider.tsx` — `next-themes` provider (system support
  lives here / in its config).
- `src/app/globals.css` — Gemba `@theme` + `.dark` token layer wired app-wide.

### Established Patterns
- No `lucide-react` and no emoji on redesigned surfaces (Phase 1 D-06/D-07).
- Gemba tokens only; Card = inset-ring (no CSS `border`); icon-only controls carry `aria-label`.
- Calm, low-chroma success (Phase 2 D-04) — no large green blocks.
- Pages render inside the top-nav app shell (`src/components/app-shell.tsx`) with
  a mobile bottom tab bar (`src/components/mobile-tab-bar.tsx`) — both are in the
  DARK-02 verification scope.

### Integration Points
- `src/app/download/page.tsx` — the page being redesigned (state machine:
  `input → preview → downloading → done`, plus error paths).
- `src/lib/crypto.ts` (`decryptPacked`, `importKeyBase64`), `/api/files/{id}`,
  `/api/files/{id}/meta`, `@vercel/blob` CDN — the download/decryption pipeline
  that MUST remain functionally unchanged (success criterion 4).

### Known issue to close under DARK-02
- **Public Sans webfont** is dropped by Turbopack/Lightning-CSS in **production**
  builds (flagged in Phase 1/2). D-04's checklist explicitly includes verifying
  the font renders in the deployed (Vercel) build across themes — this phase is a
  reasonable place to fix it since it already requires a full theme sweep.

</code_context>

<specifics>
## Specific Ideas

- The through-line remains **reuse-first, low-chroma restraint** — the download
  page should feel like a sibling of the redesigned upload page, not a new design.
- The one deliberate addition beyond pure carry-forward is the **dedicated secure
  reassurance row** (D-03): the recipient is often a non-user who just received a
  link, so an explicit, calm "end-to-end encrypted, decrypted in your browser"
  statement is worth a distinct on-brand surface (success-subdued tint, not loud).
- Errors should feel **handled, not thrown** (D-01): a recipient hitting an
  expired link should get a composed Gemba state card, not a vanishing toast.

</specifics>

<deferred>
## Deferred Ideas

- A reusable **3-way theme switcher** as a shared design-system component (beyond
  this app's local `ThemeToggle`) — out of scope; implement locally for this app.
- Security headers, rate limiting, the download-counter race fix, and unit tests —
  **Phase 4** (Security, Reliability & Test Hardening); explicitly not this phase.
- Richer download-preview features (thumbnail/preview of the file, QR for the
  link) — new capabilities; future milestone if ever.

None of the discussion introduced new capabilities — it stayed within the
reskin + theme-completeness boundary. Download/decryption behavior is explicitly
out of scope for change (locked by success criterion 4).

</deferred>

---

*Phase: 03-download-page-redesign-dark-mode-complete*
*Context gathered: 2026-07-10*
