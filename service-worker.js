const CACHE_NAME = 'polish-phrase-master-v2000';
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

/ 1. Install Service Worker
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. Activate & Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. Fetch Strategy: Stale-While-Revalidate for JSON, Cache-First for others
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Dynamic Caching for JSON Level files
    if (url.pathname.endsWith('.json')) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return fetch(event.request).then((networkResponse) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                }).catch(() => {
                    return cache.match(event.request);
                });
            })
        );
    } else {
        // Cache-First for app shell (HTML, Images, JS)
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request);
            })
        );
    }
});
