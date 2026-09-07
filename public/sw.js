// Minimal, honest service worker: caches the static app shell so navigation
// and the UI shell load fast/offline-tolerant, and provides a clear offline
// fallback page. It deliberately does NOT cache or queue anything that talks
// to Supabase (auth, data, storage) — starting/ending a shift and uploading
// inspection photos must always hit the network live, or fail visibly. There
// is no "submit while offline, sync later" queue: for this data, a silent
// queue is worse than a clear error.

const SHELL_CACHE = "driver-ops-shell-v2";
const STATIC_ASSET_PATTERN = /\/(_next\/static|icons)\//;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(["/offline.html", "/manifest.webmanifest"])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never intercept writes
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch Supabase calls

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html").then((res) => res ?? Response.error())),
    );
    return;
  }

  if (STATIC_ASSET_PATTERN.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});

// --- Web Push ---
// The payload is plain JSON set by the server (see src/lib/push/send.ts):
// { title, body?, url? }. Never assume push data is trusted input from the
// page's own origin — it's whatever the push service delivered — so this
// only ever displays it as inert notification text, never as HTML.
self.addEventListener("push", (event) => {
  let payload = { title: "Driver Ops" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // Malformed payload: still show a generic notification rather than
    // silently dropping it.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    }),
  );
});
