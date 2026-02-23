const CACHE_NAME = 'polish-master-v19.1';
const CORE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js'
];

// 1. Install & Cache Core Assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(CORE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// 2. Clean Up Old Caches on Activation
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

// 3. Smart Fetching Strategy
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    // STRATEGY A: Network-First for JSON phrase files (so new files appear instantly)
    if (event.request.url.includes('phrases_') && event.request.url.includes('.json')) {
        event.respondWith(
            fetch(event.request).then(response => {
                // Only cache successful 200 OK responses (ignore 404s from the scanner)
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => {
                // Offline fallback
                return caches.match(event.request);
            })
        );
        return;
    }

    // STRATEGY B: Cache-First for the UI and Confetti
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) return cachedResponse;
            
            return fetch(event.request).then(networkResponse => {
                if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return networkResponse;
            }).catch(() => {
                // Failsafe for offline without cached asset
                return null; 
            });
        })
    );
});
