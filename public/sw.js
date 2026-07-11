/**
 * Airport Indoor Navigator — Service Worker
 * Strategy: Cache-First for assets, Network-First for API data
 * Enables full offline navigation after first load.
 */

const CACHE_NAME = 'airport-nav-v2';
const API_CACHE  = 'airport-api-v2';
const MAP_CACHE  = 'airport-maps-v1'; // Keep maps cache stable (v1) so prefetch survives SW update

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

// ── Activate: clean up old app/api caches (keep maps cache!) ─────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE && k !== MAP_CACHE)
          .map((k) => {
            // Don't delete the maps cache — it has prefetched floor images
            if (k === MAP_CACHE) return Promise.resolve();
            return caches.delete(k);
          })
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: smart caching strategy ────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and write APIs (save/delete/login/upload)
  if (request.method !== 'GET') return;
  if (/\/(api\/save|api\/delete|api\/login|api\/add|api\/edit|api\/upload|api\/superadmin)/.test(url.pathname)) return;

  // Floor maps & POI images → Cache First (rarely change, must work offline)
  if (
    url.pathname.startsWith('/maps/') ||
    url.pathname.startsWith('/poi-images/') ||
    /\.(png|jpg|jpeg|webp|svg|gif)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, MAP_CACHE));
    return;
  }

  // Read-only API calls → Network First with 5s timeout, cache fallback
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
  if (cached) {
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Image not cached — return a transparent placeholder SVG so UI doesn't break
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
        <rect width="1600" height="1000" fill="#1e293b"/>
        <text x="800" y="480" text-anchor="middle" font-family="sans-serif" font-size="36" fill="#475569">
          Map loading offline...
        </text>
        <text x="800" y="530" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#64748b">
          Please open the app with internet once to cache all maps
        </text>
      </svg>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    // Network failed — try cache
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ offline: true, error: 'No network available' }), {
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

  return cached || fetchPromise || new Response('Offline — App Shell Not Cached', { status: 503 });
}
