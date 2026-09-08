// jest-expo scoped to the shared pure-TS core PLUS the web/fallback AES-GCM
// adapter (WR-01 correction). The suite exercises @gemba/crypto through the
// platform-resolved "./crypto" adapter, which — under the pinned resolution
// below — is crypto.web.ts (real AES-GCM via globalThis.crypto.subtle), NOT
// a pure-TS-only path. The "node" preset variant runs in a plain Node test
// environment (no RN renderer, no native-module mocking theater) — appropriate
// here because this suite must never attempt to load the real
// react-native-quick-crypto JSI/Nitro binding (that gate is on-device Maestro
// in 05-04). Scoped via testMatch to src/__tests__ only so no other test type
// accidentally runs under this config.
//
// moduleFileExtensions pins the resolver to prefer .web.ts, mirroring
// apps/web/next.config.ts (turbopack.resolveExtensions) and
// apps/web/vitest.config.ts (resolve.extensions) — so "./crypto" always lands
// on crypto.web.ts and crypto.native.ts can NEVER be resolved into this Node
// jest run, regardless of any future change to jest-expo's platform defaults.
// Jest's moduleFileExtensions are specified WITHOUT leading dots.
module.exports = {
  preset: "jest-expo/node",
  rootDir: __dirname,
  testMatch: ["<rootDir>/src/__tests__/**/*.test.ts"],
  moduleFileExtensions: ["web.ts", "web.tsx", "ts", "tsx", "js", "jsx", "json"],
};
