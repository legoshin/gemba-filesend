// Minimal service worker for PWA installability + offline fallback for the
// app shell. We deliberately keep this tiny: the actual upload/download flow
// needs a live network, so trying to cache /api/* or /download/* would be
// misleading. We only cache the static shell so the user gets a fast first
// paint when they re-open the app — and a graceful offline screen otherwise.
//
// The version literal forces a fresh install whenever this file changes.
const VERSION = "v1";
const SHELL_CACHE = `gemba-shell-${VERSION}`;

// Routes worth pre-warming. Kept small — Next.js fingerprints the rest of the
// JS/CSS and the SW catches those lazily via the runtime fetch handler.
const SHELL_URLS = [
  "/",
  "/upload",
  "/download",
  "/manifest.webmanifest",
  "/logo.svg",
  "/logo-dark.svg",
  "/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.addAll(SHELL_URLS).catch(() => {
        // Best-effort: if any url 404s on a particular deploy, don't block
        // installation of the SW.
      });
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("gemba-shell-") && k !== SHELL_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never intercept API calls or the Blob CDN — they need fresh responses,
  // counters, and bytes that must come from the network. Caching them would
  // break uploads/downloads and the auto-deletion behaviour.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Stale-while-revalidate for the app shell so navigating between Upload
  // and Download is instant after first load.
  event.respondWith(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then(async (resp) => {
          if (resp.ok && resp.type === "basic") {
            cache.put(req, resp.clone()).catch(() => {});
          }
          return resp;
        })
        .catch(() => null);

      if (cached) {
        // kick off revalidation in the background and return the cached copy
        network.catch(() => {});
        return cached;
      }
      const fresh = await network;
      if (fresh) return fresh;
      // Last-resort offline fallback for navigation requests.
      if (req.mode === "navigate") {
        const home = await cache.match("/");
        if (home) return home;
      }
      return new Response("Offline", { status: 503, statusText: "Offline" });
    })(),
  );
});
