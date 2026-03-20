# 🗄️ Notification History (Storage Plugin)

By default, if a user swipes away a push notification, it is gone forever. 

However, many modern applications want a **"Notification Bell"** or **"Inbox"** inside their UI to show a history of past messages. To achieve this, we can use the browser's built-in **IndexedDB**. 

IndexedDB is an offline database built into the browser that can be accessed by both your UI *and* your Service Worker (`sw.js`).

### ⚠️ Important Notes for Production
* **Not Permanent:** IndexedDB is browser-managed. It can be cleared by the user clearing their cache, or by the OS to save space. Do not rely on it as a permanent server-side database.
* **Storage Limits:** To prevent your app from taking up too much of the user's hard drive, you should limit how many notifications you store (e.g., maximum 50).
* **Browser Support:** IndexedDB in Service Workers is widely supported, but always handle failures gracefully so your core notifications still deliver even if saving fails.

Here is the step-by-step recipe to add a Notification History to your app.

## 1. Create the Storage Utility
Create a new file in your project called `notifyx-storage.js`. 
*(Note: Place this file in your public root directory, right next to your `sw.js` file).*

```javascript
// notifyx-storage.js

const DB_NAME = 'NotifyX_History';
const STORE_NAME = 'notifications';
const MAX_ITEMS = 50; // 🧹 Prevent infinite database growth

// 1. Initialize the Database
export async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 2. Save a Notification (Used by Service Worker)
export async function saveNotification(payload) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const notificationData = {
      ...payload,
      timestamp: Date.now(),
      read: false // 💡 You can update this to 'true' later when the user opens the UI
    };
    
    store.add(notificationData);

    // 🧹 Auto-Cleanup: Delete the OLDEST record based on timestamp
    const countReq = store.count();

    countReq.onsuccess = () => {
    if (countReq.result > MAX_ITEMS) {
        /**
         * WHY THIS IS IMPORTANT:
         * store.openCursor() does NOT guarantee order
         * So we use the 'timestamp' index to ensure we delete the oldest notification
         */

        const index = store.index('timestamp');

        index.openCursor().onsuccess = (e) => {
        const cursor = e.target.result;

        if (cursor) {
            cursor.delete(); // ✅ deletes oldest notification (correct behavior)
        }
        };
    }
    };
        

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
    });
    }

// 3. Get all Notifications (Used by your UI)
export async function getHistory() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => {
      // Sort newest to oldest
      const sorted = request.result.sort((a, b) => b.timestamp - a.timestamp);
      resolve(sorted);
    };
    request.onerror = () => reject(request.error);
  });
}
```

## 2. Update your Service Worker (`sw.js`)
To ensure notifications are saved even if the user's browser tab is closed, you must update your Service Worker.

First, add this to the **very top** of your `sw.js` file to import the database script. *(Ensure the path matches where you placed the file)*:
```javascript
importScripts('/notifyx-storage.js');
```

Next, scroll down to your `push` event listener. We need to use `Promise.all` to safely save the data to the database *and* trigger the notification popup at the exact same time without causing a race condition.

**❌ BEFORE (Standard NotifyX):**
```javascript
  // ... earlier code ...

  // 🔔 Show notification
  event.waitUntil(self.registration.showNotification(title, options));
});
```

**✅ AFTER (With History Plugin):**
```javascript
  // ... earlier code ...

  // 🗄️ Save to DB and Show Notification simultaneously (Production Safe)
  event.waitUntil(
    Promise.all([
      saveNotification(payload).catch(err => console.error("History save failed", err)),
      self.registration.showNotification(title, options)
    ])
  );
});
```

## 3. Display the History in your UI
Now that your Service Worker is quietly saving every push to the database, you can fetch them inside your UI app to build your dropdown menu!

```javascript
import { getHistory } from '/notifyx-storage.js';

async function loadNotificationInbox() {
    try {
        /**
         * WHY TRY/CATCH:
         * IndexedDB can fail (quota, browser issues, etc.)
         * We should NEVER crash UI because of it
         */
        const pastNotifications = await getHistory();

        const unreadCount = pastNotifications.filter(msg => msg.read === false).length;
        console.log(`You have ${unreadCount} new messages!`);

        pastNotifications.forEach(msg => {
            console.log(`[${new Date(msg.timestamp).toLocaleTimeString()}] ${msg.title}`);
        });

    } catch (err) {
    console.error("Failed to load notification history", err);
    }
  
  // Filter unread messages
  const unreadCount = pastNotifications.filter(msg => msg.read === false).length;
  console.log(`You have ${unreadCount} new messages!`);
  
  pastNotifications.forEach(msg => {
    console.log(`[${new Date(msg.timestamp).toLocaleTimeString()}] ${msg.title}`);
  });
}

// Call this when the user clicks the "Bell" icon
loadNotificationInbox();
```