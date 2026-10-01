/* ============================================================
   Solitaire Master — Service Worker (v18 — bug fix release)
   Cache-first static shell with offline navigation fallback.
   Bumped from v17 to force already-installed clients to refetch
   the fixed index.html (header brand/stat-chip overlap fix).
   ============================================================ */

const CACHE_NAME = 'solitaire-master-v18';

const SHELL_ASSETS = [
  '/index.html',
  '/manifest.json',
  '/favicon-v17.png',
  '/favicon-v17-32.png',
  '/favicon-v17-180.png',
  '/favicon-v17-192.png',
  '/favicon-v17-512.png'
];

const OFFLINE_PAGE = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
  '<title>Solitaire Master — Offline</title>' +
  '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(130% 90% at 50% 8%,#114b38 0%,#07261c 60%,#041c15 100%);color:#eef7f0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;text-align:center;padding:24px}h1{color:#f0d285;font-size:24px;margin:0 0 10px;letter-spacing:.5px}p{margin:0;color:#b7d2c2;font-size:14px}</style>' +
  '</head><body><div><h1>Solitaire Master</h1><p>You are offline and the game shell is not cached yet. Please reconnect once to install offline play.</p></div></body></html>';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Fetch the current shell and cache every static asset.
    // allSettled: one flaky asset must never break the whole install.
    await Promise.allSettled(
      SHELL_ASSETS.map((url) => cache.add(new Request(url, { cache: 'reload' })))
    );
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.indexOf('solitaire-master-') === 0 && k !== CACHE_NAME)
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch (_e) {
    return;
  }

  // Never touch cross-origin resources — the app has no external dependencies.
  if (url.origin !== self.location.origin) return;
  // Never interfere with framework/dev-tool assets.
  if (url.pathname.indexOf('/_next') === 0) return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        // Serve the shell from cache when available…
        const cached = await cache.match('/index.html');
        if (cached) {
          // …and revalidate in the background so the cache stays fresh.
          fetch(new Request('/index.html', { cache: 'no-cache' }))
            .then((fresh) => {
              if (fresh && fresh.ok) cache.put('/index.html', fresh.clone());
            })
            .catch(() => {});
          return cached;
        }
        // …fall back to network when necessary, caching a successful shell response.
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          await cache.put('/index.html', fresh.clone());
        }
        return fresh;
      } catch (_err) {
        // Minimal offline response if the shell is unavailable.
        const cached = await cache.match('/index.html').catch(() => null);
        if (cached) return cached;
        return new Response(OFFLINE_PAGE, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    })());
    return;
  }

  // Static assets: cache-first.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;
      const fresh = await fetch(req);
      if (fresh && fresh.ok && SHELL_ASSETS.indexOf(url.pathname) !== -1) {
        await cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (_err) {
      const cached = await cache.match(req, { ignoreSearch: true }).catch(() => null);
      if (cached) return cached;
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});
