// Service Worker for AI Call Assistant — Push Notifications + Offline Cache
const CACHE_NAME = 'ai-call-assistant-v2';
const urlsToCache = [
  '/',
  '/generated-icon.png'
];

// Install event — cache shell resources
self.addEventListener('install', function(event) {
  self.skipWaiting(); // Activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event — clean old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) { return name !== CACHE_NAME; })
          .map(function(name) { return caches.delete(name); })
      );
    }).then(function() {
      return self.clients.claim(); // Take control of all pages immediately
    })
  );
});

// Fetch event — network-first with cache fallback
self.addEventListener('fetch', function(event) {
  // Skip non-GET and API requests
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Cache successful responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(function() {
        return caches.match(event.request);
      })
  );
});

// Push event — show native notification on device
self.addEventListener('push', function(event) {
  console.log('[SW] Push received');

  let data = {
    title: 'AI Call Assistant',
    body: 'You have a new notification',
    icon: '/generated-icon.png',
    badge: '/generated-icon.png',
    tag: 'default',
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    data: { url: '/', timestamp: Date.now() }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/generated-icon.png',
    badge: data.badge || '/generated-icon.png',
    tag: data.tag,
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    vibrate: [200, 100, 200, 100, 200], // Vibration pattern for mobile
    renotify: true, // Vibrate again even if same tag
    silent: false,
  };

  // Missed call — high priority with call-back action
  if (data.data && data.data.type === 'missed_call') {
    options.requireInteraction = true;
    options.vibrate = [300, 100, 300, 100, 300, 100, 300];
    options.actions = [
      { action: 'callback', title: 'Call Back' },
      { action: 'open', title: 'View Details' }
    ];
  }

  // Voicemail — medium priority
  if (data.data && data.data.type === 'voicemail') {
    options.actions = [
      { action: 'open', title: 'Listen' },
      { action: 'dismiss', title: 'Later' }
    ];
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click — handle actions
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const action = event.action;
  const notifData = event.notification.data || {};

  // Dismiss action — just close
  if (action === 'dismiss') {
    return;
  }

  // Determine which URL to open
  let urlToOpen = '/';

  if (action === 'callback' && notifData.callFrom) {
    // Open call-back page with the caller's number
    urlToOpen = `/call-log?callback=${encodeURIComponent(notifData.callFrom)}`;
  } else if (action === 'open' || !action) {
    urlToOpen = notifData.url || '/call-log';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync for offline queued actions
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      fetch('/api/notifications?unread=true')
        .then(function(response) { return response.json(); })
        .then(function(data) {
          console.log('[SW] Background sync: fetched', data.length, 'unread notifications');
        })
        .catch(function(err) {
          console.log('[SW] Background sync failed:', err.message);
        })
    );
  }
});
