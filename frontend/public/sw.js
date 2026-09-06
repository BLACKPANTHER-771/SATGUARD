/**
 * EPOCH Field PWA Service Worker
 * Cache Strategy:
 * - HTML / App Shell: Network-First (ensures fresh JS bundle references, falls back to offline shell)
 * - Hashed JS/CSS & Static Assets: Cache-First
 * - Live APIs & Sensitive Endpoints: Strict Network-Only (No caching for IMD, Copernicus, SMS, Sync, or Incidents)
 * - Active Cache Version: epoch-field-v1 (old caches automatically purged on activate)
 */

const CACHE_VERSION = 'epoch-field-v1';
const PRECACHE_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons.svg',
  '/pwa-icon-192.svg',
  '/pwa-icon-512.svg'
];

// 1. INSTALLATION: Pre-cache static app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(PRECACHE_SHELL);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// 2. ACTIVATION: Invalidate and purge all old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_VERSION)
          .map((name) => {
            console.log(`[ServiceWorker] Purging stale cache: ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. FETCH: Strategy routing
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // STRICT NETWORK-ONLY: Never cache API endpoints, SMS gateway, Sentinel-1, or Sync operations
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/incidents') ||
    url.pathname.includes('/sync') ||
    url.pathname.includes('/sms') ||
    url.pathname.includes('/weather') ||
    url.pathname.includes('/sentinel') ||
    request.method !== 'GET'
  ) {
    // Direct network request, bypass cache completely
    event.respondWith(fetch(request));
    return;
  }

  // NAVIGATION / HTML REQUESTS: Network-First with Cache Fallback
  if (request.mode === 'navigate' || request.destination === 'document' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html')
            .then((cachedResponse) => cachedResponse || caches.match('/'));
        })
    );
    return;
  }

  // STATIC HASHED ASSETS (JS/CSS/Fonts/Icons): Cache-First with Network Fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Cache static asset
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_VERSION).then((cache) => {
          cache.put(request, responseToCache);
        });

        return networkResponse;
      }).catch((err) => {
        // Return null or offline fallback if available
        return caches.match(request);
      });
    })
  );
});
