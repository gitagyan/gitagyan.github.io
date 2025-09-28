const CACHE_NAME = 'gita-pwa-v5';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/app.js',
    '/manifest.json',
    '/images/icon-192.png',
    '/images/icon-512.png',
    '/gita-main/data/chapters.json',
    '/gita-main/data/verse.json',
    '/gita-main/data/translation.json',
    '/gita-main/data/commentary.json',
    '/gita-main/data/authors.json',
    '/gita-main/data/languages.json'
];

// Install SW
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// Fetch
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

// Activate
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
        })
    );
});