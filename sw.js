const CACHE_NAME = "apoyogastos-shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(req);
        if (networkResponse && networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === "navigate") {
          const fallback = await caches.match("./");
          if (fallback) return fallback;
        }
        throw err;
      }
    })()
  );
});
