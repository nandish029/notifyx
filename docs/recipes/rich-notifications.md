# 🖼️ Rich Notifications (Images & Buttons)

NotifyX natively supports modern browser features like large banner images and interactive action buttons. 

Because the NotifyX Service Worker (`sw.js`) handles the heavy lifting, you don't need to write any extra frontend code to use these. You simply need to update the JSON payload you send from your **backend**.

## The Payload Structure

To trigger a rich notification, format your backend push payload like this:

```json
{
  "title": "🎉 Big Summer Sale!",
  "body": "All vibecoding courses are 50% off for the next 24 hours.",
  "icon": "[https://yourdomain.com/icons/logo-192x192.png](https://yourdomain.com/icons/logo-192x192.png)",
  "image": "[https://yourdomain.com/images/summer-sale-banner.jpg](https://yourdomain.com/images/summer-sale-banner.jpg)",
  "url": "/sales/summer",
  "actions": [
    {
      "action": "shop_now",
      "title": "🛒 Shop Now",
      "url": "/sales/summer"
    },
    {
      "action": "dismiss",
      "title": "❌ Ignore"
    }
  ]
}
```

## How It Works

1. **`image`**: This string must be a secure (`https://`) URL pointing to an image. The browser will      automatically display this as a large hero graphic below the text.
2. **`actions`**: An array of buttons to display. 
    * `action`: The internal ID of the button (used by the Service Worker).
    * `title`: The text the user actually sees on the button.
    * `url`: (NotifyX Custom Feature) If the user clicks this specific button, NotifyX will open a new tab to this exact URL instead of the default notification URL.

## ⚠️ Important Limitations
* **Browser Support:** Rich notifications look different on every operating system. Windows 11, macOS, and Android all render large images differently.
* **Image Size:** Keep your banner images under 1MB to ensure they load quickly before the notification times out. A 2:1 aspect ratio (e.g., 800x400) usually looks best.