const CACHE_NAME = "constitution-assam-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/icons.js",
  "./js/storage.js",
  "./js/data-loader.js",
  "./js/search.js",
  "./js/tts.js",
  "./js/wakelock.js",
  "./js/app.js",
  "./data/laws-index.json",
  "./data/constitution.json",
  "./data/bns.json",
  "./data/bnss.json",
  "./data/bsa.json",
  "./data/ipc.json",
  "./data/crpc.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first for same-origin app assets and data; network passthrough
// (no caching) for cross-origin requests like Google Fonts, which browsers
// cache themselves.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached);
    })
  );
});
