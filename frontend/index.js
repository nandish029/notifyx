// notifyx/frontend/index.js

/**
 * 🌐 PUBLIC API
 *
 * This file acts as the entry point for developers.
 * They should ONLY import from here — not from core.js directly.
 *
 * WHY?
 * → Allows us to change internal structure later without breaking user code
 */

export {
  VERSION,
  setupNotifyX,
  initNotifications,
  disableNotifications,
  getSubscriptionStatus,
} from './core.js';