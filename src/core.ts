// src/core.ts

import { urlBase64ToUint8Array, withTimeout } from './utils.js';
import { NotifyXConfig, NotifyXHooks } from './types.js';

export const VERSION = "2.0.0";

let isConfigured = false;
let cachedApplicationServerKey: Uint8Array | null = null;

let config: Required<Omit<NotifyXConfig, 'hooks'>> & { hooks: NotifyXHooks } = {
  publicKey: '',
  swPath: '/sw.js',
  hooks: {},
  debug: false,
};

function logDebug(message: string, ...args: any[]) {
  if (config.debug) {
    console.log(`[NotifyX DEBUG] ${message}`, ...args);
  }
}

function runHookSafe<K extends keyof NotifyXHooks>(hookName: K, payload?: any) {
  if (config.hooks && typeof config.hooks[hookName] === 'function') {
    try {
      (config.hooks[hookName] as Function)(payload);
    } catch (err: any) {
      console.warn(`[NotifyX] Hook "${hookName}" failed: ${err.message}`);
    }
  }
}

export function setupNotifyX(userConfig: NotifyXConfig) {
  if (isConfigured) {
    throw new Error('[NotifyX] setupNotifyX() already called.');
  }

  const isSecure = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';

  if (!isSecure) {
    console.warn('[NotifyX] Push requires HTTPS or localhost. This may fail.');
  }

  if (!userConfig || typeof userConfig.publicKey !== 'string') {
    throw new Error('[NotifyX] publicKey is required and must be a string.');
  }

  config.publicKey = userConfig.publicKey;
  config.debug = !!userConfig.debug;

  try {
    cachedApplicationServerKey = urlBase64ToUint8Array(config.publicKey);
  } catch (err) {
    throw new Error('[NotifyX] Invalid VAPID publicKey format.');
  }

  if (userConfig.swPath) {
    if (!userConfig.swPath.startsWith('/')) {
      console.warn('[NotifyX] swPath should start with "/" for proper scope.');
    }
    config.swPath = userConfig.swPath;
  }

  config.hooks = Object.freeze({ ...(userConfig.hooks || {}) });
  isConfigured = true;

  logDebug('Framework initialized');
}

export async function getSubscriptionStatus(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.getRegistration(config.swPath);
    if (!registration) return null;
    return await registration.pushManager.getSubscription();
  } catch (err) {
    logDebug('Subscription check failed', err);
    return null;
  }
}

export async function initNotifications(): Promise<PushSubscription> {
  if (!isConfigured) {
    throw new Error('[NotifyX] setupNotifyX() must be called first.');
  }

  if (!('Notification' in window)) {
    throw new Error('[NotifyX] Notification API not supported.');
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('[NotifyX] Push API not supported.');
  }

  if (Notification.permission === 'denied') {
    const err = new Error('[NotifyX] Notifications are blocked. Enable from browser settings.');
    runHookSafe('onPermissionDenied', 'denied');
    runHookSafe('onError', err);
    throw err;
  }

  try {
    if (Notification.permission === 'default') {
      logDebug('Requesting permission...');
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        runHookSafe('onPermissionDenied', permission);
        throw new Error('[NotifyX] Permission denied.');
      }
    }

    let registration = await navigator.serviceWorker.getRegistration(config.swPath) || null;

    if (!registration) {
      logDebug('Registering Service Worker...');
      // Register SW if missing. We don't overwrite existing SWs natively here 
      // to avoid conflicting with tools like Next.js PWA or Workbox.
      registration = await navigator.serviceWorker.register(config.swPath);
    } else {
      logDebug('Using existing Service Worker');
    }

    // Critical: Service Workers can sometimes hang in the "installing" phase
    // if the user has a poor connection or another SW is waiting. We enforce a 10s timeout
    // to prevent the frontend UI from freezing indefinitely.
    await withTimeout(navigator.serviceWorker.ready, 10000, '[NotifyX] Service Worker timed out');

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      logDebug('Creating subscription...');
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true, // Required by Chrome to prevent silent tracking
        applicationServerKey: cachedApplicationServerKey as any,
      });
    } else {
      logDebug('Reusing existing subscription');
    }

    runHookSafe('onSubscribe', subscription);
    return subscription;
  } catch (err: any) {
    runHookSafe('onError', err);
    if (err.message.startsWith('[NotifyX]')) throw err;
    throw new Error(`[NotifyX] Failed: ${err.message}`);
  }
}

export async function disableNotifications(): Promise<boolean> {
  if (!isConfigured) {
    throw new Error('[NotifyX] setupNotifyX() must be called first.');
  }

  const subscription = await getSubscriptionStatus();
  if (!subscription) {
    logDebug('No subscription found');
    return true;
  }

  try {
    const success = await subscription.unsubscribe();
    if (success) {
      console.warn('[NotifyX] Subscription removed. Also delete it from backend.');
      runHookSafe('onUnsubscribe');
    }
    return success;
  } catch (err: any) {
    let error: Error;
    if (Notification.permission === 'denied') {
      error = new Error('[NotifyX] Unsubscribe failed: permission revoked.');
    } else {
      error = new Error(`[NotifyX] Unsubscribe failed: ${err.message}`);
    }
    runHookSafe('onError', error);
    console.warn(error.message);
    return false;
  }
}