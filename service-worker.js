/*
 * Service Worker para CMNL App
 * Estrategia: Cache-First para estáticos, Network-First para navegación.
 */

const CACHE_NAME = 'cmnl-app-v2'; // Incrementamos versión para forzar actualización
const OFFLINE_URL = 'offline.html';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json'
];

// Instalación: Precarga de recursos críticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching offline page and assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activación: Limpieza de caches antiguas y toma de control inmediata
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch: Intercepción de peticiones de red
self.addEventListener('fetch', (event) => {
  // 1. Ignorar peticiones que no sean GET
  if (event.request.method !== 'GET') return;

  // 2. CRÍTICO: No cachear el stream de audio de Icecast
  if (event.request.url.includes('icecast.teveo.cu')) {
    return;
  }

  const url = new URL(event.request.url);

  // 3. Estrategia para navegación (HTML): Network First, fallback to Offline Page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // 4. Estrategia para recursos estáticos: Stale-While-Revalidate
  // Para scripts y estilos del mismo origen
  if (url.origin === location.origin && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.png'))) {
      event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          });
          return cachedResponse || fetchPromise;
        })
      );
      return;
  }

  // Default: Network Only para todo lo demás (APIs externas, etc)
  return; 
});