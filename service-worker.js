const CACHE = 'reelchk-v2';
const SHELL = [
  '/reelchk/',
  '/reelchk/index.html',
  '/reelchk/manifest.json',
  '/reelchk/icons/favicon-192.png',
  '/reelchk/icons/favicon-512.png',
  '/reelchk/icons/favicon.ico',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Instrument+Serif:ital@0;1&display=swap',
];

// Install — cache the app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      // Cache each shell asset individually so one bad/missing URL
      // (e.g. a CDN hiccup) doesn't fail the entire install, the way
      // cache.addAll() would.
      Promise.all(
        SHELL.map(url =>
          cache.add(url).catch(err => console.warn('SW precache skipped:', url, err))
        )
      )
    )
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache-first for shell, network-first for API
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always go network for Anthropic API / TMDB proxy calls
  if (url.hostname === 'api.anthropic.com' || url.hostname.endsWith('.workers.dev')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match('/reelchk/index.html'));
    })
  );
});
