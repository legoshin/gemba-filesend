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
        ],
      },
    ];
  },
};

export default nextConfig;
