# 🔔 NotifyX - Lightweight Web Push SDK

[![CI](https://github.com/nandish029/notifyx/actions/workflows/ci.yml/badge.svg)](https://github.com/nandish029/notifyx/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/nandish029/notifyx/branch/main/graph/badge.svg)](https://codecov.io/gh/nandish029/notifyx)
[![npm version](https://badge.fury.io/js/@nandish029%2Fnotifyx.svg)](https://badge.fury.io/js/@nandish029%2Fnotifyx)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

NotifyX is a lightweight, backend-agnostic **Software Development Kit (SDK)** that abstracts away the notoriously complex, error-prone boilerplate of the browser Push API and Service Workers. It acts as a safety layer between your application and the user's operating system, providing a clean, predictable way to manage push subscriptions and ensure your notifications actually reach your users.

## 🎉 New in v2.0!
* **Vibe Coding CLI**: Get started in 5 seconds by running `npx @nandish029/notifyx init`. It auto-generates VAPID keys, creates your `.env`, and sets up your framework integrations automatically!
* **TypeScript Support**: Full autocomplete for payloads, webhooks, and core hooks.
* **Offline Analytics Engine**: Built-in IndexedDB queueing. If a user clicks a notification while offline, the service worker caches the analytics event and uses the Background Sync API to push it to your server once they reconnect.

## 🤔 What is NotifyX?
NotifyX is a lightweight, backend-agnostic JavaScript framework that abstracts away the notoriously complex, error-prone boilerplate of the browser Push API and Service Workers. It acts as a safety layer between your application and the user's operating system, providing a clean, predictable way to manage push subscriptions and ensure your notifications actually reach your users.

## 🚀 Quick Start
To get everything set up instantly, run the automated CLI in your project root:
```bash
npx @nandish029/notifyx init
```
This will ask you a few questions and set everything up for you automatically!

## 💡 Why does it exist?
Building Web Push from scratch is painful. Developers are forced to juggle VAPID keys, Service Worker lifecycles, base64 conversions, and obscure browser security rules. A single typo in your Service Worker scope can silently break notifications for all users.

**NotifyX was built to solve this by providing:**
* **A Bulletproof Core:** It handles the complex asynchronous logic of Service Workers and fails fast with descriptive `[NotifyX]` console warnings.
* **A Safe Hook System:** Safely tap into the notification lifecycle (`onSubscribe`, `onError`) without crashing your app.
* **The Copy-Paste Ecosystem:** We provide ready-to-use drop-in wrappers for React, Node.js, Python, and PHP so you don't have to write any raw Web Push code.

## 🚀 How useful is it?
Extremely. NotifyX turns a multi-day task (reading MDN documentation, debugging Service Workers, and writing encrypted backend payloads) into a 10-minute copy-paste job. It is entirely **payload-driven**, meaning your frontend UI doesn't need to be updated when you want to change how a notification looks—you control the text, icons, and click-routing entirely from your backend JSON.

## 🎯 Useful for what type of websites?
NotifyX is ideal for web apps that need to re-engage users when they navigate away or minimize the browser:
* 💬 **Real-time Chatbots:** Notify users when a long-running AI response is finally generated.
* 🛠️ **Service & Utility Apps:** Perfect for fast-paced apps where users need instant updates on a quick fix, ticket status, or background task.
* 📈 **Dashboards & SaaS:** Alert users to critical system failures, successful deployments, or billing updates.
* 🛒 **E-commerce:** Send abandoned cart reminders or flash sale alerts directly to a user's phone or desktop.

---

## ⚖️ Pros and Cons

### ✅ Pros
* **Zero Dependencies:** The core frontend framework is pure vanilla JavaScript.
* **Backend Independent:** Works flawlessly with Node.js, Python, PHP, Go, or any other backend.
* **Resilient:** Built-in timeout protection prevents infinite UI hangs if the browser API fails.
* **Developer Experience (DX):** Errors are highly descriptive and suggest immediate fixes.

### ❌ Cons
* **Dependent on Browser Support:** If a user is on a heavily outdated browser (or specific older versions of iOS Safari), push features may be limited.
* **No Offline Queuing:** If the user's device is completely powered off for an extended period, the push service may drop the message before they turn it back on.

---

## ⚠️ Limitations & Warnings

To use NotifyX effectively, you must respect the strict security boundaries enforced by modern web browsers:

1. 🔒 **HTTPS is Strictly Required:** The Push API will completely fail on `http://` (except for `localhost` during development). Browsers mandate this to prevent malicious actors from intercepting payloads.
2. 👆 **User Interaction Required:** Browsers aggressively block applications from asking for notification permissions on page load. You **must** trigger the subscription process via a direct user action (like clicking a "Turn on Notifications" button).
3. 🎨 **Visuals are OS-Dependent:** You cannot style push notifications with CSS. The notification is rendered by the operating system (macOS, Windows, Android). A notification that looks like a sleek dark card on Android may look like a plain white box on Windows.
4. 🧹 **Backend Cleanup is Mandatory:** If a user manually blocks notifications in their Chrome settings, NotifyX catches the resulting `410 Gone` error on your backend. You *must* ensure your backend deletes that dead subscription to prevent database bloat.

---

## 🧩 The Integrations Ecosystem

We don't just give you documentation; we give you the exact code. Check out our `integrations/` folder for production-ready, copy-paste wrappers for your favorite stack:

| Frontend | Backend | Location |
| :--- | :--- | :--- |
| **Vanilla JS** | Agnostic | Core Framework (`frontend/`) |
| **React / Next.js** | Agnostic | `integrations/frontend/react/` |
| **Node.js (Express)** | Agnostic | `integrations/backend/node-express/` |
| **Python (Flask)** | Agnostic | `integrations/backend/python-flask/` |
| **PHP (Raw / Laravel)** | Agnostic | `integrations/backend/php/` |

---

## 📚 Documentation Directory

For deep dives into the setup and payload structures, please consult the `docs/` folder:
* [Getting Started](docs/getting-started.md) - The step-by-step setup guide for the core framework.
* [API Reference](docs/api.md) - Core methods, configurations, and hooks.
* [Payload Design](docs/payload.md) - How to format your backend JSON messages.

## 📄 License
Released under the [MIT License](LICENSE).

---
*Note: This SDK was proudly architected and developed with the assistance of advanced Large Language Models (LLMs).*