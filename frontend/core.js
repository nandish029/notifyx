// @nandish029/notifyx/frontend/core.js

import { urlBase64ToUint8Array, withTimeout } from './utils.js';

/**
 * 📦 VERSION
 * Helps debugging and future upgrades
 */
export const VERSION = "1.1.0";

/**
 * 🧠 INTERNAL STATE (PRIVATE)
 */
let isConfigured = false;
let cachedApplicationServerKey = null;

/**
 * Global configuration object
 */
let config = {
  publicKey: null,
  swPath: '/sw.js',
  hooks: {},
  debug: false,
};

/**
 * 🐛 Debug logger (only logs if debug enabled)
 */
function logDebug(message, ...args) {
  if (config.debug) {
    console.log(`[@nandish029/notifyx DEBUG] ${message}`, ...args);
  }
}

/**
 * 🪝 Safe hook execution
 *
 * WHY:
 * If user writes bad hook → framework should NOT crash
 */
function runHookSafe(hookName, payload = null) {
  if (config.hooks && typeof config.hooks[hookName] === 'function') {
    try {
      config.hooks[hookName](payload);
    } catch (err) {
      console.warn(`[@nandish029/notifyx] Hook "${hookName}" failed: ${err.message}`);
    }
  }
}

/**
 * 🚀 setup@nandish029/notifyx()
 *
 * MUST be called once before anything else
 */
export function setup@nandish029/notifyx(userConfig) {
  // ❌ Prevent duplicate setup
  if (isConfigured) {
    throw new Error('[@nandish029/notifyx] setup@nandish029/notifyx() already called.');
  }

  // 🔐 Check HTTPS requirement
  const isSecure =
    window.isSecureContext ||
    location.protocol === 'https:' ||
    location.hostname === 'localhost';

  if (!isSecure) {
    console.warn(
      '[@nandish029/notifyx] Push requires HTTPS or localhost. This may fail.'
    );
  }

  // ❌ Validate publicKey
  if (!userConfig || typeof userConfig.publicKey !== 'string') {
    throw new Error('[@nandish029/notifyx] publicKey is required and must be a string.');
  }

  // Store config
  config.publicKey = userConfig.publicKey;
  config.debug = !!userConfig.debug;

  // ⚡ Convert and cache VAPID key immediately
  try {
    cachedApplicationServerKey = urlBase64ToUint8Array(config.publicKey);
  } catch (err) {
    throw new Error('[@nandish029/notifyx] Invalid VAPID publicKey format.');
  }

  // Service worker path handling
  if (userConfig.swPath) {
    if (!userConfig.swPath.startsWith('/')) {
      console.warn(
        '[@nandish029/notifyx] swPath should start with "/" for proper scope.'
      );
    }
    config.swPath = userConfig.swPath;
  }

  // 🪝 Freeze hooks (immutability)
  config.hooks = Object.freeze(userConfig.hooks || {});

  isConfigured = true;

  logDebug('Framework initialized');
}

/**
 * 🔍 getSubscriptionStatus()
 *
 * Used to check if user already subscribed
 */
export async function getSubscriptionStatus() {
  if (!('serviceWorker' in navigator)) return null;

  try {
    let registration =
      (await navigator.serviceWorker.getRegistration(config.swPath)) ||
      (await navigator.serviceWorker.ready);

    if (!registration) return null;

    return await registration.pushManager.getSubscription();
  } catch (err) {
    logDebug('Subscription check failed', err);
    return null;
  }
}

/**
 * 🔔 initNotifications()
 *
 * Main function:
 * - Ask permission
 * - Register SW
 * - Create / reuse subscription
 */
export async function initNotifications() {
  if (!isConfigured) {
    throw new Error('[@nandish029/notifyx] setup@nandish029/notifyx() must be called first.');
  }

  if (!('Notification' in window)) {
    throw new Error('[@nandish029/notifyx] Notification API not supported.');
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('[@nandish029/notifyx] Push API not supported.');
  }

  // ❌ If already denied → cannot ask again
  if (Notification.permission === 'denied') {
    const err = new Error(
      '[@nandish029/notifyx] Notifications are blocked. Enable from browser settings.'
    );

    runHookSafe('onPermissionDenied', 'denied');
    runHookSafe('onError', err);

    throw err;
  }

  try {
    // 🧠 Ask permission only if needed
    if (Notification.permission === 'default') {
      logDebug('Requesting permission...');
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        runHookSafe('onPermissionDenied', permission);
        throw new Error('[@nandish029/notifyx] Permission denied.');
      }
    }

    // ⚙️ Register or reuse SW
    let registration =
      (await navigator.serviceWorker.getRegistration(config.swPath)) || null;

    if (!registration) {
      logDebug('Registering Service Worker...');
      registration = await navigator.serviceWorker.register(config.swPath);
    } else {
      logDebug('Using existing Service Worker');
    }

    // ⏱ Ensure SW ready (with timeout protection)
    await withTimeout(
      navigator.serviceWorker.ready,
      10000,
      '[@nandish029/notifyx] Service Worker timed out'
    );

    // 🔁 Check existing subscription
    let subscription = await registration.pushManager.getSubscription();

    // ➕ Create new if not exists
    if (!subscription) {
      logDebug('Creating subscription...');
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: cachedApplicationServerKey,
      });
    } else {
      logDebug('Reusing existing subscription');
    }

    runHookSafe('onSubscribe', subscription);

    return subscription;
  } catch (err) {
    runHookSafe('onError', err);

    if (err.message.startsWith('[@nandish029/notifyx]')) throw err;

    throw new Error(`[@nandish029/notifyx] Failed: ${err.message}`);
  }
}

/**
 * ❌ disableNotifications()
 *
 * Removes subscription
 */
export async function disableNotifications() {
  if (!isConfigured) {
    throw new Error('[@nandish029/notifyx] setup@nandish029/notifyx() must be called first.');
  }

  const subscription = await getSubscriptionStatus();

  if (!subscription) {
    logDebug('No subscription found');
    return true;
  }

  try {
    const success = await subscription.unsubscribe();

    if (success) {
      console.warn(
        '[@nandish029/notifyx] Subscription removed. Also delete it from backend.'
      );

      runHookSafe('onUnsubscribe');
    }

    return success;
  } catch (err) {
    let error;

    if (Notification.permission === 'denied') {
      error = new Error(
        '[@nandish029/notifyx] Unsubscribe failed: permission revoked.'
      );
    } else {
      error = new Error(
        `[@nandish029/notifyx] Unsubscribe failed: ${err.message}`
      );
    }

    runHookSafe('onError', error);
    console.warn(error.message);

    return false;
  }
}