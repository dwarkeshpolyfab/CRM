// Dwarkesh Polyfab CRM – Service Worker

const CACHE_NAME = 'dp-crm-v2';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, reminderId, companyId } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        body:               body,
        icon:               '/assets/icon-192.png',
        badge:              '/assets/icon-192.png',
        vibrate:            [300, 100, 300, 100, 300],
        tag:                reminderId,
        requireInteraction: true,
        data:               { reminderId, companyId },
        actions: [
          { action: 'open',    title: '📋 Open Reminder' },
          { action: 'dismiss', title: '✕ Dismiss'        }
        ]
      })
    );
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if ('focus' in client) { client.focus(); client.navigate('/pages/reminders.html?tab=today'); return; }
      }
      return self.clients.openWindow('/pages/reminders.html?tab=today');
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).catch(() => cached))
  );
});
