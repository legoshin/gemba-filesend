import type { NextConfig } from "next";

// Pragmatic, enforced Content-Security-Policy (not nonce-based, not
// Report-Only) — see .planning/phases/04-security-reliability-test-hardening
// D-04/D-05/D-06. 'unsafe-inline' on script-src/style-src is a deliberate,
// documented acceptance: the next-themes no-flash script and the /sw.js
// registration script (src/app/layout.tsx) are inline, and nonce-based CSP
// (D-07) is deferred to a future hardening milestone.
//
// Framing: the app is embeddable ONLY by the trusted, user-controlled
// origin https://kyl.gemba.uk (see the frame-ancestors directive below).
// This is a deliberate, scoped clickjacking acceptance — every other
// origin is still blocked. The deny-all X-Frame-Options response header
// was removed because it can only express DENY/SAMEORIGIN and cannot
// allowlist a cross-origin embedder; the CSP frame-ancestors directive
// is now the sole framing-control mechanism.
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.blob.vercel-storage.com",
  "connect-src 'self' https://*.blob.vercel-storage.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'self' https://kyl.gemba.uk",
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
