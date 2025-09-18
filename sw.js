const CACHE_NAME = 'music-player-cache-v5'; // Incrementa la versión

// ✅ Rutas explícitas para máxima fiabilidad del modo offline
const urlsToCache = [
  '/Reproductor-de-musica/',
  '/Reproductor-de-musica/index.html',
  '/Reproductor-de-musica/manifest.json',
  '/Reproductor-de-musica/sw.js',
  '/Reproductor-de-musica/icon-192x192.PNG',
  '/Reproductor-de-musica/icon-512x512.PNG'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// ...el resto de tu sw.js...
