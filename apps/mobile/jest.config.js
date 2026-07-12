// jest-expo scoped to the shared pure-TS core ONLY (D-05 correction).
// The "node" preset variant runs in a plain Node test environment (no RN
// renderer, no native-module mocking theater) — appropriate here because
// this suite must never attempt to load the real react-native-quick-crypto
// JSI/Nitro binding (that gate is on-device Maestro in 05-04). Scoped via
// testMatch to src/__tests__ only so no other test type accidentally runs
// under this config.
module.exports = {
  preset: "jest-expo/node",
  rootDir: __dirname,
  testMatch: ["<rootDir>/src/__tests__/**/*.test.ts"],
};
