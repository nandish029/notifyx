# 📦 Payload Design

NotifyX is a **payload-driven** framework. The frontend code does not dictate what the notification looks like; your backend does. 

When your backend triggers a push, it should send a JSON payload structured exactly like this. The NotifyX Service Worker will parse this and render the native OS notification.

## The Standard Schema

\`\`\`json
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
\`\`\`

### Field Breakdown:
* **`title`** *(string)*: The bold header of the notification.
* **`body`** *(string)*: The main text content.
* **`icon`** *(string)*: URL to an image (usually a logo or user avatar).
* **`url`** *(string)*: **Crucial.** Where should the browser navigate to when the user clicks the notification? NotifyX handles opening the tab automatically.
* **`tag`** *(string)*: Used to group notifications. If you send three notifications with the tag `chat-john-doe`, the OS will group them or overwrite the previous ones, rather than spamming the screen with three separate boxes.
* **`actions`** *(array)*: Creates interactive buttons on the notification (Note: Supported on Android and Windows, generally ignored by macOS).

**🤔 What if my backend sends invalid JSON?**
NotifyX has built-in fallback protection. If your backend sends a broken payload, NotifyX catches the error and displays a generic "You have a new update" message. This guarantees the Service Worker lifecycle doesn't crash.