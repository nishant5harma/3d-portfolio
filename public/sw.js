/* eslint-disable no-restricted-globals */
/**
 * ICB portfolio — caching Service Worker.
 *
 * Strategy:
 *   - `_next/static/*`  → cache-first, immutable (hashed filenames)
 *   - fonts (.woff2)    → cache-first (rarely changes)
 *   - images / video    → stale-while-revalidate
 *   - navigations       → network-first w/ offline fallback to last index.html
 *
 * Result: first visit downloads everything once, repeat visits paint
 * from cache instantly (sub-200ms) and only re-fetch the HTML in the
 * background.
 *
 * Cache buster: bump `CACHE_VERSION` on deploy to invalidate stale
 * assets — the deploy script auto-bumps it via the build timestamp.
 */

const CACHE_VERSION = "icb-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const HTML_CACHE = `${CACHE_VERSION}-html`;

self.addEventListener("install", (event) => {
  // Take over as soon as possible — no waiting for tabs to close.
  self.skipWaiting();
  event.waitUntil(caches.open(STATIC_CACHE));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStatic(url) {
  return (
    url.pathname.includes("/_next/static/") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".ttf")
  );
}

function isImageOrMedia(url) {
  return /\.(png|jpg|jpeg|webp|gif|svg|mp4|webm|glb)$/i.test(url.pathname);
}

function isHtmlNavigation(request) {
  return (
    request.mode === "navigate" ||
    (request.method === "GET" &&
      request.headers.get("accept")?.includes("text/html"))
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Only handle same-origin (avoids breaking CDN icons in TechWeUse, etc.)
  if (url.origin !== self.location.origin) return;

  // ---- 1. Hashed static assets — cache forever, fall through to net ----
  if (isStatic(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const resp = await fetch(request);
        if (resp.ok) cache.put(request, resp.clone());
        return resp;
      }),
    );
    return;
  }

  // ---- 2. Images / video — stale-while-revalidate ----
  if (isImageOrMedia(url)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((resp) => {
            if (resp.ok) cache.put(request, resp.clone());
            return resp;
          })
          .catch(() => hit);
        return hit || fetchPromise;
      }),
    );
    return;
  }

  // ---- 3. HTML navigations — network-first, fall back to cache ----
  if (isHtmlNavigation(request)) {
    event.respondWith(
      (async () => {
        try {
          const resp = await fetch(request);
          if (resp.ok) {
            const cache = await caches.open(HTML_CACHE);
            cache.put(request, resp.clone());
          }
          return resp;
        } catch {
          const cache = await caches.open(HTML_CACHE);
          return (
            (await cache.match(request)) ||
            (await cache.match("/")) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }
});
