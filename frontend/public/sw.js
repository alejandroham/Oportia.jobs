/*
 * Service worker mínimo de Oportia.
 *
 * - Permite que Android/Chrome ofrezcan "Instalar aplicación".
 * - NO guarda la app en caché: todo se pide siempre a la red, así nunca se ve una versión vieja.
 * - Solo si no hay conexión al abrir una página, muestra /offline.html.
 */
const OFFLINE_CACHE = 'oportia-offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Solo navegaciones (abrir una página). Imágenes, scripts y API no se interceptan.
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error()))
  );
});
