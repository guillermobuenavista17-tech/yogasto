'use strict';

const prefix = 'yogasto:' + self.registration.scope;
const cacheName = prefix + 'v1';
const assets = [
  './', './index.html', './style.css', './app.js', './manifest.json',
  './icon.svg', './apple-touch-icon.png', './icon-192.png', './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache =>
    cache.addAll(assets.map(path => new Request(path, { cache: 'reload' })))
  ));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(prefix) && key !== cacheName)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const app = await cache.match('./index.html');
      if (app) return app;
    }
    return fetch(request);
  })());
});
