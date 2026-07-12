# Testing Patterns

**Analysis Date:** 2026-07-10

## Test Framework

**Status:** No testing framework currently configured

**Observation:** The project has no test files, test configuration, or testing infrastructure installed.
- No `jest.config.*` or `vitest.config.*` files
- No test dependencies in `package.json`
- No `.test.ts`, `.spec.ts`, or similar test files found
- No coverage configuration

**Recommendation:** This is a critical gap. Testing infrastructure needs to be established before writing new features.

## Run Commands

**Current state:**
```bash
npm run lint              # Run ESLint checks
npm run dev              # Development server
npm run build            # Production build
npm run start            # Production server
```

**Testing commands (not yet configured):**
No test runner is available. To implement testing, a framework must be selected and configured:

- **Option 1: Vitest** (recommended for this Next.js + TypeScript project)
  ```bash
  npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom
  npm test                 # Would run all tests
  npm test -- --ui        # Watch mode with UI
  npm test -- --coverage  # Coverage report
  ```

- **Option 2: Jest** (traditional Next.js choice)
  ```bash
  npm install -D jest @testing-library/react @testing-library/jest-dom
  ```

## Test File Organization

**Current:** Not applicable — no tests exist

**Recommended structure for future tests:**
```
src/
├── app/
│   ├── upload/
│   │   ├── page.tsx
│   │   └── page.test.tsx          # Co-located
│   └── download/
│       ├── page.tsx
│       └── page.test.tsx
├── components/
│   ├── file-dropzone.tsx
│   ├── file-dropzone.test.tsx     # Co-located
│   └── __tests__/
│       └── integration/
│           └── upload-flow.test.tsx
└── lib/
    ├── crypto.ts
    ├── crypto.test.ts              # Co-located
    └── __tests__/
        └── fixtures/
            └── sample-keys.ts
```

**Naming Pattern:**
- Component tests: `ComponentName.test.tsx` (co-located with component)
- Utility tests: `utility.test.ts` (co-located with utility)
- Integration/E2E tests: `__tests__/integration/` subdirectory
- Test fixtures: `__tests__/fixtures/` subdirectory

## Test Structure

**When tests are implemented, follow this pattern:**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileDropzone } from '@/components/file-dropzone';
import { render, screen, fireEvent } from '@testing-library/react';

describe('FileDropzone', () => {
  beforeEach(() => {
    // Setup
  });

  it('should accept dropped files', () => {
    // Arrange
    const mockOnChange = vi.fn();
    render(<FileDropzone files={[]} onFilesChange={mockOnChange} />);

    // Act
    const dropzone = screen.getByRole('button', { hidden: true }).closest('label');
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [new File([''], 'test.txt')] }
    });

    // Assert
    expect(mockOnChange).toHaveBeenCalledWith([expect.any(File)]);
  });

  it('should reject files exceeding size limit', () => {
    // Test implementation
  });
});
```

**Patterns:**
- Use **Arrange-Act-Assert** structure for clarity
- Group related tests with `describe()` blocks
- One assertion per test (when possible)
- Use `vi.fn()` for mocking callbacks

## Mocking

**When tests are implemented:**

**Framework:** Vitest's `vi` module (or Jest's `jest` module)

**Patterns:**

### Mocking Functions
```typescript
import { vi } from 'vitest';

const mockUpload = vi.fn().mockResolvedValue({ id: 'test-123' });
const mockOnProgress = vi.fn();
```

### Mocking Modules
```typescript
import { vi } from 'vitest';

vi.mock('@/lib/crypto', () => ({
  generateKey: vi.fn().mockResolvedValue(mockKey),
  encryptPacked: vi.fn().mockResolvedValue(mockCiphertext),
}));
```

### Mocking Browser APIs
```typescript
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined)
};

Object.assign(navigator, { clipboard: mockClipboard });
```

**What to Mock:**
- External API calls (crypto operations, file uploads)
- Browser APIs (clipboard, storage)
- Network requests (`fetch`, `/api/` routes)
- Router navigation (`useRouter`)

**What NOT to Mock:**
- Core business logic (encryption, validation)
- Component rendering (use render instead)
- DOM utilities
- React hooks (unless testing their side effects)

## Fixtures and Factories

**Recommended approach for this project:**

**Test Fixtures Directory:** `src/__tests__/fixtures/`

**Sample Data Factory:**
```typescript
// src/__tests__/fixtures/sample-files.ts
export function createMockFile(
  name: string = 'test.txt',
  size: number = 1024,
  type: string = 'text/plain'
): File {
  return new File(['a'.repeat(size)], name, { type });
}

export const MOCK_ENCRYPTION_KEY = {
  id: 'test-key-123',
  type: 'secret',
};

export const MOCK_METADATA = {
  id: 'test-123',
  name: 'test-file.txt',
  size: 1024,
  type: 'text/plain',
  downloadsRemaining: 1,
  expiresAt: Date.now() + 86400000,
  createdAt: Date.now(),
};
```

**Location:** Keep fixtures in `src/__tests__/fixtures/` to keep test infrastructure separate from source code.

## Coverage

**Target:** 80% minimum coverage

**Recommended configuration (when tests are added):**

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.stories.tsx'
      ],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
});
```

**View Coverage:**
```bash
npm test -- --coverage
```

## Test Types

### Unit Tests

**Scope:** Individual functions, utilities, components in isolation

**Examples:**
- `crypto.test.ts`: Test `generateKey()`, `encryptPacked()`, `decryptPacked()` functions
- `utils.test.ts`: Test `formatSize()`, `cn()` helper functions
- `file-dropzone.test.tsx`: Test component rendering, drag-drop logic, file filtering

**Approach:** Fast, use mocks for external dependencies, focus on function inputs/outputs

### Integration Tests

**Scope:** API endpoints, multiple components working together, storage operations

**Examples:**
- `/api/files` route: Test upload flow with mocked Vercel Blob or filesystem
- Upload page: Test form submission with file selection → encryption → upload sequence
- Download flow: Test metadata retrieval → file decryption → response

**Approach:** Use `supertest` for API route testing, `renderHook` for hook integration

### E2E Tests

**Framework:** Playwright (recommended for this project)

**Critical user flows to test:**
1. **Upload Flow**: Select file → set password/expiry → upload → get share link
2. **Download Flow**: Access share link → enter password (if protected) → download and decrypt file
3. **Multi-file Upload**: Select multiple files → upload → verify each has unique link
4. **Expiry/Download Limits**: Verify files expire/become unavailable after limits reached

**Setup (future):**
```bash
npm install -D @playwright/test
npx playwright install
```

**Example Playwright test:**
```typescript
// tests/upload.spec.ts
import { test, expect } from '@playwright/test';

test('complete upload flow', async ({ page }) => {
  await page.goto('http://localhost:3000/upload');
  
  // Upload file
  await page.setInputFiles('input[type="file"]', 'test-file.txt');
  
  // Set password
  await page.click('text=Password Protection');
  await page.fill('input[type="password"]', 'secure-password');
  
  // Submit
  await page.click('button:has-text("Upload")');
  
  // Verify success and link
  await expect(page).toContainText('Upload Complete');
  const link = await page.inputValue('input[readonly]');
  expect(link).toContain('/download?');
});
```

## Testing Critical Areas

### Encryption/Decryption (`src/lib/crypto.ts`)

**Must test:**
- Key generation produces valid CryptoKey
- Encryption with valid key succeeds
- Decryption recovers original plaintext
- Invalid auth tags throw on decryption
- Base64Url encoding/decoding round-trips
- SHA256 hashing produces consistent output

### File Upload (`src/app/upload/page.tsx`)

**Must test:**
- Files can be selected (file input)
- Drag-drop files work
- File size validation rejects oversized files
- Multiple files upload sequentially (not in parallel)
- Progress callbacks fire correctly
- Failed uploads display error toasts
- Successful uploads return share links

### API Route (`src/app/api/files/route.ts`)

**Must test:**
- Metadata validation rejects invalid input
- Password hashing works correctly
- Files are stored with correct permissions
- Direct and Blob upload modes work
- Missing metadata returns 400
- Server errors return 500 with message

## Common Patterns

### Async Testing

```typescript
it('should upload file successfully', async () => {
  const mockUpload = vi.fn().mockResolvedValue({ id: 'test' });
  
  // Component that calls async function
  await waitFor(() => {
    expect(mockUpload).toHaveBeenCalled();
  });
});
```

### Error Testing

```typescript
it('should handle upload errors gracefully', async () => {
  const mockUpload = vi.fn().mockRejectedValue(
    new Error('Network error')
  );
  
  render(<UploadComponent />);
  
  await userEvent.click(screen.getByRole('button', { name: /upload/i }));
  
  await waitFor(() => {
    expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
  });
});
```

### State Testing (Hooks)

```typescript
import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';

it('should manage upload state', () => {
  const { result } = renderHook(() => useState('idle'));
  
  act(() => {
    result.current[1]('uploading');
  });
  
  expect(result.current[0]).toBe('uploading');
});
```

---

*Testing analysis: 2026-07-10*

**Note:** This document describes recommended testing patterns for the project. No testing infrastructure currently exists. Testing should be implemented as a priority before adding new features.
