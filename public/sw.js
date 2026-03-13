const CACHE_NAME = 'health-tracker-v1';
const NOTIFICATION_HOUR = 21; // 저녁 9시

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

// 알림 스케줄링 메시지 수신
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SCHEDULE_NOTIFICATION') {
    scheduleNextNotification();
  }
});

function scheduleNextNotification() {
  const now = new Date();
  const next = new Date();
  next.setHours(NOTIFICATION_HOUR, 0, 0, 0);

  // 이미 오늘 9시 지났으면 내일로
  if (now >= next) {
    next.setDate(next.getDate() + 1);
  }

  const delay = next.getTime() - now.getTime();

  setTimeout(() => {
    self.registration.showNotification('건강 트래커 📋', {
      body: '오늘 기록 아직 안 했어요! 잠깐이면 돼요 💪',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'daily-reminder',
      renotify: true,
      data: { url: '/' }
    });
    // 다음날 알림 예약
    scheduleNextNotification();
  }, delay);
}

// 알림 클릭 시 앱 열기
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
