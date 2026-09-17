const CACHE_NAME = 'bhagvatam-v1.0.0';
const urlsToCache = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    '../js/sql-wasm.js',
    '../js/sql-wasm.wasm',
    './assets/data/bhagvatam.db',
    './manifest.json',
    './images/yellow_bg.png',
    './images/app-navbar-logo-yellow-transparent.png',
    'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/js/all.min.js'
];

// Timeline phase background images
['advent','gokula','vrindavana','venu-gita','govardhana','rasa','mathura','uddhava','dwarka-founding','rukmini-wedding','queens-conquests','balarama-yatra','rajasuya','pilgrim-reunions','closing'].forEach(phase => {
    urlsToCache.push(`./images/timeline/${phase}.webp`);
});

// Install Service Worker
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch resources
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});

// Activate Service Worker and clean old caches
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
