const APP_VERSION = '__APP_VERSION__';
const CACHE_NAME = 'ai-call-assistant-' + APP_VERSION;
const urlsToCache = [
  '/',
  '/generated-icon.png'
];

self.addEventListener('install', function(event) {
  console.log('[SW] Installing version:', APP_VERSION);
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', function(event) {
  console.log('[SW] Activating version:', APP_VERSION);
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) { return name.startsWith('ai-call-assistant-') && name !== CACHE_NAME; })
          .map(function(name) {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(function() {
      return self.clients.claim();
    }).then(function() {
      return self.clients.matchAll({ type: 'window' });
    }).then(function(clients) {
      clients.forEach(function(client) {
        client.postMessage({ type: 'SW_UPDATED', version: APP_VERSION });
      });
    })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        if (response.ok) {
          var responseClone = response.clone();
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

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: APP_VERSION });
  }
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', function(event) {
  console.log('[SW] Push received');

  var data = {
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
      var payload = event.data.json();
      data = Object.assign({}, data, payload);
    } catch (e) {
      data.body = event.data.text();
    }
  }

  var options = {
    body: data.body,
    icon: data.icon || '/generated-icon.png',
    badge: data.badge || '/generated-icon.png',
    tag: data.tag,
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    vibrate: [200, 100, 200, 100, 200],
    renotify: true,
    silent: false,
  };

  if (data.data && data.data.type === 'app_update') {
    options.requireInteraction = true;
    options.tag = 'app-update';
    options.actions = [
      { action: 'update', title: 'Update Now' },
      { action: 'dismiss', title: 'Later' }
    ];
  }

  if (data.data && data.data.type === 'missed_call') {
    options.requireInteraction = true;
    options.vibrate = [300, 100, 300, 100, 300, 100, 300];
    options.actions = [
      { action: 'callback', title: 'Call Back' },
      { action: 'open', title: 'View Details' }
    ];
  }

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

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  var action = event.action;
  var notifData = event.notification.data || {};

  if (action === 'dismiss') {
    return;
  }

  if (action === 'update') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(function(clientList) {
          for (var i = 0; i < clientList.length; i++) {
            var client = clientList[i];
            if ('focus' in client) {
              client.postMessage({ type: 'FORCE_UPDATE' });
              return client.focus();
            }
          }
          if (self.clients.openWindow) {
            return self.clients.openWindow('/');
          }
        })
    );
    return;
  }

  var urlToOpen = '/';

  if (action === 'callback' && notifData.callFrom) {
    urlToOpen = '/call-log?callback=' + encodeURIComponent(notifData.callFrom);
  } else if (action === 'open' || !action) {
    urlToOpen = notifData.url || '/call-log';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

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

self.addEventListener('periodicsync', function(event) {
  if (event.tag === 'check-updates') {
    event.waitUntil(
      fetch('/api/version')
        .then(function(response) { return response.json(); })
        .then(function(data) {
          if (data.version !== APP_VERSION) {
            self.registration.showNotification('Update Available', {
              body: 'A new version of AI Call Assistant is ready. Tap to update.',
              icon: '/generated-icon.png',
              badge: '/generated-icon.png',
              tag: 'app-update',
              data: { type: 'app_update', version: data.version },
              requireInteraction: true,
              actions: [
                { action: 'update', title: 'Update Now' },
                { action: 'dismiss', title: 'Later' }
              ]
            });
          }
        })
        .catch(function() {})
    );
  }
});
