
# GSD Workflow (mandatory)

All development in this project MUST run through the GSD process. Before doing
any work, always run the relevant /gsd command:

- First time in an existing/unmapped codebase: run /gsd-new-project to review
  the whole codebase before anything else.

- At the start of every session: check state with /gsd-progress.
- Before building anything: plan it with /gsd-plan-phase.
- To build: execute via /gsd-execute-phase.
- After building: verify with /gsd-verify-work.

Never make substantive code changes outside a GSD phase. If unsure which
command applies, run /gsd-progress and follow its recommendation.

<!-- GSD:project-start source:PROJECT.md -->

## Project

**Gemba Filesend**

Gemba Filesend is an anonymous, client-side-encrypted file-sharing web app: a user drops files, they're encrypted in the browser (the key never leaves the client — it lives in the share link's URL fragment), and the recipient decrypts on download. It ships as a web app, an installable PWA, and an Android app (TWA) on Google Play. This milestone re-skins the entire app to the **Gemba design system** (`design-system/`), adds a proper **dark mode**, and closes the highest-priority **security/reliability gaps**.

**Core Value:** Anyone can share a file securely — encrypted end-to-end, no account, no friction — through a single link. Everything else serves that.

### Constraints

- **Design fidelity**: Only use tokens defined in `design-system/tokens/`; derive from the nearest token when a value isn't covered — do not invent colours/type/spacing/radii/shadows. — Source of truth is the Figma-derived system.
- **Tech stack**: Stay on Next.js 16 / React 19 / Tailwind 4; reuse existing shadcn/Radix component layer rather than introducing a parallel UI kit. — Avoid divergent duplicate components.
- **Encryption boundary**: Redesign and hardening must not weaken the client-side-encryption model (key never reaches the server). — Core value.
- **Platform parity**: Changes must hold across web, PWA, and Android TWA (theme + logos render correctly in all three). — TWA/asset-links are fragile.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- TypeScript (5) - React components, API routes, utilities
- JavaScript (ES2017) - Service worker, scripts
- JSON - Configuration, manifests

## Runtime

- Node.js 18+ (required for `crypto.subtle` Web Crypto API)
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

- Next.js 16.1.6 - Full-stack React framework with API routes
- React 19.2.3 - UI component library
- React DOM 19.2.3 - DOM rendering
- Tailwind CSS 4 - Utility-first CSS framework
- shadcn - Component library built on Radix UI + Tailwind
- next-themes 0.4.6 - System/light/dark theme switching
- lucide-react 0.575.0 - SVG icon library
- sonner 2.0.7 - Toast notification component
- class-variance-authority 0.7.1 - Component variant system
- clsx 2.1.1 - Conditional CSS class names
- tailwind-merge 3.5.0 - Merge Tailwind utilities safely
- radix-ui 1.4.3 - Headless UI component primitives

## Build & Development Tools

- TypeScript 5 - Type checking and compilation
- Sharp 0.34.5 - Image processing (icon generation)
- Tailwind CSS 4 - CSS generation
- ESLint 9 - JavaScript linting
- `next dev` - Local development server
- `npm run icons` - Icon generation script using `scripts/generate-icons.mjs`

## Key Dependencies

- `@vercel/blob` 2.4.0 - Cloud file storage integration (optional, production mode)
- Native `crypto.subtle` (globalThis.crypto) - Browser/Node.js Web Crypto API
- puppeteer-core 24.37.5 - Screenshot capture (likely used for icon generation)

## Configuration Files

- `tsconfig.json`
- `next.config.ts` - Next.js configuration (minimal)
- `postcss.config.mjs` - PostCSS with Tailwind CSS plugin
- `eslint.config.mjs` - ESLint configuration
- `package.json` - Dependencies and scripts

## Environment Configuration

- `BLOB_READ_WRITE_TOKEN` - Vercel Blob API token (production only)
- `GEMBA_STORAGE_DIR` - Local filesystem storage directory (defaults to `./data`)
- `CRON_SECRET` - Authorization token for cleanup endpoint (Vercel Cron)
- `.env.local` - Present (local development)
- Environment variables can be checked at runtime via `process.env`

## Platform Support

- Modern browsers (ES2017 JavaScript)
- Chrome/Chromium 89+ (Web Crypto API)
- Firefox, Safari, Edge (Web Crypto API support)
- Installable on mobile and desktop
- Service worker at `public/sw.js`
- Web manifest at `public/manifest.webmanifest`
- Offline fallback for app shell
- Trusted Web Activity (TWA) via Bubblewrap
- Deployed to Google Play Store as native Android app
- Configuration: `android/twa-manifest.json`
- Package ID: `mba.ge.filesend`
- Minimum SDK: 21 (Android 5.0+)

## Storage Modes

- Uses Vercel Blob for persistent file storage
- Connection via `@vercel/blob` SDK
- Requires: `BLOB_READ_WRITE_TOKEN` environment variable
- Pathname structure: `gemba/meta/{id}.json`, `gemba/blob/{id}/*`
- Local directory-based storage
- Default path: `./data/`
- Customizable via `GEMBA_STORAGE_DIR` environment variable
- File structure: `{id}.bin` (file), `{id}.json` (metadata)

## Deployment Target

- Vercel (implied by Next.js, `@vercel/blob` integration, Vercel Cron)
- Deploy command: `npm run build && npm start`
- Android/Google Play Store via TWA build
- Build command: Bubblewrap CLI with `twa-manifest.json`

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- Components: PascalCase (e.g., `FileDropzone.tsx`, `Header.tsx`)
- Utilities/libraries: camelCase (e.g., `crypto.ts`, `blob-storage.ts`)
- Pages: lowercase with hyphens (e.g., `upload`, `download`)
- UI components: lowercase (e.g., `button.tsx`, `card.tsx`)
- camelCase for all functions (e.g., `generateKey()`, `uploadOneFile()`, `formatSize()`)
- Exported functions on public APIs typed explicitly
- Async functions use standard async/await naming (no special prefix)
- camelCase for all variables and constants
- ALL_CAPS for configuration constants (e.g., `MAX_DOWNLOADS`, `IV_BYTES`, `AES_KEY_BITS`, `EXPIRY_UNIT_MS`)
- Constants grouped at module top with explanatory comments
- PascalCase for interface and type names (e.g., `FileDropzoneProps`, `UploadResult`, `UploadState`)
- Props interfaces suffixed with `Props` (e.g., `FileDropzoneProps`)
- Type unions use PascalCase (e.g., `UploadState = "idle" | "preparing" | "uploading" | "done"`)
- Configuration record types use lowercase string keys (e.g., `Record<ExpiryUnit, number>`)

## Code Style

- No `.prettierrc` file present — using ESLint defaults
- Indentation: 2 spaces (inferred from package.json and source files)
- Line length: No explicit limit observed; pragmatic based on readability
- Trailing commas: Present in multi-line structures
- ESLint with Next.js config (`eslint-config-next`)
- Config file: `eslint.config.mjs` (flat config format)
- Core Web Vitals rules enforced via `eslint-config-next/core-web-vitals`
- TypeScript support via `eslint-config-next/typescript`
- Run: `npm run lint`
- `tsconfig.json` targets ES2017 with strict mode enabled
- JSX: react-jsx (automatic runtime)
- Path alias: `@/*` → `./src/*`
- `noEmit: true` (type checking only, no output)
- Incremental builds enabled

## Import Organization

- `@/` maps to `./src/` (configured in `tsconfig.json`)
- Always use alias for internal imports (never relative paths like `../../`)

## Error Handling

- Use `try-catch` blocks for async operations
- Always check error type with `instanceof Error` before accessing `.message`
- Provide user-friendly error messages in UI toast notifications
- Use `unknown` type for caught errors, then narrow safely
- Validate all input data with type guards before processing
- Return structured JSON responses with `{ id?, error?, data? }` fields
- Use appropriate HTTP status codes (400 for bad request, 500 for server error)

## Logging

- No `console.log` in production code (inferred from clean codebase)
- Complex operations documented with JSDoc comments instead
- Error context captured in error messages, not via logging

## Comments

- Complex algorithms or non-obvious logic (e.g., crypto operations)
- Important implementation details that affect behavior
- Trade-offs or constraints (e.g., memory management in file uploads)
- Used on exported functions and complex utilities
- Document parameters, return types, and significant behavior

## Function Design

- Example: `generateClientId()` - 7 lines
- Example: `formatSize()` - 5 lines
- Complex operations broken into smaller helpers (e.g., `uploadOneFile` delegates to lower-level functions)
- Props interfaces for components (e.g., `FileDropzoneProps`)
- Options objects for functions with multiple parameters (e.g., `uploadOneFile` takes single `opts` parameter)
- Callback functions typed explicitly (e.g., `onProgress: (percent: number) => void`)
- Explicit return types on all exported functions
- Async functions return `Promise<T>`
- Nullable returns use `T | null` (not `T | undefined`)

## Module Design

- Each module exports a cohesive set of related functions
- Storage layer exports: `readMeta()`, `writeMeta()`, `deleteEntry()`
- Crypto layer exports: `generateKey()`, `encryptPacked()`, `decryptPacked()`, hash and encoding utilities
- No default exports (all named exports)
- Not used in this project
- Each component/utility imported directly from its file
- Props defined as interfaces in the same file
- Destructuring in function signature with type annotation
- Optional props use `?` suffix in interface

## React-Specific Patterns

- `useState` for component state (standard naming: `const [value, setValue] = useState()`)
- `useCallback` for memoized callbacks passed as props
- `useEffect` for side effects with proper dependency arrays
- Client components marked with `"use client"` directive
- Typed with React event types (e.g., `React.DragEvent`, `React.ChangeEvent<HTMLInputElement>`)
- Event handlers use `handleX` naming convention (e.g., `handleDrop`, `handleFileSelect`, `handleUpload`)
- Callbacks passed to children use `onX` naming (e.g., `onFilesChange`, `onProgress`)
- State updates use spread operator: `[...files, ...accepted]`
- Never mutate state directly: `setFiles(...)`
- Array operations create new arrays: `files.filter(...)`

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Upload Page | Client-side file selection, encryption, multi-file upload orchestration | `src/app/upload/page.tsx` |
| Download Page | File info retrieval, password entry, download + decryption flow | `src/app/download/page.tsx` |
| File Dropzone | Drag-drop UI, file selection, size validation | `src/components/file-dropzone.tsx` |
| Header | Navigation, theme toggle | `src/components/header.tsx` |
| API: Upload | Handles blob and direct uploads, metadata storage, presigned URL generation | `src/app/api/files/route.ts` |
| API: Download | Access control (password, expiry, download limit), presigned URL issuance | `src/app/api/files/[id]/route.ts` |
| API: Metadata | Public file info (without decryption key), expiry/exhaustion checks | `src/app/api/files/[id]/meta/route.ts` |
| Crypto Layer | AES-128-GCM encryption/decryption, key generation, password hashing | `src/lib/crypto.ts` |
| Blob Storage | Vercel Blob read/write abstractions | `src/lib/blob-storage.ts` |
| Server Storage | Node.js filesystem read/write abstractions | `src/lib/server-storage.ts` |

## Pattern Overview

- **Client-side encryption**: Keys never leave browser; decryption key embedded in URL fragment
- **Storage abstraction**: Same API layer works with either Vercel Blob (production) or local filesystem (development)
- **Streaming architecture**: Handles files up to 15GB via chunked upload/download
- **Stateless API**: No session state; all access control via download limits, expiry timestamps, password hashes
- **Progressive enhancement**: Clipboard fallback for non-HTTPS contexts

## Layers

- Purpose: User interface for upload/download flows, client-side file encryption
- Location: `src/app/upload/page.tsx`, `src/app/download/page.tsx`, `src/components/`
- Contains: React components, UI state management, form handling, file encryption logic
- Depends on: Web Crypto API, Vercel Blob SDK (for multipart uploads), server API
- Used by: Browser users
- Purpose: Upload/download orchestration, access control, metadata management
- Location: `src/app/api/files/route.ts`, `src/app/api/files/[id]/route.ts`, `src/app/api/files/[id]/meta/route.ts`
- Contains: Request validation, password checking, expiry/download-limit enforcement, storage delegation
- Depends on: Storage abstraction layer, crypto utilities
- Used by: Frontend, external clients (download via presigned URLs)
- Purpose: Unified interface to pluggable storage backends
- Location: `src/lib/storage.ts` (types), `src/lib/blob-storage.ts`, `src/lib/server-storage.ts`
- Contains: Vercel Blob operations (production), Node.js filesystem operations (dev)
- Depends on: @vercel/blob SDK, Node.js fs module
- Used by: API routes
- Purpose: Encryption, decryption, key derivation, password hashing
- Location: `src/lib/crypto.ts`
- Contains: AES-128-GCM encrypt/decrypt, key generation/export/import, SHA-256 hashing, Base64URL encoding
- Depends on: Web Crypto API (globalThis.crypto.subtle)
- Used by: Frontend (client-side encryption), API routes (password verification)

## Data Flow

### Primary Request Path: Upload

### Secondary Request Path: Download

- Frontend: React hooks (useState) for upload/download progress, file lists, UI state
- Server: Metadata stored in JSON files (filesystem) or JSON blobs (Vercel Blob)
- No session storage; all access control is stateless (based on download limits, timestamps, password hashes)

## Key Abstractions

- Purpose: Choose between cloud (Vercel Blob) and local (filesystem) backends transparently
- Examples: `src/lib/storage.ts`, `src/lib/blob-storage.ts`, `src/lib/server-storage.ts`
- Pattern: Environment-based dispatcher (`getStorageMode()`) with parallel implementations
- Purpose: Generate, export, import AES-128-GCM keys; abstract Web Crypto API
- Examples: `src/lib/crypto.ts:7-28`
- Pattern: Symmetric encryption with IV prepended to ciphertext
- Purpose: Unified metadata format across storage backends
- Examples: `src/lib/storage.ts:10-23`
- Pattern: Contains plaintext filename, size; encrypted via separate JSON blob

## Entry Points

- Location: `src/app/page.tsx` (home), `src/app/layout.tsx` (root layout)
- Triggers: Browser navigation to `/`, `/upload`, `/download`, or direct share link
- Responsibilities: Render UI, handle client-side encryption/decryption, communicate with API
- Location: `src/app/api/files/route.ts` (POST upload, dual-mode dispatch)
- Triggers: HTTP requests from frontend or external clients
- Responsibilities: Validate input, manage storage backend, enforce access control
- Location: Registered in `src/app/layout.tsx:61-68`
- Triggers: Browser load event
- Responsibilities: Cache app shell for PWA installability (referenced in comments)

## Architectural Constraints

- **Threading:** Single-threaded event loop (browser/Node.js); uploads processed sequentially per file to avoid memory spikes
- **Global state:** No module-level singletons; all state is scoped to request handlers or React components
- **Circular imports:** None detected; storage abstraction and crypto are leaf modules
- **Encryption strength:** AES-128-GCM is approved but weaker than AES-256; acceptable for transport security where data is accessed via presigned URLs
- **Key derivation:** No PBKDF2 or Argon2 for password-to-key; passwords are hashed with SHA-256 for storage verification only (not symmetric key derivation)

## Anti-Patterns

### Dual Download Paths in API

### Client Payload in Blob Upload

## Error Handling

- Input validation: Reject oversized files, invalid metadata, mismatched pathnames early
- Storage errors: Catch fs/blob exceptions and return HTTP 400/500 with descriptive message
- Crypto errors: Throw on IV too short, auth tag failure; catch in download flow and toast user
- Password mismatch: Return 403 Forbidden without revealing whether file exists
- Expiry/exhaustion: Return 410 Gone and auto-delete entry

## Cross-Cutting Concerns

- Frontend: Size limits in file dropzone
- API: Metadata type guards (`validateClientMeta()`), bounds checking (MAX_BLOB_BYTES, MAX_DOWNLOADS, MAX_EXPIRY_MS)
- No user accounts; access control is URL-based (decryption key in fragment) + optional password hash
- Password is SHA-256 hash of plaintext + random salt, not key derivation

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| gemba-filesend |  | `.claude/skills/gemba-filesend/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
