// notifyx/frontend/utils.js

/**
 * 🔐 WHY THIS FUNCTION EXISTS:
 *
 * The Push API requires the VAPID public key in a special binary format (Uint8Array),
 * but we usually store/send it as a Base64 string.
 *
 * This function converts:
 *   Base64 string → Uint8Array
 *
 * Without this conversion, subscription will FAIL.
 */
export function urlBase64ToUint8Array(base64String) {
  // Add padding if missing (Base64 requirement)
  const padding = '='.repeat((4 - base64String.length % 4) % 4);

  // Replace URL-safe characters with standard Base64 characters
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  // Decode Base64 string into raw binary string
  const rawData = window.atob(base64);

  // Convert raw string → Uint8Array
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * ⏱ WHY THIS FUNCTION EXISTS:
 *
 * Some browser APIs (like serviceWorker.ready) can hang forever
 * if something goes wrong internally.
 *
 * This function ensures:
 * 👉 We NEVER wait forever
 * 👉 We fail fast with a clear error
 *
 * This is CRITICAL for production reliability.
 */
export function withTimeout(
  promise,
  ms = 5000,
  timeoutMessage = '[NotifyX] Operation timed out'
) {
  return Promise.race([
    promise,

    // Timeout promise that rejects after given time
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), ms)
    ),
  ]);
}