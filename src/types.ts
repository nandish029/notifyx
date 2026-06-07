// src/types.ts

export interface NotifyXHooks {
  onSubscribe?: (subscription: PushSubscription) => void;
  onUnsubscribe?: () => void;
  onPermissionDenied?: (permission: string) => void;
  onError?: (error: Error) => void;
}

export interface NotifyXConfig {
  publicKey: string;
  swPath?: string;
  hooks?: NotifyXHooks;
  debug?: boolean;
}

export interface PushAction {
  action: string;
  title: string;
  icon?: string;
  url?: string;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  badge?: string;
  tag?: string;
  url?: string;
  actions?: PushAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  renotify?: boolean;
  dir?: 'auto' | 'ltr' | 'rtl';
  forceOSPopup?: boolean;
}
