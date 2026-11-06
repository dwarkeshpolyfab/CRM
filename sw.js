// ============================================================
//  Dwarkesh Polyfab CRM - Service Worker (sw.js)
//  Handles background notifications for reminders
// ============================================================

const CACHE_NAME = 'dp-crm-v8';

// ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¦ Cache app files for offline use ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¦
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

// ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â¹ DELETE ALL OLD CACHES on activate ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â¹
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

// ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â£ Show notification (called from app via postMessage) ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â£
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
          { action: 'open',    title: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¹ Open Reminder' },
          { action: 'dismiss', title: 'ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¢ Dismiss'        },
        ]
      })
    );
  }

  if (event.data.type === 'SCHEDULE_CHECK') {
    // Ping back to confirm SW is alive
    event.source && event.source.postMessage({ type: 'SW_ALIVE' });
  }
});

// ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â² Handle notification tap ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â²
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

// ÃƒÂ°Ã…Â¸Ã…â€™Ã‚Â Network first, then cache (always fetch fresh content) ÃƒÂ°Ã…Â¸Ã…â€™Ã‚Â
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
