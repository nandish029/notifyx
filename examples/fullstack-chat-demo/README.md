# 🤖 NotifyX: Fullstack AI Chat Demo

This is a complete, working example of how to integrate **NotifyX (v2.0)** into a modern React + Express application.

## What it does
It simulates an AI Chatbot that takes a few seconds to "think" before responding. If the user sends a message and switches tabs or minimizes the browser, the backend will use NotifyX to push a native desktop/mobile notification when the AI finishes thinking!

## Tech Stack
- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Push Library:** `@nandish029/notifyx` & `web-push`

## 🚀 How to Run It

### 1. Start the Backend
Open a terminal and run the Express server:
```bash
node server.js
```
*The server will start on `http://localhost:3001`.*

### 2. Start the Frontend
Open a second terminal and start the Vite dev server:
```bash
npm install
npm run dev
```
*The frontend will start on `http://localhost:5173`.*

## 🧪 How to Test Push Notifications
1. Open the frontend in your browser.
2. Click **"🔔 Enable Push"** and click "Allow" when the browser prompts you.
3. Type a message like "Hello!" and hit Send.
4. **Quickly minimize the browser or switch to a different tab!**
5. Wait 3 seconds...
6. You will receive a native operating system push notification with the AI's response!

*(Note: Push notifications will only trigger if your browser tab is in the background or minimized, simulating a real-world asynchronous chat experience).*

## 🎛️ The Payload Playground (Try it!)
The true power of NotifyX is that it is **100% payload-driven**. You do not need to write *any* frontend code to completely change how the notification looks or behaves.

Open `server.js` and look at the `payload` JSON object on line 31. Try modifying these values and triggering another notification:

1. **Test Rich Banners:** Uncomment the `image` field to instantly add a massive hero graphic to the notification.
2. **Test Persistence:** Change `requireInteraction` to `true` (if it isn't already). Notice how the notification refuses to disappear until you click it.
3. **Test Stealth Mode:** Uncomment `silent: true` and watch the notification slide into your tray without a single sound or vibration.
4. **Test Actions:** Look at the `actions` array. You just added fully functional native buttons ("Reply Now" and "Ignore") without writing a single line of React code!

Because NotifyX handles all the complex Service Worker routing, you can design, iterate, and experiment with your entire push notification experience just by changing standard JSON on your backend!

---
*Built to demonstrate the simplicity of the NotifyX v2.0 SDK.*
