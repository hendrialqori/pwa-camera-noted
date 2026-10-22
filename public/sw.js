
const CACHE_NAME = "camera-notes-v2";
const CACHE_PREFIX = "camera-notes-";

const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
];

// INSTALL: Simpan resource utama PWA
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(APP_SHELL)
    )
  );

  self.skipWaiting();
});

// ACTIVATE: Hapus hanya cache milik Camera Notes
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith(CACHE_PREFIX) &&
              key !== CACHE_NAME
          )
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

// FETCH: Cache hanya resource aplikasi sendiri
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Hanya request GET
  if (request.method !== "GET") return;

  // Jangan intercept request eksternal
  if (url.origin !== self.location.origin) return;

  // Jangan cache resource Firebase Service Worker
  if (url.pathname === "/firebase-messaging-sw.js") return;

  // Jangan cache API
  if (url.pathname.startsWith("/api/")) return;

  // Untuk navigasi halaman: network-first
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE_NAME);

          return (
            (await cache.match(request)) ||
            (await cache.match("/")) ||
            Response.error()
          );
        }
      })()
    );

    return;
  }

  // Cache hanya aset statis yang sesuai
  const isStaticAsset =
    url.pathname.startsWith("/assets/") ||
    /\.(js|css|png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(
      url.pathname
    );

  if (!isStaticAsset) return;

  // Strategi network-first agar kode terbaru diprioritaskan
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        const response = await fetch(request);

        // Simpan hanya response sukses
        if (response.ok) {
          await cache.put(request, response.clone());
        }

        return response;
      } catch {
        return (
          (await cache.match(request)) ||
          Response.error()
        );
      }
    })()
  );
});
