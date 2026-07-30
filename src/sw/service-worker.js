/*
 * Dobze offline worker.
 *
 * `scripts/vite-plugin-offline.ts` replaces the two tokens below at build time
 * with the build id and the complete list of files the build ships. Everything
 * in that list is stored during `install`, so once the worker reaches
 * `activated` the app is fully offline: launching, reviewing, browsing the
 * word list, and changing settings never touch the network again.
 *
 * Because assets carry content hashes, a new deploy produces a new build id,
 * a new cache, and a fresh precache — no stale-asset repair logic is needed.
 */
const BUILD_ID = '__DOBZE_BUILD_ID__';
const PRECACHE = __DOBZE_PRECACHE__;

const CACHE = `dobze-app-${BUILD_ID}`;
const SHELL = './index.html';

/*
 * Static hosts commonly answer with `Vary: Origin`, and the browser sends an
 * `Origin` header for the `crossorigin` module scripts Vite emits but not for
 * the worker's own precache fetches. Without `ignoreVary` every one of those
 * chunks would miss the cache and the app would come up blank offline.
 * Ignoring it is safe here: entries are keyed by content-hashed URLs that have
 * no per-origin variants.
 */
const MATCH = { ignoreVary: true };

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // `reload` bypasses the HTTP cache so an install can never store a stale asset.
    await cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith('dobze-app-') && key !== CACHE)
        .map((key) => caches.delete(key)),
    );
    // Claiming here is what makes `navigator.serviceWorker.controller` non-null,
    // which the app reads as "the precache finished, you are offline-ready".
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(request.mode === 'navigate' ? handleNavigation(request) : handleAsset(request));
});

/**
 * Every route in Dobze is a hash route, so one cached shell answers all of
 * them. Serving it cache-first keeps launches instant and identical whether
 * the device is online, offline, or on a captive-portal Wi-Fi that resolves
 * but never answers.
 */
async function handleNavigation(request) {
  const cache = await caches.open(CACHE);
  const shell = await cache.match(SHELL, MATCH);
  if (shell) return shell;

  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(SHELL, response.clone());
    return response;
  } catch {
    return notInstalledResponse();
  }
}

async function handleAsset(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, MATCH);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    // Anything not in the precache manifest (a future asset, a source map a
    // devtools session asks for) still gets stored on first success.
    if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

/** Only reachable if the very first visit is interrupted before install finishes. */
function notInstalledResponse() {
  return new Response(
    '<!doctype html><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    + '<title>Dobze</title>'
    + '<body style="margin:0;display:grid;place-items:center;min-height:100dvh;background:#F4EFE6;color:#1F1A14;font:italic 17px/1.5 Georgia,serif;padding:32px;text-align:center">'
    + '<p>Dobze has not finished downloading yet.<br>Reconnect once and it will work offline from then on.</p>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}
