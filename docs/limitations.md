# ⚠️ Framework Limitations & Rules

To use @nandish029/notifyx effectively in production, you must understand the strict boundaries enforced by modern web browsers.

## 1. HTTPS is Strictly Required
**The Rule:** The Push API will completely fail on `http://`.
**The Exception:** It works on `http://localhost` for local development.
**Why:** Service Workers act as a powerful middleman for network traffic. Browsers mandate HTTPS to prevent malicious actors from intercepting payloads or taking over the worker.

## 2. No Delivery Guarantees
**The Rule:** Just because your backend sent a push does not mean the user will see it instantly.
**Why:** Browsers and Operating Systems optimize for battery life. If a user's phone is in "Battery Saver" mode, or the browser process is heavily throttled by the OS, the push notification may be delayed or dropped entirely.

## 3. Visuals are OS-Dependent
**The Rule:** You cannot style notifications with CSS.
**Why:** The notification is rendered by the operating system (macOS, Windows, Android), not the browser engine. A notification that looks like a sleek dark-mode card on Android may look like a plain white box on Windows. Use the standard `icon` and `badge` properties in your payload to brand your alerts.