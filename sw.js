const CACHE_NAME = '1.1.3';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/app.js',
    '/js/app-saarthi.js',
    '/manifest.json',
    '/favicon.ico',
    '/images/icon-192.png',
    '/images/icon-512.png',
    '/images/app-icon.png',
    '/images/SarthiAI.png',
    '/images/krishna-and-arjuna.jpg',
    '/assets/chapters.json',
    '/assets/verse.json',
    '/assets/verse_translation/chapter_1.json',
    '/assets/verse_translation/chapter_2.json',
    '/assets/verse_translation/chapter_3.json',
    '/assets/verse_translation/chapter_4.json',
    '/assets/verse_translation/chapter_5.json',
    '/assets/verse_translation/chapter_6.json',
    '/assets/verse_translation/chapter_7.json',
    '/assets/verse_translation/chapter_8.json',
    '/assets/verse_translation/chapter_9.json',
    '/assets/verse_translation/chapter_10.json',
    '/assets/verse_translation/chapter_11.json',
    '/assets/verse_translation/chapter_12.json',
    '/assets/verse_translation/chapter_13.json',
    '/assets/verse_translation/chapter_14.json',
    '/assets/verse_translation/chapter_15.json',
    '/assets/verse_translation/chapter_16.json',
    '/assets/verse_translation/chapter_17.json',
    '/assets/verse_translation/chapter_18.json',
    'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/js/all.min.js'
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
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version if available
                if (response) {
                    return response;
                }
                
                // For audio files, cache them after fetching
                if (event.request.url.includes('/assets/verse_recitation/') && event.request.url.endsWith('.mp3')) {
                    return fetch(event.request).then(response => {
                        // Don't cache if not a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response since it's a stream
                        const responseToCache = response.clone();
                        
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                        
                        return response;
                    });
                }
                
                // For all other requests
                return fetch(event.request);
            })
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