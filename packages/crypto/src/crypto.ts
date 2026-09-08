// Platform-neutral fallback for the AES-GCM/SHA-256 primitive adapter.
//
// Bundlers configured for platform-extension resolution prefer a
// platform-specific file over this one when it exists: Turbopack via
// `turbopack.resolveExtensions` in apps/web/next.config.ts prefers
// `crypto.web.ts`; Metro's built-in platform resolution will prefer
// `crypto.native.ts` once 05-04 adds it. TypeScript's own module resolution
// (and any tool that isn't platform-extension-aware, e.g. plain `tsc`)
// always resolves this bare file instead, so it must re-export a real
// implementation — currently the web adapter, since crypto.native.ts does
// not exist yet.
export * from "./crypto.web";
