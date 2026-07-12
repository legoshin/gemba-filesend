import path from "node:path";
import type { NextConfig } from "next";

// Pragmatic, enforced Content-Security-Policy (not nonce-based, not
// Report-Only) — see .planning/phases/04-security-reliability-test-hardening
// D-04/D-05/D-06. 'unsafe-inline' on script-src/style-src is a deliberate,
// documented acceptance: the next-themes no-flash script and the /sw.js
// registration script (src/app/layout.tsx) are inline, and nonce-based CSP
// (D-07) is deferred to a future hardening milestone.
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.blob.vercel-storage.com",
  "connect-src 'self' https://*.blob.vercel-storage.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
];

const nextConfig: NextConfig = {
  // Pin the workspace root explicitly (05-01 monorepo move): this app now
  // lives at apps/web inside an npm-workspaces monorepo, so Turbopack's
  // automatic lockfile-based root inference can walk past the repo root
  // into an unrelated ancestor directory that happens to have its own
  // lockfile. The root must be the monorepo root (not apps/web itself) —
  // npm workspaces hoists `next` and other deps to the root node_modules,
  // so Turbopack needs the wider root to resolve them.
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspDirectives.join("; "),
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
