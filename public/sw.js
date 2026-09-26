// AfriSaytu service worker: makes the app installable, keeps the app's own immutable files for a
// fast start on a slow network, and shows an offline page when there is no network at all.
// It NEVER caches pages nor data (balances, operations, customers): they belong to one user,
// must always be fresh, and must not stay on a shared phone.

const VERSION = "v1"
const STATIC_CACHE = `afrisaytu-static-${VERSION}`
const OFFLINE_URL = "/offline.html"
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

// A new version removes the files of the previous ones.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("afrisaytu-") && key !== STATIC_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

// Files whose address changes with their content: safe to keep for ever.
function isImmutableAsset(url) {
  return url.origin === self.location.origin && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/"))
}

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return

  // Pages: always from the network; the offline page only when the network is unreachable.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  // App code, styles, fonts and icons: from the cache first, then kept after the first download.
  const url = new URL(request.url)
  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
            }
            return response
          }),
      ),
    )
  }
  // Everything else (data, server actions, exports, logos of operators…): untouched, network only.
})
