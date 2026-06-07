# 📦 Payload Design

NotifyX is a **payload-driven** framework. The frontend code does not dictate what the notification looks like; your backend does. 

When your backend triggers a push, it should send a JSON payload structured exactly like this. The NotifyX Service Worker will parse this and render the native OS notification.

## The Standard Schema

```json
{
  "title": "John Doe sent you a message",
  "body": "Hey, are we still meeting at 5 PM?",
  "icon": "https://myapp.com/avatars/john.png",
  "url": "/chat/room-123",
  "tag": "chat-john-doe",
  "actions": [
    { "action": "reply", "title": "Reply Now" },
    { "action": "ignore", "title": "Dismiss" }
  ]
}
```

### Field Breakdown:
* **`title`** *(string)*: The bold header of the notification.
* **`body`** *(string)*: The main text content.
* **`icon`** *(string)*: URL to an image (usually a logo or user avatar).
* **`url`** *(string)*: **Crucial.** Where should the browser navigate to when the user clicks the notification? NotifyX handles opening the tab automatically.
* **`tag`** *(string)*: Used to group notifications. If you send three notifications with the tag `chat-john-doe`, the OS will group them or overwrite the previous ones, rather than spamming the screen with three separate boxes.
* **`actions`** *(array)*: Creates interactive buttons on the notification (Note: Supported on Android and Windows, generally ignored by macOS).

### 🎛️ Advanced OS Controls
You can directly control how the Operating System displays the notification by adding these optional flags to your JSON payload:

* **`requireInteraction`** *(boolean)*: If `true`, the notification will stay on the user's screen indefinitely until they manually click it or dismiss it. Perfect for highly urgent alerts.
* **`silent`** *(boolean)*: If `true`, the notification will be delivered quietly (no sound, no vibration). Great for background syncing or low-priority updates.
* **`vibrate`** *(array of numbers)*: A custom vibration pattern for Android devices (e.g., `[200, 100, 200]` vibrates for 200ms, pauses 100ms, vibrates 200ms).
* **`renotify`** *(boolean)*: If `true` (default), sending a new notification with the same `tag` will cause the device to vibrate/alert again. If `false`, the notification will update silently in the background.
* **`forceOSPopup`** *(boolean)*: **[New in v2.0.0]** By default, NotifyX is intelligent and will *suppress* the OS popup if the user is actively staring at your web app, and instead silently fire an in-app `postMessage`. Set this to `true` to override that behavior and force the loud OS popup even if the tab is focused!

**🤔 What if my backend sends invalid JSON?**
NotifyX has built-in fallback protection. If your backend sends a broken payload, NotifyX catches the error and displays a generic "You have a new update" message. This guarantees the Service Worker lifecycle doesn't crash.

---

## 🖼️ Rich Notifications (Images & Buttons)
NotifyX natively supports modern browser features like large banner images and interactive action buttons. Because the NotifyX Service Worker handles the heavy lifting, you don't need to write any extra frontend code to use these. You simply need to update the JSON payload you send from your backend!

### How It Works
* **`image`**: This string must be a secure (`https://`) URL pointing to an image. The browser will automatically display this as a large hero graphic below the text.
* **`actions`**: An array of buttons to display. 
    * `action`: The internal ID of the button (used by the Service Worker).
    * `title`: The text the user actually sees on the button.
    * `url`: (NotifyX Custom Feature) If the user clicks this specific button, NotifyX will open a new tab to this exact URL instead of the default notification URL.

### ⚠️ Important Limitations
* **Browser Support:** Rich notifications look different on every operating system. Windows 11, macOS, and Android all render large images differently.
* **Image Size:** Keep your banner images under 1MB to ensure they load quickly before the notification times out. A 2:1 aspect ratio (e.g., 800x400) usually looks best.