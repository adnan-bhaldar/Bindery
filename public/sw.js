const CACHE_NAME = 'bindery-__BUILD_ID__'
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/icons/favicon.svg',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
]

// Install — cache static shell
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    )
    self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    )
    self.clients.claim()
})

// Fetch — cache-first for assets, network-first for API
self.addEventListener('fetch', (e) => {
    const { request } = e
    const url = new URL(request.url)

    // Skip non-GET and cross-origin
    if (request.method !== 'GET' || url.origin !== self.location.origin) return

    // Assets (JS/CSS/workers/icons) — cache first, network fallback.
    // /icons/ is included here (not just precached above) so any icon
    // that's fetched successfully at least once — including ones added
    // later that aren't in STATIC_ASSETS yet — gets opportunistically
    // cached for next time, the same way JS/CSS assets already do.
    if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
        e.respondWith(
            caches.match(request).then(cached => {
                if (cached) return cached
                return fetch(request).then(response => {
                    if (response.ok) {
                        const clone = response.clone()
                        caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
                    }
                    return response
                })
            })
        )
        return
    }

    // HTML — network first, cache fallback
    if (request.headers.get('accept')?.includes('text/html')) {
        e.respondWith(
            fetch(request).catch(() => caches.match('/index.html'))
        )
    }
})

// Background sync message
self.addEventListener('message', (e) => {
    if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
})