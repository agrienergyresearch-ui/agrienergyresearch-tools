const CACHE_NAME = "coolant-correction-pwa-v1.2";

// Cache the “app shell” so it loads offline.
// (We do NOT cache the APK by default — it’s large and unnecessary for offline use.)
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key))))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Only handle same-origin requests (avoid caching CDNs, analytics, etc.)
  if (url.origin !== self.location.origin) return;

  // Network-first for HTML so updates show up on Android quickly
  const isHTML =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html") ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html");

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Update cache with latest HTML
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  // Network-first for APK so students always get the newest file.
  if (url.pathname.endsWith(".apk")) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // Cache-first for everything else (icons, manifest, etc.)
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
