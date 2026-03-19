# 🤝 Contributing to @nandish029/notifyx

First off, thank you for joining the @nandish029/notifyx mission! 🚀

Our goal is to make Web Push Notifications so simple that any developer, regardless of their tech stack, can implement them in under 10 minutes. We especially want to support **Vibecoders** who want drop-in, AI-friendly solutions.

While the core @nandish029/notifyx engine is written in Vanilla JavaScript, the true power of this framework lies in our **Integrations Ecosystem**.

## 🎯 What we need help with
We are actively looking for community contributions to expand our `integrations/` and `examples/` folders.

**High Priority Targets:**
* 🟢 **Vue.js** (Composables & Components)
* 🟠 **Svelte** (Actions & Components)
* 🔴 **Angular** (Services & Directives)
* 🔵 **Go / Golang** (Backend Routers)
* 💎 **Ruby on Rails** (Backend Controllers)

## 🏗️ How to build an Integration (The "Vibe" Rule)

If you want to build a drop-in integration, follow the **"Copy-Paste"** philosophy. A developer should not have to write Web Push logic; they should only have to copy your files into their project and see it work.

### 1. Structure
Create a new folder under `integrations/frontend/[framework]` or `integrations/backend/[language]`.

### 2. The Code Standard
* **Frontend Wrappers:** Must be Server-Side Rendering (SSR) safe (e.g., Check if `window` exists).
* **Backend Wrappers:** Must gracefully catch **410 Gone** errors. Include a clear comment or mock function showing where to delete a dead subscription from the database.
* **No Bloat:** Only use necessary libraries (like `web-push`). Keep the code clean and focused.

### 3. The `instructions.md` File
Every integration **must** include an `instructions.md` file. 
* Use simple, "Post Office" vs "Security Guard" analogies.
* Explain the **Why** behind steps (like moving the `sw.js`).
* Provide a clear, copy-paste example.

### 📝 Adding Examples
If you have a cool implementation (e.g., @nandish029/notifyx with Tailwind CSS or a Chatbot UI), please add it to the `examples/` folder!
* **Rule:** Never include real VAPID keys. Use placeholders.

## 🚀 Pull Request Process

1. **Fork** the repository and clone it.
2. **Branch** off of `main` (e.g., `git checkout -b feature/vue-integration`).
3. **Write** your integration and documentation.
4. **Commit** with a clear message.
5. **Push** and submit a Pull Request.

**Note on Reviews:** I review all PRs to ensure they follow the @nandish029/notifyx philosophy of simplicity and strict error handling. If you are an expert in a framework I'm not familiar with, I may ask for your help in explaining the "why" behind your code! Let's build this together.

## 💬 Code of Conduct
Be kind, be helpful. We were all beginners once. Aim to educate and empower other developers.

*This framework was proudly architected and developed with the assistance of ChatGPT and Gemini.*