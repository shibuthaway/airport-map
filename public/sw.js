/**
 * Airport Indoor Navigator — Service Worker
 * Strategy: Cache-First for assets, Network-First for API data
 * Enables full offline navigation after first load.
 */

const CACHE_NAME = 'airport-nav-v1';
const API_CACHE  = 'airport-api-v1';
const MAP_CACHE  = 'airport-maps-v1';

// Core app shell files to cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

// ── Install: pre-cache app shell ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![CACHE_NAME, API_CACHE, MAP_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: smart caching strategy ────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and write APIs (save/delete/login)
  if (request.method !== 'GET') return;
  if (/\/(api\/save|api\/delete|api\/login|api\/add|api\/edit)/.test(url.pathname)) return;

  // Floor maps & POI images → Cache First (rarely change)
  if (url.pathname.startsWith('/maps/') || url.pathname.startsWith('/poi-images/')) {
    event.respondWith(cacheFirst(request, MAP_CACHE));
    return;
  }

  // Read-only API calls → Network First (fresh data when online, cache fallback offline)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // App JS/CSS/HTML → Stale-While-Revalidate
  event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
});

// ── Strategies ────────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request, { signal: AbortSignal.timeout(5000) });
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    // Network failed — try cache
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ offline: true, error: 'No network' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || fetchPromise || new Response('Offline', { status: 503 });
}
