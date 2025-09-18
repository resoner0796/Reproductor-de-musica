// --- CONFIGURACIÓN DEL CACHÉ ---
const STATIC_CACHE_VERSION = 'static-v2';
const DYNAMIC_CACHE_VERSION = 'dynamic-v2';

// Archivos estáticos que sí queremos cachear (app shell mínimo: icons, manifest, libs)
// NOTE: No incluimos index.html ni './' para evitar servir una versión vieja desde cache.
const APP_SHELL_URLS = [
  './manifest.json',
  './icon-192x192.PNG',
  './icon-512x512.PNG',
  // Añade aquí otros assets estáticos (CSS, fuentes locales) si los tienes
];

// --- FASE DE INSTALACIÓN ---
self.addEventListener('install', event => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE_VERSION)
      .then(cache => {
        console.log('[SW] Pre-caching del App Shell...');
        return cache.addAll(APP_SHELL_URLS);
      })
  );
  self.skipWaiting();
});

// --- FASE DE ACTIVACIÓN ---
self.addEventListener('activate', event => {
  console.log('[SW] Activando Service Worker...');
  const cacheWhitelist = [STATIC_CACHE_VERSION, DYNAMIC_CACHE_VERSION];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[SW] Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// --- UTILIDADES DE CACHÉ ---
function cacheFirst(request) {
  return caches.match(request)
    .then(response => {
      return response || fetchAndCache(request, DYNAMIC_CACHE_VERSION);
    });
}

function networkFirst(request) {
  return fetchAndCache(request, DYNAMIC_CACHE_VERSION)
    .catch(() => caches.match(request));
}

function staleWhileRevalidate(request) {
  return caches.open(DYNAMIC_CACHE_VERSION).then(cache => {
    return cache.match(request).then(response => {
      const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(()=>{});
      return response || fetchPromise;
    });
  });
}

function fetchAndCache(request, cacheName) {
    return fetch(request).then(response => {
        if (response && response.ok) {
            caches.open(cacheName).then(cache => {
                cache.put(request, response.clone());
            });
        }
        return response;
    });
}

// --- FETCH: estrategia más sensible para PWA de audio ---
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // No interceptamos peticiones 'data:' ni requests locales especiales
  if (request.url.startsWith('data:')) {
    return;
  }

  // Evitar interferir con peticiones parciales (Range) que usan audio/video
  if (request.headers && request.headers.get('range')) {
    // Directamente al fetch (sin cache).
    event.respondWith(fetch(request));
    return;
  }

  // Si es una navegación (index.html), usar networkFirst para garantizar que el index siempre sea la versión más reciente
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // CDNs / fuentes externas: stale-while-revalidate
  if (url.hostname === 'cdn.tailwindcss.com' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'cdnjs.cloudflare.com') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Archivos estáticos del app shell: cacheFirst
  const pathname = url.pathname.substring(url.pathname.lastIndexOf('/') + 1);
  if (APP_SHELL_URLS.includes(pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Por defecto: networkFirst (intenta la red, sino cache)
  event.respondWith(networkFirst(request));
});