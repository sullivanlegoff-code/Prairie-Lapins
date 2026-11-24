// Prairie Lapins — the service worker of the published game (plan 5.5, 23 November 2026). Written into the site by
// scripts/build-pages.mjs, which replaces __REVISION__ with the build's revision; never into the laboratory (`dev/`).
// It keeps the game's pictures and code files (under `assets/`) once downloaded, so a visit no longer asks the server again for
// each of them. Every publication has its own cache: the new one starts empty and the old one is deleted, so a redrawn picture
// shows at the first visit after it is published. Pages, music (read by ranges), the laboratory and other sites are left alone.
const CACHE = 'prairie-lapins-__REVISION__';
const scope = new URL(self.registration.scope);
const assets = scope.pathname + 'assets/';
const cached = request => {
  if (request.method !== 'GET' || request.headers.has('range')) return false;
  const url = new URL(request.url);
  return url.origin === scope.origin && url.pathname.startsWith(assets) && !url.pathname.startsWith(assets + 'audio/');
};
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('prairie-lapins-') && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (!cached(event.request)) return;
  event.respondWith(caches.open(CACHE).then(cache => cache.match(event.request).then(hit => hit ?? fetch(event.request).then(response => {
    if (response.ok && response.type === 'basic') void cache.put(event.request, response.clone()).catch(() => {});
    return response;
  }))));
});
