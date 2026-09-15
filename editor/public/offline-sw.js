const CACHE = "archify-editor-offline-dev";
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(["./offline.html", "./offline.webmanifest"]))));
self.addEventListener("activate", (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("archify-editor-offline-") && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (event) => { if (event.request.method !== "GET") return; event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((result) => { const copy = result.clone(); caches.open(CACHE).then((cache) => cache.put(event.request, copy)); return result; }))); });
