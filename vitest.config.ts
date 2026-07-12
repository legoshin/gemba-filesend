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
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

export default config;
