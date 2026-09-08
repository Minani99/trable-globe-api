const SHELL_CACHE = "travel-globe-shell-v2";
const OFFLINE_ROUTES = ["/offline", "/offline/trip"];
const SHELL_FILES = ["/icon.svg", "/icon-192.png", "/icon-512.png"];

async function cacheOfflineShell() {
  const cache = await caches.open(SHELL_CACHE);
  await cache.addAll(SHELL_FILES);

  for (const route of OFFLINE_ROUTES) {
    const response = await fetch(route, { cache: "reload" });
    if (!response.ok) continue;
    await cache.put(route, response.clone());
    const html = await response.text();
    const assets = [...html.matchAll(/(?:src|href)="([^\"]*\/_next\/static\/[^\"]+)"/g)]
      .map((match) => new URL(match[1], self.location.origin).toString());
    await Promise.all([...new Set(assets)].map(async (asset) => {
      const assetResponse = await fetch(asset, { cache: "reload" });
      if (assetResponse.ok) await cache.put(asset, assetResponse);
    }));
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheOfflineShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith("travel-globe-shell-") && key !== SHELL_CACHE)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => {
      return (await caches.match(request)) || (await caches.match("/offline")) || Response.error();
    }));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icon-") || url.pathname === "/icon.svg") {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        void caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    })));
  }
});
