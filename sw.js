// Aumentamos la versión para forzar la actualización del Service Worker
const CACHE_NAME = 'music-player-cache-v3'; 

// Lista de archivos con las rutas completas y correctas para GitHub Pages
const urlsToCache = [
  '/Reproductor-de-musica/',
  '/Reproductor-de-musica/index.html',
  '/Reproductor-de-musica/manifest.json',
  '/Reproductor-de-musica/icon-192x192.PNG',
  '/Reproductor-de-musica/icon-512x512.PNG'
];

// Evento 'install': se dispara cuando el Service Worker se instala.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto y precargando archivos base');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // Forza al nuevo SW a activarse inmediatamente
});

// Evento 'activate': se dispara cuando el Service Worker se activa.
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
  return self.clients.claim(); // Toma control de las páginas abiertas
});

// Evento 'fetch': Estrategia "Network falling back to cache".
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    // Intenta obtener el recurso de la red primero
    fetch(event.request)
      .then(networkResponse => {
        // Si la respuesta de la red es exitosa, la almacenamos en caché y la devolvemos
        if (networkResponse && networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Si la red falla (estamos offline), busca en la caché
        console.log('Fallo de red. Sirviendo desde caché para:', event.request.url);
        return caches.match(event.request);
      })
  );
});
