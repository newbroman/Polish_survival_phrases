const CACHE_NAME = 'polish-phrase-master-v1031';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './service-worker.js',
  './icon-192.png',
  './icon-512.png',
  './phrases_0.json',
  './phrases_1.json',
  './phrases_2.json',
  './phrases_3.json',
  './phrases_4.json',
  './phrases_5.json',
  './phrases_6.json',
  './phrases_7.json',
  './phrases_8.json',
  './phrases_9.json',
  './phrases_10.json',
  './phrases_11.json',
  './phrases_12.json',
  './phrases_13.json',
  './phrases_14.json',
  './phrases_15.json',
  './phrases_16.json',
  './phrases_17.json',
  './phrases_18.json',
  './phrases_19.json',
  './phrases_20.json',
  './phrases_21.json',
  './phrases_22.json',
  './phrases_23.json',
  './phrases_24.json',
  './phrases_25.json',
  './phrases_26.json',
  './phrases_27.json',
  './phrases_28.json',
  './phrases_29.json'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache first, then network.
// For phrase files, also cache on first fetch (runtime caching) as a safety net.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Clone and store runtime-cached responses for phrase files
        const url = new URL(event.request.url);
        if (url.pathname.includes('phrases_') && response && response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      });
    })
  );
});
