---
phase: 03
slug: download-page-redesign-dark-mode-complete
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-11
---

# Phase 03 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register origin: plan-time (authored in `03-01-PLAN.md`…`03-04-PLAN.md` `<threat_model>` blocks). Verified against implemented code by `/gsd-secure-phase`.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Client → rendered UI | Download-page states, error cards, chips, secure row, password field render in the browser | Filename/size metadata (non-secret); the AES key (`keyBase64`) must NEVER cross into rendered text/attributes |
| Client → server (`/meta`, `/files`) | `fetch` calls carry `id` and the `x-password` header only | File id; password (for server-side hash verification only) — never the decryption key |
| Client → third-party font CDN | Static `<link>` to Google Fonts | None sensitive — page-load signal only |
| Browser localStorage (`next-themes`) | Theme preference persisted client-side | Non-sensitive enum: `light`/`dark`/`system` |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation / Evidence | Status |
|-----------|----------|-----------|-------------|-----------------------|--------|
| T-03-01 | Information Disclosure | error copy + D-01 error cards (`download/page.tsx`) | mitigate | Terminal error cards (lines ~499-575) + inline password error use only static locked copy; `keyBase64` used only programmatically (state / `importKeyBase64` arg), `auth.url` only as a `fetch()` target — never interpolated into a toast, headline, body, or DOM attribute. Corroborated by `03-REVIEW.md` ("Encryption boundary: verified clean"). | closed |
| T-03-02 | Tampering | AES-GCM decrypt path (`src/lib/crypto.ts`) | mitigate | `git diff acd19b81^..HEAD -- src/lib/crypto.ts` is **empty** — zero crypto changes in Phase 3. `decryptPacked`/`importKeyBase64` call sites unchanged (`download/page.tsx:18,277-278`). Success criterion 4 upheld. | closed |
| T-03-03 | Information Disclosure | `aria-invalid` / inline password error | accept | Error ring driven solely by the `hasPasswordError` boolean; error string is static and never includes the password. `value={password}` is a standard controlled-input echo to the user's own field. | closed |
| T-03-04 | Tampering | `dropdown-menu.tsx` + `theme-toggle.tsx` reskin | mitigate | Dropdown changes are className-token-only; radix primitives/portal/animation untouched. Post-review `theme-toggle.tsx` (`902627a`) composes pre-existing `DropdownMenuRadioGroup`/`RadioItem` primitives — no new sink. No `dangerouslySetInnerHTML`/`eval` in any changed file. | closed |
| T-03-05 | Information Disclosure | theme persistence (`next-themes` localStorage) | accept | Only `setTheme("light"\|"dark"\|"system")` called; persistence delegated to `next-themes`. Persisted value is a non-sensitive enum; no PII/key. | closed |
| T-03-06 | Information Disclosure | remote font `<link>` (`layout.tsx`) | accept | Static Google Fonts URLs with fixed `family=…&display=swap`; no user data/session/key in the request. Same origin the app already targeted via the prior CSS `@import`. | closed |
| T-03-07 | Tampering (future CSP) | third-party font CDN vs Phase 4 CSP | transfer | **Carried forward — see Transfer Log.** Phase 4 CSP (SEC-01) MUST allowlist `fonts.googleapis.com` (`style-src`) + `fonts.gstatic.com` (`font-src`) or the Public Sans production fix breaks silently. No integrity risk now. | closed (transferred) |
| T-03-08 | Information Disclosure | rendered download-page states | mitigate | Full-file inspection: no rendered JSX text/attribute contains `keyBase64`, `url.hash`, or the presigned `auth.url` in any of the 7 states. Human sign-off (`03-04-SUMMARY.md`) confirmed no key/URL-fragment visible across all three themes on commit `f8416e4`. Corroborated by `03-REVIEW.md`. | closed |
| T-03-09 | Repudiation | DARK-02 sign-off record | mitigate | `03-04-SUMMARY.md` records approver (`legoshin`/`lego@ge.mba`), reviewed preview deployment ID + commit SHA (`f8416e4`), and the 8/8 checklist outcome — auditable close. | closed |
| T-03-SC | Tampering (supply chain) | npm installs / shadcn registries | accept | `git diff` on `package.json`/`components.json`/`package-lock.json` across the full Phase 3 range is **empty** — zero dependency/registry changes. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

### Note on code-review hardening
`03-REVIEW.md`'s WR-01/WR-02 (unguarded `/meta` JSON parse, missing response type guard) were input-validation hardening — not new attack surface against a declared threat. Both were fixed pre-audit (`03-REVIEW-FIX.md`; commits `df67425`, `99a5700`) and are reflected in the current `isMetaPayload()` guard (`download/page.tsx`).

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-01 | T-03-03 | Password bound to controlled `<Input value={password}>` — standard echo to the user's own field; only ever sent as the `x-password` header for server-side hash verification | legoshin | 2026-07-11 |
| AR-03-02 | T-03-05 | Theme preference persisted via `next-themes` — non-sensitive 3-value enum, no PII/key | legoshin | 2026-07-11 |
| AR-03-03 | T-03-06 | Static GET to Google Fonts on page load — no dynamic/user-supplied params; reveals only page-load, same as the `@import` it replaces | legoshin | 2026-07-11 |
| AR-03-04 | T-03-SC | No new npm packages / shadcn registries in Phase 3 — verified via empty `git diff` | legoshin | 2026-07-11 |

*Accepted risks do not resurface in future audit runs.*

---

## Transfer / Carry-Forward Log

| ID | Obligation | Owner / Target Phase | Status |
|----|-----------|----------------------|--------|
| T-03-07 | Phase 4 CSP (SEC-01) must allowlist `fonts.googleapis.com` (`style-src`) and `fonts.gstatic.com` (`font-src`) before shipping a CSP header, or the Public Sans production font fix (`src/app/layout.tsx`) breaks silently | Phase 4 — Security, Reliability & Test Hardening (SEC-01) | **OPEN — pending Phase 4.** Recorded here as the durable carry-forward (no other tracking artifact captured it). |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-11 | 10 | 10 | 0 | Claude (gsd-security-auditor) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-11
