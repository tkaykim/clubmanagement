const CACHE_NAME = 'oneshot-v11';

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

// fetch 핸들러는 등록하지 않는다. (RSC abort 이슈)

// 푸시 endpoint 가 OS/브라우저에 의해 회전되면 발생.
// 이 핸들러가 없으면 구독이 그대로 사라져 "자동 미구독" 으로 보인다.
// 1) 같은 VAPID 키로 즉시 재구독, 2) 가능하면 서버 DB 도 동기화 (foreground client 가 있을 때).
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      const oldEndpoint = event.oldSubscription && event.oldSubscription.endpoint;
      const applicationServerKey = (event.oldSubscription && event.oldSubscription.options && event.oldSubscription.options.applicationServerKey) || null;
      if (!applicationServerKey) return;

      const newSub = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey,
      });

      const json = newSub.toJSON();
      // foreground client 가 있을 때만 서버 동기화 시도 (인증 쿠키 필요).
      const clientsList = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      if (clientsList.length > 0) {
        try {
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              endpoint: json.endpoint,
              keys: json.keys,
              ua: 'sw-pushsubscriptionchange',
              oldEndpoint: oldEndpoint || undefined,
            }),
          });
        } catch (_e) {
          // 서버 동기화 실패는 무시. 다음 visibilitychange 에 PushPrompt 가 보정.
        }
      }
    } catch (_err) {
      // 무시: 다음 visibilitychange 에 PushPrompt.ensureServerSync 가 시도한다.
    }
  })());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || '원샷크루';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-mono.png',
    data: { url: data.url || '/dashboard' },
    tag: data.tag,
    requireInteraction: !!data.requireInteraction,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
      for (const c of cs) {
        try {
          const u = new URL(c.url);
          if (u.pathname === url || c.url.endsWith(url)) {
            return c.focus();
          }
        } catch (_e) {}
      }
      return self.clients.openWindow(url);
    })
  );
});
