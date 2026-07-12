import path from "node:path";
import { defineConfig } from "vitest/config";

// Node test environment: crypto/redis/metadata logic under test runs
// server-side against Node's built-in globalThis.crypto.subtle (Node 18+),
// no jsdom, no Web Crypto polyfill (D-12).
const config = defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Mirror next.config.ts's turbopack.resolveExtensions (05-02, D-02): Node-
    // env Vitest must also prefer .web.ts so @gemba/crypto's web adapter is
    // exercised, never a future native-only adapter.
    extensions: [
      ".web.ts",
      ".web.tsx",
      ".tsx",
      ".ts",
      ".jsx",
      ".js",
      ".mjs",
      ".json",
    ],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

export default config;
