const CACHE_NAME = 'oneshot-v6';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// fetch 핸들러는 등록하지 않는다.
// - Next.js 의 RSC/prefetch fetch 는 자주 abort 되는데
//   SW 가 중간에서 가로채면 "AbortError: signal is aborted without reason" 이 재발사되어
//   콘솔이 지저분해지고 일부 브라우저에서는 네비게이션이 망가진다.
// - PWA 설치 요건은 매니페스트 + SW 등록 자체로 충족되므로 fetch 가로채기는 불필요.
