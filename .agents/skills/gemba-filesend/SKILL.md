```markdown
# gemba-filesend Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `gemba-filesend` repository, a TypeScript project built with Next.js. You'll learn how to structure files, write code, follow commit conventions, and organize tests in alignment with the repository's style.

## Coding Conventions

### File Naming
- Use **camelCase** for file and folder names.
  - Example: `fileUpload.ts`, `userProfilePage.tsx`

### Import Style
- Use **alias imports** for modules.
  - Example:
    ```typescript
    import { uploadFile } from '@/utils/fileUpload';
    ```

### Export Style
- Use **named exports** throughout the codebase.
  - Example:
    ```typescript
    export const uploadFile = async () => { /* ... */ };
    ```

### Commit Messages
- Follow **Conventional Commits** with the `feat` prefix for new features.
  - Example:  
    ```
    feat: add drag-and-drop support to file upload component
    ```

## Workflows

### Feature Development
**Trigger:** When adding a new feature  
**Command:** `/feature-development`

1. Create a new file using camelCase naming.
2. Implement the feature using TypeScript and Next.js conventions.
3. Use alias imports for any shared utilities or components.
4. Export new functions or components as named exports.
5. Write or update corresponding test files (`*.test.*`).
6. Commit your changes using the conventional commit format with the `feat` prefix.

### Testing
**Trigger:** When writing or updating tests  
**Command:** `/run-tests`

1. Create or update test files matching the pattern `*.test.*`.
2. Use the project's preferred (unknown) testing framework.
3. Run the test suite to ensure all tests pass.

## Testing Patterns

- Test files follow the `*.test.*` naming convention.
  - Example: `fileUpload.test.ts`
- The specific testing framework is not detected, but tests should be colocated with or near the code they validate.
- Ensure all new features and bug fixes are accompanied by relevant tests.

## Commands
| Command               | Purpose                                      |
|-----------------------|----------------------------------------------|
| /feature-development  | Guide for adding a new feature               |
| /run-tests            | Steps to write and execute tests             |
```