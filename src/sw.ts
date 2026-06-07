// src/sw.ts
import { PushPayload } from './types.js';

declare const self: ServiceWorkerGlobalScope;

// --- OFFLINE ANALYTICS (INDEXEDDB) ---
// Why IndexedDB? Service Workers can be killed at any moment by the browser.
// If the user clicks a notification while offline, a standard fetch() will fail.
// We queue all click/close events in IndexedDB first, then attempt to flush them.
const DB_NAME = 'NotifyXAnalytics';
const STORE_NAME = 'events';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function queueAnalyticsEvent(eventType: string, payload: any) {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add({
      type: eventType,
      payload,
      timestamp: Date.now()
    });
    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (err) {
    console.warn('[NotifyX] Failed to queue analytics:', err);
  }
}

async function flushAnalytics() {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const getAllReq = store.getAll();

    getAllReq.onsuccess = async () => {
      const events = getAllReq.result;
      if (!events || events.length === 0) return;

      try {
        // Send to backend
        const res = await fetch('/api/notifyx/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events })
        });

        if (res.ok) {
          // Clear store on success
          const delTx = db.transaction(STORE_NAME, 'readwrite');
          delTx.objectStore(STORE_NAME).clear();
        }
      } catch (err) {
        console.warn('[NotifyX] Analytics flush failed, will retry later:', err);
      }
    };
  } catch (err) {
    console.warn('[NotifyX] Analytics DB error:', err);
  }
}

// --- PUSH EVENT HANDLING ---
self.addEventListener('push', function (event: PushEvent) {
  event.waitUntil(
    (async () => {
      let payload: PushPayload | null = null;

      if (event.data) {
        try {
          payload = event.data.json();
        } catch (err) {
          console.warn('[NotifyX] Invalid JSON payload. Falling back to text.');
          payload = {
            title: 'New Notification',
            body: event.data.text() || 'You have a new message.',
          } as PushPayload;
        }
      }

      if (!payload) {
        console.warn('[NotifyX] No payload received.');
        payload = {
          title: 'Notification',
          body: 'You have a new update.',
          tag: 'notifyx-fallback',
        } as PushPayload;
      }

      const title = payload.title || 'Notification';
      const options: any = {
        body: payload.body || '',
        icon: payload.icon,
        image: payload.image,
        badge: payload.badge,
        tag: payload.tag || 'notifyx-default',
        renotify: payload.renotify !== undefined ? payload.renotify : true,
        requireInteraction: payload.requireInteraction !== undefined ? payload.requireInteraction : false,
        vibrate: payload.vibrate || [200, 100, 200],
        silent: payload.silent,
        dir: payload.dir || 'auto',
        data: payload,
      };

      if ('actions' in Notification.prototype && Array.isArray(payload.actions)) {
        options.actions = payload.actions;
      }

      // --- FOCUSED TAB SUPPRESSION (INTELLIGENCE) ---
      const forceOSPopup = payload.forceOSPopup === true;
      let shouldSuppress = false;

      if (!forceOSPopup && self.clients && typeof self.clients.matchAll === 'function') {
        try {
          const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
          for (const client of windowClients) {
            if (client.focused) {
              shouldSuppress = true;
              // Bridge the payload directly into the active React/Vue/Vanilla app
              // so developers can show a soft "in-app" toast instead of a loud OS popup.
              client.postMessage({
                type: 'NOTIFYX_IN_APP_PUSH',
                payload: payload
              });
              break;
            }
          }
        } catch (err) {
          console.warn('[NotifyX] Failed to check client focus state:', err);
        }
      }

      if (shouldSuppress) {
        console.log('[NotifyX] Tab is focused. Suppressing OS notification and routing to in-app listener.');
        return;
      }

      return self.registration.showNotification(title, options);
    })()
  );
});

// --- CLICK HANDLING ---
self.addEventListener('notificationclick', function (event: NotificationEvent) {
  event.notification.close();
  const payload = event.notification.data || {};
  let targetUrl = payload.url || '/';

  if (event.action && payload.actions) {
    const action = payload.actions.find((a: any) => a.action === event.action);
    if (action && action.url) {
      targetUrl = action.url;
    }
  }

  // Sanitize URL
  try {
    const parsedUrl = new URL(targetUrl, self.location.origin);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      console.warn('[NotifyX] Blocked unsafe URL scheme:', parsedUrl.protocol);
      targetUrl = '/';
    } else {
      targetUrl = parsedUrl.href;
    }
  } catch (err) {
    targetUrl = '/';
  }

  // Queue analytics
  event.waitUntil(
    queueAnalyticsEvent('click', { url: targetUrl, tag: payload.tag })
      .then(() => {
        if ('sync' in self.registration) {
          return (self.registration as any).sync.register('notifyx-analytics');
        } else {
          return flushAnalytics(); // Fallback if Background Sync is unsupported
        }
      })
      .then(() => {
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
      .catch((err) => {
        console.warn('[NotifyX] Click handling error:', err);
      })
  );
});

self.addEventListener('notificationclose', function(event: NotificationEvent) {
  const payload = event.notification.data || {};
  event.waitUntil(
    queueAnalyticsEvent('close', { tag: payload.tag })
      .then(() => {
        if ('sync' in self.registration) {
          return (self.registration as any).sync.register('notifyx-analytics');
        } else {
          return flushAnalytics();
        }
      })
  );
});

// --- BACKGROUND SYNC ---
// The Background Sync API allows the browser to retry flushing our IndexedDB analytics
// the moment the user regains internet connection, even if the website is closed.
self.addEventListener('sync', function(event: any) {
  if (event.tag === 'notifyx-analytics') {
    event.waitUntil(flushAnalytics());
  }
});