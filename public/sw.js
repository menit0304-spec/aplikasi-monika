// Basic Service Worker for PWA installation
const CACHE_NAME = 'hotel-monika-v1';

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through for now, but presence of this event is required for PWA
  event.respondWith(fetch(event.request));
});
