// Point Fighter offline support.
// The game page and its scripts are fetched fresh whenever there's internet (so updates arrive on the next open)
// and served from the saved copy when offline. Icons and fonts are saved the first time they load.
const CACHE = 'point-fighter-v3';
const CORE = ['./', 'index.html', 'game.js', 'fighters.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon-180.png', 'icons/favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/') || url.pathname.endsWith('.js');
  if (isPage) {
    // network first: newest game when online, saved copy when offline
    const key = url.pathname.endsWith('.js') ? url.pathname.split('/').pop() : 'index.html';
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); return res;
    }).catch(() => caches.match(key)));
    return;
  }
  // everything else (icons, fonts): saved copy first, fetch and save if missing
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
