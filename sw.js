// ✅ Versión aumentada para forzar la actualización
const CACHE_NAME = 'music-player-cache-v6';

// ✅ Rutas relativas, como en tu proyecto de la panadería
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192x192.PNG',
  './icon-512x512.PNG'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto y guardando archivos base');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// ✅ Estrategia "Cache-first", como en tu proyecto de la panadería
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si el archivo está en caché, lo devolvemos
        if (response) {
          return response;
        }
        // Si no, lo buscamos en la red
        return fetch(event.request);
      })
  );
});
