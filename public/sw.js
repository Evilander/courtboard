const CACHE_NAME = "courtboard-display-v1";
const DISPLAY_PATH_PREFIX = "/display/";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  const shouldCache =
    url.pathname.startsWith(DISPLAY_PATH_PREFIX) ||
    url.pathname.startsWith("/uploads/") ||
    url.pathname.startsWith("/_next/static/");

  if (!shouldCache) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);

      try {
        const response = await fetch(request);
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        if (cached) {
          return cached;
        }
        throw error;
      }
    }),
  );
});
