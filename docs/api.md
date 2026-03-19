# 📖 API Reference

@nandish029/notifyx exposes five primary exports. 

## `setup@nandish029/notifyx(config)`
Must be called exactly once before any other framework methods.

* **Arguments:**
  * `config` (Object):
    * `publicKey` *(string, required)*: Your VAPID public key.
    * `swPath` *(string, optional)*: Path to the service worker. Defaults to `'/sw.js'`.
    * `debug` *(boolean, optional)*: If `true`, prints detailed lifecycle logs to the console.
    * `hooks` *(Object, optional)*: Attach lifecycle callbacks.
      * `onPermissionDenied(status)`
      * `onSubscribe(subscription)`
      * `onUnsubscribe()`
      * `onError(error)`

## `initNotifications()`
Requests permission (if needed), registers the Service Worker, and generates a push subscription.
* **Returns:** `Promise<PushSubscription>`
* **Throws:** Throws an error if permission is denied, VAPID key is invalid, or the browser does not support Push.

## `disableNotifications()`
Unsubscribes the current device locally. 
* **Returns:** `Promise<boolean>` (true if successful).
* **Important:** This only stops the browser from receiving notifications. You **must** also delete the subscription record from your backend database.

## `getSubscriptionStatus()`
Quietly checks if the user is already subscribed without triggering any browser permission prompts. Ideal for checking initial UI state on page load.
* **Returns:** `Promise<PushSubscription | null>`

## `VERSION`
* **Returns:** `string` (e.g., "1.1.0").