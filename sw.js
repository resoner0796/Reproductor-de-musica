const CACHE_NAME = 'music-player-cache-v2'; // Incrementamos la versión para forzar la actualización
// Lista de archivos locales esenciales para el "App Shell".
const urlsToCache = [
  '/',
  'index.html',
  'manifest.json',
  // Asegúrate que las rutas a tus iconos sean correctas
  'icon-192x192.PNG',
  'icon-512x512.PNG'
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
// Se utiliza para limpiar cachés antiguas.
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
  // Ignoramos peticiones que no son GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Si la petición a la red tiene éxito, la cacheamos y la devolvemos
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // Si la petición a la red falla (estamos offline), intentamos servir desde la caché
        return caches.match(event.request);
      })
  );
});