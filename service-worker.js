const CACHE_NAME = 'polish-phrase-master-v1000';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './phrases_0.json',
  './phrases_1.json',
  './phrases_2.json',
  './phrases_3.json',
  './phrases_4.json',
  './phrases_5.json',
  './phrases_6.json',
  './phrases_7.json',
  './phrases_8.json',
  './phrases_9.json'
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

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
