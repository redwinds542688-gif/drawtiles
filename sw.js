// 抓牌終極 PWA Service Worker
// 重要：以後只要更新了 index.html 的內容，就要把下面 CACHE_NAME 的版本號往上加一版
// （例如 v1 -> v2），否則使用者手機上快取的舊版本不會自動更新。
const CACHE_NAME = "zhuapai-app-shell-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(APP_SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (key) { return key !== CACHE_NAME; })
              .map(function (key) { return caches.delete(key); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

// 策略：先回應快取（離線也能立即開啟），同時背景打一次網路請求更新快取，
// 下次開啟就會是最新版；純GET請求才處理，避免快取到POST等其他方法。
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      const networkFetch = fetch(event.request)
        .then(function (response) {
          if (response && response.status === 200 && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(function () {
          // 離線且沒有精準快取命中時，導覽請求(切換頁面)就退回index.html
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return cached;
        });

      return cached || networkFetch;
    })
  );
});
