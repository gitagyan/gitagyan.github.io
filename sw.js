const CACHE_NAME = '1.3.1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/app.js',
    '/manifest.json',
    '/favicon.ico',
    '/images/icon-192.png',
    '/images/icon-512.png',
    '/images/app-icon.png',
    '/images/navbar-logo.png',
    '/images/yellow_bg.png',
    '/images/SarthiAI.png',
    '/images/krishna-and-arjuna.jpg',
    '/images/screenshots/pwa-instructions-ios/IMG_6677.PNG',
    '/images/screenshots/pwa-instructions-ios/IMG_6678.PNG',
    '/images/screenshots/pwa-instructions-ios/IMG_6679.PNG',
    '/images/screenshots/pwa-instructions-ios/IMG_6680.PNG',
    '/images/screenshots/pwa-instructions-ios/IMG_6681.PNG',
    '/images/screenshots/pwa-instructions-android/android-1.png',
    '/images/screenshots/pwa-instructions-android/android-2.png',
    '/images/screenshots/pwa-instructions-android/android-3.png',
    '/images/screenshots/pwa-instructions-android/android-4.png',
    '/assets/gita.db',
    '/js/sql-wasm.js',
    '/js/sql-wasm.wasm',
    'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/js/all.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js'
];

// Install SW
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// Fetch with dynamic caching for audio files
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // For audio files, use a network-first strategy
    if (url.pathname.startsWith('/assets/verse_recitation/') && url.pathname.endsWith('.mp3')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return fetch(event.request).then(response => {
                    // If fetch is successful, cache the response and return it
                    if (response.status === 200) {
                        cache.put(event.request, response.clone());
                    }
                    return response;
                }).catch(() => {
                    // If fetch fails (e.g., offline), try to get it from the cache
                    return cache.match(event.request);
                });
            })
        );
    } else {
        // For all other requests, use a cache-first strategy
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request);
            })
        );
    }
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