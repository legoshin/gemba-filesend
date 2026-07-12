# Technology Stack

**Analysis Date:** 2026-07-10

## Languages

**Primary:**
- TypeScript (5) - React components, API routes, utilities
- JavaScript (ES2017) - Service worker, scripts

**Secondary:**
- JSON - Configuration, manifests

## Runtime

**Environment:**
- Node.js 18+ (required for `crypto.subtle` Web Crypto API)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework with API routes
  - `src/app/` - App Router pages and layouts
  - `src/app/api/` - Node.js API endpoints
  - Standalone deployment support

**UI Framework:**
- React 19.2.3 - UI component library
- React DOM 19.2.3 - DOM rendering

**Styling:**
- Tailwind CSS 4 - Utility-first CSS framework
  - PostCSS integration via `postcss.config.mjs`
  - Configured in `next.config.ts`
  - `@tailwindcss/postcss` plugin
- shadcn - Component library built on Radix UI + Tailwind
  - Pre-built components in `src/components/ui/`

**Theme Management:**
- next-themes 0.4.6 - System/light/dark theme switching

**Icons:**
- lucide-react 0.575.0 - SVG icon library

**Notifications:**
- sonner 2.0.7 - Toast notification component

**Component Utilities:**
- class-variance-authority 0.7.1 - Component variant system
- clsx 2.1.1 - Conditional CSS class names
- tailwind-merge 3.5.0 - Merge Tailwind utilities safely
- radix-ui 1.4.3 - Headless UI component primitives

## Build & Development Tools

**Build:**
- TypeScript 5 - Type checking and compilation
- Sharp 0.34.5 - Image processing (icon generation)
- Tailwind CSS 4 - CSS generation

**Linting:**
- ESLint 9 - JavaScript linting
  - Configuration: `eslint.config.mjs`
  - Presets: next/core-web-vitals, next/typescript
  - Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`

**Development:**
- `next dev` - Local development server
- `npm run icons` - Icon generation script using `scripts/generate-icons.mjs`

## Key Dependencies

**Critical:**
- `@vercel/blob` 2.4.0 - Cloud file storage integration (optional, production mode)
  - Used in: `src/lib/blob-storage.ts`, `src/app/api/files/route.ts`
  - Provides: `put()`, `get()`, `del()`, `list()`, `issueSignedToken()`, `presignUrl()`
  - Requires: `BLOB_READ_WRITE_TOKEN` environment variable

**Cryptography:**
- Native `crypto.subtle` (globalThis.crypto) - Browser/Node.js Web Crypto API
  - AES-128-GCM encryption for file encryption
  - SHA-256 hashing for password protection
  - No external crypto dependency needed (built into Node.js 18+)

**Utilities:**
- puppeteer-core 24.37.5 - Screenshot capture (likely used for icon generation)

## Configuration Files

**TypeScript:**
- `tsconfig.json`
  - Target: ES2017
  - Strict mode enabled
  - Module resolution: bundler
  - Path aliases: `@/*` → `./src/*`
  - Plugins: next

**Build Configuration:**
- `next.config.ts` - Next.js configuration (minimal)
- `postcss.config.mjs` - PostCSS with Tailwind CSS plugin
- `eslint.config.mjs` - ESLint configuration

**Package Manager:**
- `package.json` - Dependencies and scripts

## Environment Configuration

**Required Environment Variables:**
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob API token (production only)
  - When set: Storage mode switches to "blob"
  - When unset: Falls back to local filesystem

**Optional Environment Variables:**
- `GEMBA_STORAGE_DIR` - Local filesystem storage directory (defaults to `./data`)
- `CRON_SECRET` - Authorization token for cleanup endpoint (Vercel Cron)
  - Format: Bearer token validation
  - When unset: Cleanup endpoint allows any request (development only)

**Configuration Method:**
- `.env.local` - Present (local development)
- Environment variables can be checked at runtime via `process.env`

## Platform Support

**Web:**
- Modern browsers (ES2017 JavaScript)
- Chrome/Chromium 89+ (Web Crypto API)
- Firefox, Safari, Edge (Web Crypto API support)

**PWA (Progressive Web App):**
- Installable on mobile and desktop
- Service worker at `public/sw.js`
- Web manifest at `public/manifest.webmanifest`
- Offline fallback for app shell

**Android:**
- Trusted Web Activity (TWA) via Bubblewrap
- Deployed to Google Play Store as native Android app
- Configuration: `android/twa-manifest.json`
- Package ID: `mba.ge.filesend`
- Minimum SDK: 21 (Android 5.0+)

## Storage Modes

**Blob Mode (Production):**
- Uses Vercel Blob for persistent file storage
- Connection via `@vercel/blob` SDK
- Requires: `BLOB_READ_WRITE_TOKEN` environment variable
- Pathname structure: `gemba/meta/{id}.json`, `gemba/blob/{id}/*`

**Filesystem Mode (Development):**
- Local directory-based storage
- Default path: `./data/`
- Customizable via `GEMBA_STORAGE_DIR` environment variable
- File structure: `{id}.bin` (file), `{id}.json` (metadata)

## Deployment Target

**Primary:**
- Vercel (implied by Next.js, `@vercel/blob` integration, Vercel Cron)
- Deploy command: `npm run build && npm start`

**Secondary:**
- Android/Google Play Store via TWA build
- Build command: Bubblewrap CLI with `twa-manifest.json`

---

*Stack analysis: 2026-07-10*
