# 🚀 Getting Started (Core Engine)

> **💡 VIBECODERS: Using React, Node.js, Python, or PHP?**
> You probably do not need to read this manual guide! We have already built the "Vibe" for you. Check out our **`integrations/`** folder first. You can just copy-paste the pre-written files for your framework and be done in 5 minutes.
> 
> *If you are building something custom or using Vanilla JS, continue below.*

Implementing web push notifications from scratch requires cooperation between three pieces: your frontend JavaScript, a background Service Worker, and your backend server. 

NotifyX handles the frontend and Service Worker logic for you. Here is the step-by-step guide to setting up the core engine.

---

## Step 1: Place the Service Worker
You must copy the `sw.js` file from `node_modules/notifyx/frontend/sw.js` and place it in the **root** of your public folder (e.g., the root directory of your web server).

**🤔 Why? (The Scope Rule)**
Service Workers have a strict security concept called "scope." A Service Worker can only control pages that sit in the same directory or subdirectories as the worker script itself. 
* **Incorrect:** If you put `sw.js` inside an `/assets/js/` folder, it can only control pages under `/assets/js/`. 
* **Correct:** By putting it in the root (`/sw.js`), it has permission to display notifications across your **entire application**.

## Step 2: Configure the Framework
At the very beginning of your application lifecycle (e.g., `app.js` or `index.js`), you must configure NotifyX with your VAPID public key.

\`\`\`javascript
import { setupNotifyX } from 'notifyx';

setupNotifyX({
  publicKey: 'BEl62i...<Your Base64 VAPID Key>...',
  debug: true, // Set to false in production
  hooks: {
    onError: (err) => console.error("NotifyX Error:", err)
  }
});
\`\`\`

**🤔 Why do we need a `publicKey`?**
Web Push relies on the **VAPID protocol**. Think of it as a digital signature. Your backend has a private key, and the browser has your public key. When your backend sends a message, it signs it. The browser uses the public key to verify that the message actually came from *you* and not a malicious third party.

## Step 3: Ask for Permission & Subscribe
You must call `initNotifications()` **only after a user interacts with your page** (like clicking a "Turn on Notifications" button).

\`\`\`javascript
const button = document.getElementById('subscribe-btn');

button.addEventListener('click', async () => {
    try {
        const subscription = await initNotifications();
        console.log("Success! Your subscription data:", subscription);
        
        // NEXT STEP: Send this `subscription` object to your backend!
    } catch (error) {
        // NotifyX will tell you exactly what went wrong (e.g., "Permission Denied")
        alert(error.message); 
    }
});
\`\`\`

**🤔 Why require a user click?**
Modern browsers (Chrome, Safari, Firefox) aggressively block applications from asking for notification permissions on page load. To protect users from spam, you **must** trigger the prompt via a direct user gesture. If you try to call this on page load, the browser will likely block the request permanently.

## Step 4: Save the Subscription to your Backend
When `initNotifications()` succeeds, it returns a `PushSubscription` object that looks like this:

\`\`\`json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "expirationTime": null,
  "keys": {
    "p256dh": "B...",
    "auth": "secret..."
  }
}
\`\`\`

**Crucial:** You must send this entire JSON object to your backend database and associate it with the current user. Your backend will use these exact URLs and keys to encrypt and "push" messages to this specific device later.