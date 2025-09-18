// --- CONFIGURACIÓN DEL CACHÉ ---
// Versión del caché. Cámbiala cada vez que actualices los archivos de la app (app shell).
const STATIC_CACHE_VERSION = 'static-v1';
const DYNAMIC_CACHE_VERSION = 'dynamic-v1';

// Archivos base de la aplicación que siempre deben estar en caché.
const APP_SHELL_URLS = [
  './', // Directorio raíz
  './index.html',
  './manifest.json',
  './icon-192x192.PNG',
  './icon-512x512.PNG'
  // No es necesario cachear este archivo sw.js, el navegador lo gestiona.
];

// --- FASE DE INSTALACIÓN ---
// Se dispara cuando el navegador instala el Service Worker.
self.addEventListener('install', event => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE_VERSION)
      .then(cache => {
        console.log('[SW] Pre-caching del App Shell...');
        return cache.addAll(APP_SHELL_URLS);
      })
  );
  // Forzamos al nuevo SW a tomar el control inmediatamente.
  self.skipWaiting();
});


// --- FASE DE ACTIVACIÓN ---
// Se dispara cuando el Service Worker se activa.
self.addEventListener('activate', event => {
  console.log('[SW] Activando Service Worker...');
  const cacheWhitelist = [STATIC_CACHE_VERSION, DYNAMIC_CACHE_VERSION];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Si el caché no está en nuestra "lista blanca", lo eliminamos.
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[SW] Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Tomamos el control de todas las pestañas abiertas.
  return self.clients.claim();
});


// --- FASE DE FETCH (CAPTURA DE SOLICITUDES) ---
// Se dispara cada vez que la aplicación realiza una solicitud de red (fetch).
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // ESTRATEGIA 1: Stale-While-Revalidate para CDNs y Fuentes de Google
  // Ideal para recursos que pueden actualizarse pero que queremos servir rápido.
  if (url.hostname === 'cdn.tailwindcss.com' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'cdnjs.cloudflare.com') {
    event.respondWith(staleWhileRevalidate(request));
  }
  // ESTRATEGIA 2: Cache First para nuestro App Shell
  // Ideal para los archivos base de la app que no cambian a menudo.
  else if (APP_SHELL_URLS.includes(url.pathname.substring(url.pathname.lastIndexOf('/') + 1)) || url.pathname.endsWith('/')) {
    event.respondWith(cacheFirst(request));
  }
  // ESTRATEGIA 3: Network First para todo lo demás (por defecto)
  // Intenta obtener la versión más reciente, pero si no hay red, usa el caché.
  else {
    event.respondWith(networkFirst(request));
  }
});


// --- FUNCIONES DE ESTRATEGIAS DE CACHÉ ---

// Estrategia: Cache First
function cacheFirst(request) {
  return caches.match(request)
    .then(response => {
      // Si está en caché, lo devolvemos. Si no, lo buscamos en la red.
      return response || fetchAndCache(request, DYNAMIC_CACHE_VERSION);
    });
}

// Estrategia: Network First
function networkFirst(request) {
  return fetchAndCache(request, DYNAMIC_CACHE_VERSION)
    .catch(() => caches.match(request)); // Si falla la red, buscamos en el caché.
}

// Estrategia: Stale-While-Revalidate
function staleWhileRevalidate(request) {
  return caches.open(DYNAMIC_CACHE_VERSION).then(cache => {
    return cache.match(request).then(response => {
      // 1. Hacemos la petición a la red en segundo plano
      const fetchPromise = fetch(request).then(networkResponse => {
        // Si la petición es exitosa, actualizamos el caché
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      });

      // 2. Devolvemos la respuesta del caché si existe, si no, esperamos la de la red.
      return response || fetchPromise;
    });
  });
}

// Función auxiliar para hacer fetch y guardar en caché dinámico.
function fetchAndCache(request, cacheName) {
    return fetch(request).then(response => {
        // Solo cacheamos respuestas válidas
        if (response.ok) {
            caches.open(cacheName).then(cache => {
                cache.put(request, response.clone());
            });
        }
        return response;
    });
}