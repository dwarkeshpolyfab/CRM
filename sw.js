// ============================================================
//  Dwarkesh Polyfab CRM - Service Worker (sw.js)
//  Handles background notifications for reminders
// ============================================================

const CACHE_NAME = 'dp-crm-v5';

// ðŸ“¦ Cache app files for offline use ðŸ“¦
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll([
      '/',
      '/index.html',
      '/pages/reminders.html',
      '/pages/add.html',
      '/pages/data.html',
      '/pages/company.html',
      '/assets/style.css',
      '/assets/app.js',
      '/assets/icon-192.png',
      '/assets/icon-512.png',
    ])).catch(() => {}) // ignore cache errors
  );
  self.skipWaiting();
});

// ðŸ§¹ DELETE ALL OLD CACHES on activate ðŸ§¹
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ðŸ“£ Show notification (called from app via postMessage) ðŸ“£
self.addEventListener('message', event => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, reminderId, companyId } = event.data;

    event.waitUntil(
      self.registration.showNotification(title, {
        body:             body,
        icon:             '/assets/icon-192.png',
        badge:            '/assets/icon-192.png',
        vibrate:          [300, 100, 300, 100, 300],
        tag:              reminderId,
        requireInteraction: true,  // stays on screen until user taps
        data:             { reminderId, companyId },
        actions: [
          { action: 'open',    title: 'ðŸ“‹ Open Reminder' },
          { action: 'dismiss', title: 'âœ• Dismiss'        },
        ]
      })
    );
  }

  if (event.data.type === 'SCHEDULE_CHECK') {
    // Ping back to confirm SW is alive
    event.source && event.source.postMessage({ type: 'SW_ALIVE' });
  }
});

// ðŸ“² Handle notification tap ðŸ“²
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const url = '/pages/reminders.html?tab=today';

  if (event.action === 'dismiss') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // If app is open, focus it
      for (const client of clients) {
        if (client.url.includes('dwarkeshpolyfab') || client.url.includes('localhost') || client.url.includes('index.html')) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open new window
      return self.clients.openWindow(url);
    })
  );
});

// ðŸŒ Network first, then cache (always fetch fresh content) ðŸŒ
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone and store fresh copy in cache
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => {
        // Network failed - serve from cache
        return caches.match(event.request);
      })
  );
});
