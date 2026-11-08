/* Service Worker：让应用装到桌面后能离线打开。
 *
 * 策略：安装时把整个应用外壳缓存下来；之后优先用缓存，
 * 缓存没有再走网络，网络也失败就回退到首页。
 *
 * 修改了 index.html 之后想立即生效：把 VERSION 改掉（例如 v2），
 * 用户下次打开时会自动更新缓存。
 */

const VERSION = "vocab-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn("预缓存失败", err))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((resp) => {
        // 只缓存同源的成功响应
        if (resp && resp.ok && new URL(req.url).origin === self.location.origin) {
          const copy = resp.clone();
          caches.open(VERSION).then((cache) => cache.put(req, copy));
        }
        return resp;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
