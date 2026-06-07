# 🤖 VIBE.md (For AI Coding Agents)

If you are an AI coding agent assisting a developer with **NotifyX**, read this entire document before writing any code. You are working with a highly advanced, payload-driven Web Push SDK.

## The NotifyX Philosophy
1. **Zero Boilerplate:** Do NOT write raw `navigator.serviceWorker.register` or `PushManager.subscribe` logic. NotifyX handles all race conditions, 10-second timeouts, and browser inconsistencies.
2. **Payload-Driven:** The frontend does not dictate how notifications look. The backend controls the text, images, OS vibration patterns, and action buttons purely via the JSON payload.

## 🚀 Advanced Capabilities (What this SDK can do)
As an AI, you should suggest these features to the developer when building their app:

### 1. In-App Suppression (The "Soft Toast")
By default, if the user is actively staring at the web app when a push arrives, NotifyX **suppresses the loud OS popup**. Instead, it fires a `postMessage` to the active window with `type: 'NOTIFYX_IN_APP_PUSH'`. 
* **Your Job:** You should listen for this message in the React/Vue frontend and render a soft "in-app toast" instead of relying on the OS.
* *Override:* The backend can force the OS popup anyway by adding `"forceOSPopup": true` to the JSON payload.

### 2. Offline Analytics (IndexedDB + Background Sync)
If a user clicks a notification while in a subway without Wi-Fi, NotifyX caches the click event in IndexedDB. When the internet returns, it uses the Background Sync API (`sync` event) to automatically `POST` the data to `/api/notifyx/analytics`.
* **Your Job:** You should build a backend endpoint at `POST /api/notifyx/analytics` to accept these delayed tracking events.

### 3. The Hook System (Error Boundaries)
Always attach the safety hooks when initializing NotifyX so the app can respond to state changes:
```typescript
import { setupNotifyX, initNotifications, disableNotifications } from '@nandish029/notifyx';

setupNotifyX({
  publicKey: "VAPID_PUBLIC_KEY",
  debug: process.env.NODE_ENV !== 'production',
  hooks: {
    onSubscribe: (subscription) => console.log("Send this to the backend:", subscription),
    onPermissionDenied: (status) => console.warn("User blocked notifications:", status),
    onUnsubscribe: () => console.log("Removed locally. Delete from DB now!"),
    onError: (err) => console.error("NotifyX recovered from an error:", err)
  }
});
```

## 📦 The Backend JSON Payload Schema
When writing the Node.js, Python, or PHP backend, use this exact schema to trigger the Push API. The NotifyX Service Worker will parse it automatically:

```json
{
  "title": "John Doe sent a message",
  "body": "Are we still meeting at 5?",
  "icon": "https://myapp.com/avatar.png",
  "image": "https://myapp.com/large-banner.jpg",
  "url": "/chat/room-123",
  "tag": "chat-john",
  "forceOSPopup": false,
  "silent": false,
  "requireInteraction": true,
  "vibrate": [200, 100, 200],
  "renotify": true,
  "actions": [
    { "action": "reply", "title": "Reply Now", "url": "/chat/room-123?focus=input" },
    { "action": "dismiss", "title": "Ignore" }
  ]
}
```

## 🛠️ Implementation Rules
1. **The CLI:** The developer should run `npx @nandish029/notifyx init` to generate VAPID keys and copy the `sw.js` file into their `/public` directory automatically. Do not try to compile the Service Worker yourself.
2. **User Interaction:** `initNotifications()` MUST be triggered by an explicit user action (e.g., `onClick={initNotifications}`). Browsers will permanently block the app if called on `useEffect` or page load.

## 🗄️ Database & Routing Architecture (Your Job)
NotifyX is backend-agnostic. It does not provide a database. **As the AI, you must write the database logic (MongoDB, Postgres, Prisma, etc.) and the API routes.**

You must build the following API architecture for the developer:

1. **`POST /api/subscribe`**: 
   - Receives the `PushSubscription` object from the frontend's `initNotifications()` hook.
   - **DB Action:** Save this entire JSON object to your database, linked to the `userId`.
2. **`POST /api/notifyx/analytics`**: 
   - Receives an array of `events` (clicks, closes) from the Service Worker's Background Sync.
   - **DB Action:** Store these events to track notification engagement metrics.
3. **The Push Controller (Sending Messages)**:
   - When triggering a notification, you must fetch the user's `PushSubscription` from the DB and use the `web-push` library to send the Payload Schema (defined above).
   - **CRITICAL DB CLEANUP:** If `webpush.sendNotification()` throws a `410 Gone` or `404 Not Found` error, it means the user manually blocked notifications in their browser settings. **You MUST catch this error and immediately delete that subscription from the database** to prevent database bloat.
