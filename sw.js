const CACHE_NAME = 'tienda-pro-v2';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './db.js',
  './auth.js',
  './sync.js',
  './core.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://unpkg.com/vue@3/dist/vue.global.prod.js',
  'https://unpkg.com/dexie@4/dist/dexie.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(cacheNames => Promise.all(cacheNames.map(cacheName => cacheName !== CACHE_NAME ? caches.delete(cacheName) : null))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(response => response || fetch(event.request).then(networkResponse => {
    if (networkResponse && networkResponse.status === 200) {
      const responseToCache = networkResponse.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
    }
    return networkResponse;
  }).catch(() => caches.match('./index.html'))));
});
self.addEventListener('message', event => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });