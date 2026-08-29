const CACHE = 'financas-diarias-v1'
const STATIC = ['/', '/manifest.webmanifest']
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(STATIC))))
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/') || event.request.method !== 'GET') return
  event.respondWith(fetch(event.request).then(response => {
    const clone = response.clone()
    caches.open(CACHE).then(cache => cache.put(event.request, clone))
    return response
  }).catch(() => caches.match(event.request).then(r => r || caches.match('/'))))
})
