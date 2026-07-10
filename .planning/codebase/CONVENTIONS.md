# Coding Conventions

**Analysis Date:** 2026-07-10

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `FileDropzone.tsx`, `Header.tsx`)
- Utilities/libraries: camelCase (e.g., `crypto.ts`, `blob-storage.ts`)
- Pages: lowercase with hyphens (e.g., `upload`, `download`)
- UI components: lowercase (e.g., `button.tsx`, `card.tsx`)

**Functions:**
- camelCase for all functions (e.g., `generateKey()`, `uploadOneFile()`, `formatSize()`)
- Exported functions on public APIs typed explicitly
- Async functions use standard async/await naming (no special prefix)

**Variables:**
- camelCase for all variables and constants
- ALL_CAPS for configuration constants (e.g., `MAX_DOWNLOADS`, `IV_BYTES`, `AES_KEY_BITS`, `EXPIRY_UNIT_MS`)
- Constants grouped at module top with explanatory comments

**Types:**
- PascalCase for interface and type names (e.g., `FileDropzoneProps`, `UploadResult`, `UploadState`)
- Props interfaces suffixed with `Props` (e.g., `FileDropzoneProps`)
- Type unions use PascalCase (e.g., `UploadState = "idle" | "preparing" | "uploading" | "done"`)
- Configuration record types use lowercase string keys (e.g., `Record<ExpiryUnit, number>`)

## Code Style

**Formatting:**
- No `.prettierrc` file present — using ESLint defaults
- Indentation: 2 spaces (inferred from package.json and source files)
- Line length: No explicit limit observed; pragmatic based on readability
- Trailing commas: Present in multi-line structures

**Linting:**
- ESLint with Next.js config (`eslint-config-next`)
- Config file: `eslint.config.mjs` (flat config format)
- Core Web Vitals rules enforced via `eslint-config-next/core-web-vitals`
- TypeScript support via `eslint-config-next/typescript`
- Run: `npm run lint`

**TypeScript:**
- `tsconfig.json` targets ES2017 with strict mode enabled
- JSX: react-jsx (automatic runtime)
- Path alias: `@/*` → `./src/*`
- `noEmit: true` (type checking only, no output)
- Incremental builds enabled

## Import Organization

**Order:**
1. React and Next.js imports
2. External third-party packages
3. Internal utilities and components via path aliases
4. Local styles and assets

**Examples:**
```typescript
// React/Next.js first
import { useState, useCallback } from "react";
import Link from "next/link";
import type { NextRequest, NextResponse } from "next/server";

// Third-party packages
import { CloudUpload, X } from "lucide-react";
import { toast } from "sonner";

// Internal via @/ alias
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { generateKey, encryptPacked } from "@/lib/crypto";
```

**Path Aliases:**
- `@/` maps to `./src/` (configured in `tsconfig.json`)
- Always use alias for internal imports (never relative paths like `../../`)

## Error Handling

**Patterns:**
- Use `try-catch` blocks for async operations
- Always check error type with `instanceof Error` before accessing `.message`
- Provide user-friendly error messages in UI toast notifications
- Use `unknown` type for caught errors, then narrow safely

**Examples from codebase:**
```typescript
// ✓ CORRECT: Safe error narrowing
catch (err: unknown) {
  const message = err instanceof Error ? err.message : "unknown";
  return NextResponse.json({ error: message }, { status: 400 });
}

// ✓ CORRECT: User-friendly toast error
catch (err) {
  setUploadState("idle");
  toast.error(
    "Upload failed: " +
      (err instanceof Error ? err.message : "Unknown error"),
  );
}
```

**API Routes:**
- Validate all input data with type guards before processing
- Return structured JSON responses with `{ id?, error?, data? }` fields
- Use appropriate HTTP status codes (400 for bad request, 500 for server error)

## Logging

**Framework:** No logging library present — use `console` for development only

**Patterns:**
- No `console.log` in production code (inferred from clean codebase)
- Complex operations documented with JSDoc comments instead
- Error context captured in error messages, not via logging

## Comments

**When to Comment:**
- Complex algorithms or non-obvious logic (e.g., crypto operations)
- Important implementation details that affect behavior
- Trade-offs or constraints (e.g., memory management in file uploads)

**JSDoc/TSDoc:**
- Used on exported functions and complex utilities
- Document parameters, return types, and significant behavior

**Examples:**
```typescript
/**
 * Encrypts one file and uploads it. Returns the share link.
 *
 * Each file is processed end-to-end before the next starts, so peak memory
 * stays at roughly 3× the single largest file (raw bytes + ciphertext +
 * packed output) rather than 3× the combined total of all selected files.
 */
async function uploadOneFile(opts: { ... }): Promise<string> {
  // ...
}

/**
 * Writes `text` to the clipboard. Uses the async Clipboard API when
 * available (HTTPS / localhost), falls back to a hidden <textarea> +
 * document.execCommand("copy") for older browsers and insecure contexts.
 * Returns true on success.
 */
const writeClipboard = async (text: string): Promise<boolean> => {
  // ...
};
```

## Function Design

**Size:** Functions kept small and focused (most under 50 lines)
- Example: `generateClientId()` - 7 lines
- Example: `formatSize()` - 5 lines
- Complex operations broken into smaller helpers (e.g., `uploadOneFile` delegates to lower-level functions)

**Parameters:** 
- Props interfaces for components (e.g., `FileDropzoneProps`)
- Options objects for functions with multiple parameters (e.g., `uploadOneFile` takes single `opts` parameter)
- Callback functions typed explicitly (e.g., `onProgress: (percent: number) => void`)

**Return Values:**
- Explicit return types on all exported functions
- Async functions return `Promise<T>`
- Nullable returns use `T | null` (not `T | undefined`)

## Module Design

**Exports:**
- Each module exports a cohesive set of related functions
- Storage layer exports: `readMeta()`, `writeMeta()`, `deleteEntry()`
- Crypto layer exports: `generateKey()`, `encryptPacked()`, `decryptPacked()`, hash and encoding utilities
- No default exports (all named exports)

**Barrel Files:**
- Not used in this project
- Each component/utility imported directly from its file

**Component Props:**
- Props defined as interfaces in the same file
- Destructuring in function signature with type annotation
- Optional props use `?` suffix in interface

**Examples:**
```typescript
interface FileDropzoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxSizeMb?: number;
}

export function FileDropzone({
  files,
  onFilesChange,
  maxSizeMb = 15360,
}: FileDropzoneProps) {
  // ...
}
```

## React-Specific Patterns

**Hooks:**
- `useState` for component state (standard naming: `const [value, setValue] = useState()`)
- `useCallback` for memoized callbacks passed as props
- `useEffect` for side effects with proper dependency arrays
- Client components marked with `"use client"` directive

**Event Handlers:**
- Typed with React event types (e.g., `React.DragEvent`, `React.ChangeEvent<HTMLInputElement>`)
- Event handlers use `handleX` naming convention (e.g., `handleDrop`, `handleFileSelect`, `handleUpload`)
- Callbacks passed to children use `onX` naming (e.g., `onFilesChange`, `onProgress`)

**Immutability:**
- State updates use spread operator: `[...files, ...accepted]`
- Never mutate state directly: `setFiles(...)`
- Array operations create new arrays: `files.filter(...)`

---

*Convention analysis: 2026-07-10*
