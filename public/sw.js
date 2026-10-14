const CACHE_NAME = "hdak-chatbot-cache-v2";
const urlsToCache = [
  "/",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", event => {
  // Never intercept API requests: chat and health checks must always reach the server.
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Never intercept Next.js internals: HMR, RSC, and client chunks need direct
  // network access during preview refreshes and must not be served by this SW.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/trpc/") ||
    url.pathname.startsWith("/_next/")
  )
    return;

  // Prefer fresh app documents and assets so an old preview cannot keep rendering
  // a previous theme or stale client bundle. Fall back to cache only offline.
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Never cache Next.js chunks. Serving an old client bundle after HMR can
        // dispatch router actions before the current App Router is initialized.
        if (response.ok && event.request.mode === "navigate") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then(response => response || Response.error()))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
});
