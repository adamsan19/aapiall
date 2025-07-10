const CACHE_NAME = "video-pwa-v2"
const STATIC_CACHE = "static-v2"
const DYNAMIC_CACHE = "dynamic-v2"
const IMAGE_CACHE = "images-v2"
const API_CACHE = "api-v2"

// Static assets to cache
const staticAssets = ["/", "/search", "/popular", "/recent", "/manifest.json", "/placeholder.svg"]

// Cache strategies
const cacheStrategies = {
  static: "cache-first",
  api: "network-first",
  images: "cache-first",
  dynamic: "stale-while-revalidate",
}

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([caches.open(STATIC_CACHE).then((cache) => cache.addAll(staticAssets)), self.skipWaiting()]),
  )
})

// Activate event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              if (
                cacheName !== CACHE_NAME &&
                cacheName !== STATIC_CACHE &&
                cacheName !== DYNAMIC_CACHE &&
                cacheName !== IMAGE_CACHE &&
                cacheName !== API_CACHE
              ) {
                return caches.delete(cacheName)
              }
            }),
          )
        }),
      self.clients.claim(),
    ]),
  )
})

// Fetch event with advanced caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== "GET") return

  // Handle different types of requests
  if (url.pathname.startsWith("/api/")) {
    // API requests - Network first with cache fallback
    event.respondWith(handleApiRequest(request))
  } else if (isImageRequest(request)) {
    // Image requests - Cache first with network fallback
    event.respondWith(handleImageRequest(request))
  } else if (isStaticAsset(request)) {
    // Static assets - Cache first
    event.respondWith(handleStaticRequest(request))
  } else {
    // Dynamic content - Stale while revalidate
    event.respondWith(handleDynamicRequest(request))
  }
})

// API request handler
async function handleApiRequest(request) {
  const cacheName = API_CACHE
  const cache = await caches.open(cacheName)

  try {
    // Try network first
    const networkResponse = await fetch(request.clone(), {
      headers: {
        ...request.headers,
        "Cache-Control": "no-cache",
      },
    })

    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone())
      return networkResponse
    }
  } catch (error) {
    console.log("Network failed, trying cache:", error)
  }

  // Fallback to cache
  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  // Return offline response
  return new Response(
    JSON.stringify({
      error: "Offline",
      message: "No network connection and no cached data available",
    }),
    {
      status: 503,
      headers: { "Content-Type": "application/json" },
    },
  )
}

// Image request handler
async function handleImageRequest(request) {
  const cacheName = IMAGE_CACHE
  const cache = await caches.open(cacheName)

  // Try cache first
  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  try {
    // Fetch from network
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      // Cache the image
      cache.put(request, networkResponse.clone())
      return networkResponse
    }
  } catch (error) {
    console.log("Image fetch failed:", error)
  }

  // Return placeholder image
  return fetch("/placeholder.svg?height=360&width=640")
}

// Static asset handler
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE)

  // Try cache first
  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  // Fetch from network and cache
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    return new Response("Offline", { status: 503 })
  }
}

// Dynamic content handler
async function handleDynamicRequest(request) {
  const cacheName = DYNAMIC_CACHE
  const cache = await caches.open(cacheName)

  // Get cached version
  const cachedResponse = await cache.match(request)

  // Fetch from network in background
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => null)

  // Return cached version immediately if available
  if (cachedResponse) {
    // Update cache in background
    networkPromise.catch(() => {})
    return cachedResponse
  }

  // Wait for network if no cache
  return networkPromise || new Response("Offline", { status: 503 })
}

// Helper functions
function isImageRequest(request) {
  return request.destination === "image" || /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(new URL(request.url).pathname)
}

function isStaticAsset(request) {
  const url = new URL(request.url)
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/static/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff")
  )
}

// Background sync for failed requests
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  // Retry failed API requests
  const cache = await caches.open(API_CACHE)
  const requests = await cache.keys()

  for (const request of requests) {
    try {
      const response = await fetch(request)
      if (response.ok) {
        await cache.put(request, response)
      }
    } catch (error) {
      console.log("Background sync failed for:", request.url)
    }
  }
}

// Push notifications
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: "/placeholder.svg?height=192&width=192",
      badge: "/placeholder.svg?height=72&width=72",
      vibrate: [100, 50, 100],
      data: data.data,
      actions: [
        {
          action: "explore",
          title: "Explore",
          icon: "/placeholder.svg?height=32&width=32",
        },
        {
          action: "close",
          title: "Close",
          icon: "/placeholder.svg?height=32&width=32",
        },
      ],
    }

    event.waitUntil(self.registration.showNotification(data.title, options))
  }
})

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("/"))
  }
})
