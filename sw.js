const CACHE_NAME = 'anya-cache-2026.07.20.3';

const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css?v=2026.07.20.3',
  './script.js?v=2026.07.20.3',
  './firebase-config.js?v=2026.07.20.3',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isDocumentRequest =
    event.request.mode === 'navigate' ||
    event.request.destination === 'document' ||
    (requestUrl.origin === self.location.origin &&
      (requestUrl.pathname === '/' || requestUrl.pathname.endsWith('/index.html')));

  if (isDocumentRequest) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(async (networkResponse) => {
          if (networkResponse.status >= 500) {
            throw new Error(`Document request failed with ${networkResponse.status}`);
          }

          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            const cache = await caches.open(CACHE_NAME);
            await cache.put(event.request, responseToCache);
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedRequest = await caches.match(event.request);
          const cachedIndex = await caches.match('./index.html');
          return cachedRequest || cachedIndex || caches.match('./');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
