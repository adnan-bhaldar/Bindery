const CACHE_NAME = 'bindery-v1'
const STATIC_ASSETS = [
    '/',
    '/index.html',
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

    // Assets (JS/CSS/workers) — cache first, network fallback
    if (url.pathname.startsWith('/assets/') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
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