const CACHE_NAME = "courtboard-display-v1";
const MAX_CACHE_ENTRIES = 100;
const MAX_CACHE_AGE_MS = 4 * 60 * 60 * 1000; // 4 hours

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      );
      await self.clients.claim();
    })(),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      const headers = new Headers(response.headers);
      headers.set("sw-cached-at", String(Date.now()));
      const timedResponse = new Response(await response.clone().blob(), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
      await cache.put(request, timedResponse);
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      const cachedAt = Number(cached.headers.get("sw-cached-at") || "0");
      if (cachedAt && Date.now() - cachedAt > MAX_CACHE_AGE_MS) {
        await cache.delete(request);
        return new Response("Cached data expired", { status: 504 });
      }
      return cached;
    }

    return new Response("Network unavailable", { status: 504 });
  }
}

async function pruneCache() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  if (keys.length <= MAX_CACHE_ENTRIES) {
    return;
  }

  const excess = keys.length - MAX_CACHE_ENTRIES;
  for (let i = 0; i < excess; i++) {
    await cache.delete(keys[i]);
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (
    url.pathname.startsWith("/display/") ||
    url.pathname.startsWith("/uploads/") ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(
      networkFirst(request).finally(() => {
        pruneCache();
      }),
    );
  }
});
