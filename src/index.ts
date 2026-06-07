// src/index.ts

export {
  VERSION,
  setupNotifyX,
  initNotifications,
  disableNotifications,
  getSubscriptionStatus,
} from './core.js';

export type {
  NotifyXConfig,
  NotifyXHooks,
  PushPayload,
  PushAction,
} from './types.js';