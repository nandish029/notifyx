# 📊 Analytics & Tracking (Click Tracking)

Once you start sending push notifications, the biggest question becomes: **"How many users actually clicked them?"**

Because push notifications operate in the background via a Service Worker, traditional analytics tools (like Google Analytics) cannot track them automatically. You must track them manually.

## 🧠 How It Works
1. Your backend sends a notification with a unique **ID**.
2. The user clicks the notification.
3. The Service Worker catches the click and sends a **tracking request** in the background.
4. Your backend records the click.

---

## 1. Update Backend Payload

Your backend must include a unique identifier (`id`) in every notification payload. This ID is what you will track in your database.

```json
{
  "title": "Flash Sale!",
  "body": "Tap to see your discount.",
  "url": "/sale",
  "id": "campaign_summer_2026"
}
```

## 2. Update Service Worker (`sw.js`)

You need to update your `notificationclick` event. We will use `Promise.all` to ensure the tracking ping is sent at the exact same time the browser opens the notification link, without delaying the user.

📍 Find your `notificationclick` event and replace it entirely with this:

```javascript
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const payload = event.notification.data || {};
  let targetUrl = payload.url || '/';

  // 🧠 Handle Action Buttons (Custom URLs)
  if (event.action && payload.actions) {
    const action = payload.actions.find((a) => a.action === event.action);
    if (action && action.url) {
      targetUrl = action.url;
    }
  }

  /**
   * 📊 TRACKING PROMISE
   * Sends a silent ping to your server.
   */
  const trackingPromise = payload.id
    ? fetch('/api/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId: payload.id,
          action: event.action || 'default_click'
        })
      }).catch(err => console.error('[NotifyX] Tracking failed:', err))
    : Promise.resolve();

  /**
   * 🌐 NAVIGATION PROMISE
   * Focuses an existing tab or opens a new one.
   */
  const navigationPromise = clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then(clientList => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
    .catch(err => console.warn('[NotifyX] Navigation failed:', err));

  /**
   * 🔥 CRITICAL: Combine both promises
   * Ensures the browser waits for the tracking ping before going back to sleep.
   */
  event.waitUntil(Promise.all([trackingPromise, navigationPromise]));
});
```

## 3. Backend Endpoint

Create an endpoint on your server to receive these tracking events. 

*Example (Node.js / Express):*
```javascript
app.post('/api/track-click', (req, res) => {
  const { notificationId, action } = req.body;

  console.log(`Notification ${notificationId} clicked. Action: ${action}`);

  /**
   * Example DB logic:
   * db.query('UPDATE campaigns SET clicks = clicks + 1 WHERE id = ?', [notificationId]);
   */

  res.status(200).json({ success: true });
});
```

---

## ⚠️ Production Notes

### 🔒 1. Use an Absolute URL if Needed
If your API backend is on a different domain than your frontend Service Worker, you must use an absolute URL in your fetch request:
`fetch('https://api.yourdomain.com/track-click', ...)`

### 🔁 2. Tracking is "Best Effort"
The browser may kill the request if the user closes the app instantly, or their network might drop. Always design push analytics as **approximate, not exact**.

### 📱 3. What You CAN Track:
* **Click count:** How many times the notification was tapped.
* **Action type:** Which specific button was clicked (e.g., `action: 'reply'` vs `action: 'dismiss'`).
* **Campaign performance:** By tying the `id` to your database records.

### ❌ 4. What You CANNOT Reliably Track:
* **Delivery rates:** Knowing if a notification successfully arrived on the device is incredibly difficult because iOS/Android restrict background execution. 
* **Seen without clicking:** If a user looks at the notification on their lock screen but doesn't tap it, the Service Worker never wakes up to tell you.
```