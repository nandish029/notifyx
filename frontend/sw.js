// @nandish029/notifyx/frontend/sw.js

/**
 * 📡 PUSH EVENT
 *
 * Runs when push notification arrives (even if app is closed)
 */
self.addEventListener('push', function (event) {
  let payload = null;

  // 🔐 Try parsing JSON safely
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (err) {
      console.warn(
        '[@nandish029/notifyx] Invalid JSON payload. Falling back to text.'
      );

      payload = {
        title: 'New Notification',
        body: event.data.text() || 'You have a new message.',
      };
    }
  }

  // 🚨 Absolute fallback (no data at all)
  if (!payload) {
    console.warn('[@nandish029/notifyx] No payload received.');

    payload = {
      title: 'Notification',
      body: 'You have a new update.',
      tag: '@nandish029/notifyx-fallback',
    };
  }

  const title = payload.title || 'Notification';

  const options = {
    body: payload.body || '',
    icon: payload.icon || undefined,
    badge: payload.badge || undefined,
    tag: payload.tag || '@nandish029/notifyx-default',
    data: payload, // store full payload for click handling
  };

  // 🧠 Feature detection for actions
  if ('actions' in Notification.prototype && Array.isArray(payload.actions)) {
    options.actions = payload.actions;
  }

  // 🔔 Show notification
  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * 🖱 NOTIFICATION CLICK
 *
 * Handles click behavior
 */
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const payload = event.notification.data || {};

  let targetUrl = payload.url || '/';

  // 🧠 Handle action buttons
  if (event.action && payload.actions) {
    const action = payload.actions.find(
      (a) => a.action === event.action
    );

    if (action && action.url) {
      targetUrl = action.url;
    }
  }

  // 🔁 Focus existing tab or open new one
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
      .catch((err) => {
        console.warn('[@nandish029/notifyx] Click handling error:', err);
      })
  );
});