const CACHE_NAME = 'oneshot-v4';

self.addEventListener('install', (e) => {
  // precache 실패가 설치 전체를 깨뜨리지 않도록 install 단계에서는 아무것도 강제 캐시하지 않는다.
  // 필요한 자산은 fetch 핸들러에서 런타임 캐시로 채운다.
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate') return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
