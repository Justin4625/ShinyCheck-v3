// ShinyCheck service worker: the app opens and works offline, and new versions arrive as an
// "Update" prompt instead of half-loaded pages.
// - Pages: network first (always the newest), the saved app when offline.
// - App files carry ?v=<VERSION> and never change under one version: cache first.
// - Sprites, type icons, logos: saved the first time they're shown, then served from the cache.
// - Fonts and the Firebase SDK: served from the cache, refreshed in the background.
// Firestore, sign-in and other API calls are never touched (Firestore keeps its own offline copy).
// Also shows push notifications (update news) and opens the app when one is tapped.
const VERSION = "20260930112358"; // stamped by scripts/bump-version.sh on every commit
const SHELL = `shinycheck-shell-${VERSION}`;
const RUNTIME = "shinycheck-runtime-v1";
const CORE = [
  "./",
  `style.css?v=${VERSION}`, `data.js?v=${VERSION}`, `evo.js?v=${VERSION}`, `app.js?v=${VERSION}`,
  `cloud.js?v=${VERSION}`, `firebase-config.js?v=${VERSION}`,
  "manifest.webmanifest", "icons/icon-192.png", "icons/apple-touch-icon.png",
];
// Firebase SDK (same version as cloud.js), saved up front so sign-in works on the first
// offline launch too. Best effort: a mismatch only means it's saved on first use instead.
const FIREBASE = ["app", "auth", "firestore"].map(m => `https://www.gstatic.com/firebasejs/12.19.0/firebase-${m}.js`);
const SWR_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];
const isFirebaseSdk = url => url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/");

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    await (await caches.open(SHELL)).addAll(CORE);
    await (await caches.open(RUNTIME)).addAll(FIREBASE).catch(() => {});
  })());
  // A first install takes over right away; an update waits until the app says so.
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith("shinycheck-shell-") && key !== SHELL) await caches.delete(key);
    }
    // App files of older versions that were picked up at runtime.
    const runtime = await caches.open(RUNTIME);
    for (const req of await runtime.keys()) {
      const v = new URL(req.url).searchParams.get("v");
      if (v && v !== VERSION) await runtime.delete(req);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if (event.data === "skipWaiting") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const scope = new URL(self.registration.scope);

  if (req.mode === "navigate" && url.origin === scope.origin) {
    event.respondWith(page(req));
  } else if (url.origin === scope.origin && url.pathname.startsWith(scope.pathname)) {
    event.respondWith(url.search.includes("v=") || /\/(sprites|types|logos|icons)\//.test(url.pathname) ? cacheFirst(req) : fresh(req));
  } else if (SWR_HOSTS.includes(url.hostname) || isFirebaseSdk(url)) {
    event.respondWith(fresh(req));
  }
});

// Pages: the live index.html when online (clean URLs like /sv are a 404 on GitHub Pages, so
// fetch the index for those), else the one saved with this version.
async function page(req) {
  try {
    let res = await fetch(req);
    if (res.status === 404) res = await fetch(new URL("./", self.registration.scope), { cache: "no-cache" });
    if (res.ok) return res;
    throw new Error(res.status);
  } catch {
    return (await caches.match(new URL("./", self.registration.scope).href)) || Response.error();
  }
}

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(RUNTIME)).put(req, res.clone());
  return res;
}

// Stale-while-revalidate: answer from the cache when possible, refresh it in the background.
async function fresh(req) {
  const cache = await caches.open(RUNTIME);
  const hit = await caches.match(req);
  const update = fetch(req).then(res => {
    if (res.ok || res.type === "opaque") cache.put(req, res.clone());
    return res;
  });
  if (hit) {
    update.catch(() => {});
    return hit;
  }
  return update;
}

// ---------- Notifications ----------
// Sent through Firebase Cloud Messaging by .github/workflows/notify.yml as a data message
// { title, body, url }; a "notification" payload is read the same way.
self.addEventListener("push", event => {
  let msg = {};
  try { msg = event.data ? event.data.json() : {}; } catch { msg = { data: { body: event.data.text() } }; }
  const d = { ...(msg.notification || {}), ...(msg.data || {}) };
  const scope = self.registration.scope;
  event.waitUntil(self.registration.showNotification(d.title || "ShinyCheck", {
    body: d.body || "",
    icon: new URL("icons/icon-192.png", scope).href,
    ...(d.tag ? { tag: d.tag } : {}),
    data: { url: new URL(d.url || "./", scope).href },
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data?.url || self.registration.scope;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const win = wins.find(w => w.url.startsWith(self.registration.scope));
    if (!win) return self.clients.openWindow(url);
    await win.focus();
    if (win.url !== url) await win.navigate(url).catch(() => {});
  })());
});
