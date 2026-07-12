# Codebase Structure

**Analysis Date:** 2026-07-10

## Directory Layout

```
gemba-filesend/
├── .agents/               # GSD agent configurations
├── .claude/              # Claude.md and project instructions
├── .codex/               # Code search index
├── .next/                # Next.js build output
├── .omc/                 # OpenMarkdown cache
├── .planning/            # Planning documents (this file)
│   └── codebase/        # Generated codebase maps
├── .vercel/              # Vercel deployment config
├── android/              # Android TWA wrapper (PWA to app)
├── design-system/        # Design tokens and theme files
├── node_modules/         # Dependencies
├── play-screenshots/     # Screenshots for Google Play Store
├── public/               # Static assets (icons, manifests, service worker)
│   ├── icon.svg
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── apple-touch-icon.png
│   ├── manifest.webmanifest
│   └── sw.js            # Service worker for PWA
├── screenshots/          # Marketing screenshots
├── scripts/              # Build scripts
├── src/                  # Application source code
│   ├── app/             # Next.js App Router pages and API routes
│   ├── components/      # React components
│   ├── lib/             # Utilities and abstractions
│   └── globals.css      # Global Tailwind CSS
├── .env.local            # Environment variables (local)
├── .gitignore
├── ANDROID.md           # Android TWA setup guide
├── CLAUDE.md            # Project instructions
├── README.md            # Project overview
├── components.json      # shadcn/ui config
├── eslint.config.mjs    # ESLint configuration
├── next.config.ts       # Next.js configuration
├── next-env.d.ts        # Next.js TypeScript definitions
├── package.json         # Dependencies and scripts
├── package-lock.json    # Locked versions
├── postcss.config.mjs   # PostCSS configuration
├── take-screenshots.mjs # Script to capture screenshots
├── tsconfig.json        # TypeScript configuration
└── vercel.json          # Vercel deployment settings
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router pages, layouts, and API routes
- Contains: Page components (`.tsx`), API route handlers (`.ts`)
- Key files: `page.tsx` (home), `upload/page.tsx`, `download/page.tsx`, `api/files/route.ts`

**`src/components/`:**
- Purpose: Reusable React components
- Contains: Feature components (file-dropzone, header, theme-provider) and shadcn UI components
- Key files: `file-dropzone.tsx`, `header.tsx`, `ui/` (button, card, input, etc.)

**`src/lib/`:**
- Purpose: Shared utilities and abstractions
- Contains: Cryptography, storage backends, type definitions
- Key files: `crypto.ts`, `blob-storage.ts`, `server-storage.ts`, `storage.ts`, `utils.ts`

**`public/`:**
- Purpose: Static assets served by Next.js
- Contains: Icons, PWA manifest, service worker
- Key files: `sw.js` (service worker), `manifest.webmanifest` (PWA metadata)

**`design-system/`:**
- Purpose: Design tokens and theme configuration
- Contains: Tailwind CSS configuration, color schemes
- Key files: Tailwind configuration files

**`android/`:**
- Purpose: Android Trusted Web Activity (TWA) wrapper for Google Play Store
- Contains: Android project files, signing configuration
- Key files: Build configuration for PWA-to-APK conversion

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: Home/landing page (features, how-it-works, CTAs)
- `src/app/upload/page.tsx`: File upload interface (client-side encrypted)
- `src/app/download/page.tsx`: File download interface (decryption on client)
- `src/app/layout.tsx`: Root layout (header, theme provider, service worker registration)

**Configuration:**
- `tsconfig.json`: TypeScript compiler options, path aliases (`@/*` → `src/*`)
- `next.config.ts`: Next.js configuration
- `.env.local`: Environment variables (BLOB_READ_WRITE_TOKEN for Vercel Blob)
- `components.json`: shadcn/ui component configuration

**Core Logic:**
- `src/lib/crypto.ts`: AES-128-GCM encryption/decryption, key generation, password hashing
- `src/lib/storage.ts`: Storage mode abstraction (type definitions)
- `src/lib/blob-storage.ts`: Vercel Blob API operations
- `src/lib/server-storage.ts`: Node.js filesystem operations

**API Routes:**
- `src/app/api/files/route.ts`: POST upload handler (blob or direct, dual-mode)
- `src/app/api/files/[id]/route.ts`: GET download handler (returns presigned URL or stream)
- `src/app/api/files/[id]/meta/route.ts`: GET file metadata (public info without key)
- `src/app/api/storage-mode/route.ts`: GET storage backend mode (blob or fs)

**Components:**
- `src/components/file-dropzone.tsx`: Drag-drop file input with size validation
- `src/components/header.tsx`: Navigation and theme toggle
- `src/components/theme-provider.tsx`: Dark mode provider (next-themes)
- `src/components/ui/`: shadcn/ui component library (button, card, input, etc.)

**Styling:**
- `src/app/globals.css`: Global Tailwind CSS, custom CSS variables
- `design-system/`: Theme tokens and Tailwind configuration

**Testing:**
- No tests currently implemented (structure for tests below)

## Naming Conventions

**Files:**
- Pages: `page.tsx` (Next.js App Router convention)
- API routes: `route.ts` (Next.js App Router convention)
- Components: PascalCase (e.g., `FileDropzone.tsx`, `Header.tsx`)
- Utilities: camelCase (e.g., `crypto.ts`, `blob-storage.ts`)

**Directories:**
- Feature directories: lowercase with hyphens (e.g., `file-dropzone.tsx`)
- Next.js dynamic routes: brackets (e.g., `[id]/`)
- Component libraries: `ui/` for shadcn components

**Functions:**
- Exported utilities: camelCase (e.g., `generateKey()`, `encryptPacked()`)
- Event handlers: camelCase with `handle` prefix (e.g., `handleUpload()`, `handleDownload()`)
- React hooks: camelCase with `use` prefix (e.g., `useState()`, `useCallback()`)

**Types:**
- Interfaces/Types: PascalCase (e.g., `StoredMeta`, `FileInfo`, `ClientPayload`)
- Enums/constants: UPPER_SNAKE_CASE (e.g., `MAX_BLOB_BYTES`, `PRESIGN_TTL_MS`)

## Where to Add New Code

**New Feature (e.g., share via QR code):**
- Primary code: `src/app/upload/page.tsx` or `src/app/download/page.tsx` (new state, UI)
- Utilities: `src/lib/` (if new crypto or encoding logic)
- API: `src/app/api/` (if new endpoint needed)
- Tests: `src/app/__tests__/` or `src/lib/__tests__/` (co-located)

**New Component/Module (e.g., file preview):**
- Implementation: `src/components/file-preview.tsx` (new custom component)
- Tests: `src/components/__tests__/file-preview.test.tsx`
- UI components: Use or extend `src/components/ui/` from shadcn

**Utilities (e.g., time formatting):**
- Shared helpers: `src/lib/utils.ts` (small) or `src/lib/formatting.ts` (dedicated)
- Tests: `src/lib/__tests__/formatting.test.ts`

**API Endpoints (e.g., admin cleanup):**
- New route: `src/app/api/admin/cleanup/route.ts`
- Shared logic: Extract to `src/lib/admin.ts` if reused

**Styles (e.g., new theme):**
- CSS: `src/app/globals.css` (global) or component-level imports
- Tailwind: Use existing `design-system/` configuration; add custom classes if needed

## Special Directories

**`public/`:**
- Purpose: Static assets delivered by CDN
- Generated: `sw.js` (service worker) — hand-written, not generated
- Committed: Yes (all files)
- Note: Icons and manifest required for PWA

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes (by `npm run build`)
- Committed: No (in `.gitignore`)
- Contains: Compiled pages, static assets, type definitions

**`node_modules/`:**
- Purpose: Installed dependencies
- Generated: Yes (by `npm install`)
- Committed: No (in `.gitignore`)

**`android/`:**
- Purpose: Android TWA project for Google Play Store
- Generated: Partially (build outputs)
- Committed: Yes (source files, configs)
- Note: Separate from web app but uses web build output

**`.planning/codebase/`:**
- Purpose: Generated codebase documentation
- Generated: Yes (by `/gsd-map-codebase` agents)
- Committed: Yes (via GSD workflow)
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, etc.

## Import Patterns

**Import Order (in source files):**
1. External packages (`next`, `react`, `lucide-react`, etc.)
2. Relative imports from parent directories (`../../components/`)
3. Path aliases (`@/components`, `@/lib`)

**Example from `src/app/upload/page.tsx`:**
```typescript
import { useEffect, useState } from "react";
import { Check, Copy, ... } from "lucide-react";
import { upload } from "@vercel/blob/client";
import { Button } from "@/components/ui/button";
import { encryptPacked, ... } from "@/lib/crypto";
```

**Path Aliases (defined in `tsconfig.json`):**
- `@/*` → `src/*` (use for all imports within `src/`)

## Build & Deployment

**Development:**
- Entry: `npm run dev` → Next.js dev server at http://localhost:3000
- Watch mode: Automatic hot reload on file changes

**Production Build:**
- Command: `npm run build` → Outputs to `.next/`
- Deployment: Vercel (via `vercel.json` or git push)
- Environment: Node.js 18+ required; `BLOB_READ_WRITE_TOKEN` env var for Vercel Blob

**Linting:**
- Tool: ESLint 9
- Config: `eslint.config.mjs`
- Run: `npm run lint`

---

*Structure analysis: 2026-07-10*
