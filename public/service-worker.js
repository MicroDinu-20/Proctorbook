const CACHE_NAME = "pwa-cache-v3"; 
const API_CACHE_NAME = "api-cache";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/offline.html",
  "/css/styles.css",
  "/js/studentDashboard.js",
  "/studentDashboard",
  "/proctorDashboard",
  "/adminDashboard",
  "/login.html"
];

// ✅ Ensure service worker takes control immediately
self.addEventListener("activate", (event) => {
    console.log("🛠 Service Worker Activated");
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME && key !== API_CACHE_NAME)
                    .map((key) => {
                        console.log(`🗑 Removing old cache: ${key}`);
                        return caches.delete(key);
                    })
            );
        })
    );

    event.waitUntil(self.clients.claim().then(async () => {
        const clients = await self.clients.matchAll({ type: "window" });
        clients.forEach(client => client.postMessage({ action: "forceRefresh" }));
    }));
});

// ✅ Install Event - Cache essential assets
self.addEventListener("install", (event) => {
    console.log("🔹 Service Worker Installing...");
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("✅ Caching assets...");
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// ✅ Handle Messages Properly
self.addEventListener("message", (event) => {
    console.log("📩 Received message in service worker:", event.data);
    if (event.data.action === "forceRefresh") {
        self.clients.matchAll().then((clients) => {
            clients.forEach(client => client.navigate(client.url));
        });
    }
});

// ✅ Fetch Event
self.addEventListener("fetch", (event) => {
    const requestURL = new URL(event.request.url);

    // 🔹 Bypass cache for login/logout
    if (requestURL.pathname.includes("/login.html") || requestURL.pathname.includes("/logout")) {
        event.respondWith(fetch(event.request, { cache: "no-store" }));
        return;
    }

    // 🔹 Always fetch fresh dashboard pages
    if (["/adminDashboard", "/proctorDashboard", "/studentDashboard"].some(path => requestURL.pathname.includes(path))) {
        event.respondWith(fetch(event.request));
        return;
    }

    // 🔹 Google Drive Image Handling
    if (requestURL.hostname.includes("drive.google.com")) {
        const fileId = requestURL.searchParams.get("id");
        if (fileId) {
            event.respondWith(fetch(`https://lh3.googleusercontent.com/d/${fileId}`));
        }
        return;
    }

    // 🔹 Cache First for Images
    if (event.request.destination === "image") {
        event.respondWith(
            caches.match(event.request).then((cachedImage) => {
                return cachedImage || fetch(event.request).then((networkResponse) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                }).catch(() => caches.match("/offline-image.jpg"));
            })
        );
        return;
    }

    // 🔹 Network First for API Calls
    if (requestURL.pathname.includes("/api/")) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === "opaque") {
                        return networkResponse;
                    }
                    return caches.open(API_CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                })
                .catch(() => caches.match(event.request) || caches.match("/offline.html"))
        );
        return;
    }

    // 🔹 Cache First for Static Files
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request).catch(() => {
                if (event.request.destination === "document") {
                    return caches.match("/offline.html");
                }
            });
        })
    );
});
