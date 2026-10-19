// Self-destructing service worker.
//
// An earlier version of this file cached dev JS chunks with a stale
// cache-first strategy. In Next.js dev mode, chunk URLs aren't always
// content-hashed per edit, so that old worker kept serving pre-edit JS
// forever — even after reloading — because the browser only re-checks a
// service worker's own script for byte-level changes, never the app code
// running "inside" it. Reloading the page re-ran the SAME stale cached JS,
// which had no idea it needed to clean itself up.
//
// This file's content differs from the old one, so browsers WILL detect
// the change on next launch/navigation, install this version, and it wipes
// every cache, unregisters itself, and forces open tabs to do a real
// reload — fully independent of whatever JS was stuck running before.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});
