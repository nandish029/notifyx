import { useState, useEffect, useCallback } from 'react';
import { setup@nandish029/notifyx, initNotifications, disableNotifications, getSubscriptionStatus } from '@nandish029/notifyx';

/**
 * ⚛️ use@nandish029/notifyx - Production-Grade React Hook
 * * WHY THIS EXISTS:
 * React components render multiple times. If we put vanilla JS directly into a component, 
 * it can cause infinite loops, memory leaks, or crash during Server-Side Rendering (SSR) in Next.js.
 * This hook isolates the framework logic safely away from the UI.
 */
export function use@nandish029/notifyx(publicKey) {
  // We use a strict string-based status rather than a simple boolean.
  // This allows the UI to show exactly what is happening.
  const [status, setStatus] = useState('loading'); // 'loading' | 'subscribed' | 'unsubscribed' | 'denied' | 'unsupported' | 'error'
  const [error, setError] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);

  // 1. Initial Boot & Status Check
  useEffect(() => {
    // Edge Case: Prevent crashes in Next.js/Remix where 'window' does not exist on the server.
    if (typeof window === 'undefined') {
      setStatus('unsupported');
      return;
    }

    if (!publicKey) {
      setStatus('error');
      setError('Missing VAPID Public Key.');
      return;
    }

    const initialize = async () => {
      try {
        // Safe to call multiple times; @nandish029/notifyx handles deduplication internally.
        setup@nandish029/notifyx({ publicKey });

        // Check if the browser even supports Push APIs
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          setStatus('unsupported');
          return;
        }

        // Check if the user previously hard-blocked notifications in browser settings
        if (Notification.permission === 'denied') {
          setStatus('denied');
          return;
        }

        // Quietly check if we already have an active subscription
        const currentSub = await getSubscriptionStatus();
        if (currentSub) {
          setSubscriptionData(currentSub);
          setStatus('subscribed');
        } else {
          setStatus('unsubscribed');
        }
      } catch (err) {
        setStatus('error');
        setError(err.message);
      }
    };

    initialize();
  }, [publicKey]);

  // 2. The Subscribe Action (Must be tied to a button click!)
  const subscribe = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const sub = await initNotifications();
      setSubscriptionData(sub);
      setStatus('subscribed');
      return sub; // Return the object so the developer can send it to their backend
    } catch (err) {
      // If the user clicks "Block" on the browser prompt, catch it here.
      if (err.message.includes('denied')) {
        setStatus('denied');
      } else {
        setStatus('error');
      }
      setError(err.message);
      return null;
    }
  }, []);

  // 3. The Unsubscribe Action
  const unsubscribe = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const success = await disableNotifications();
      if (success) {
        setSubscriptionData(null);
        setStatus('unsubscribed');
        return true; // Developer uses this true to delete from backend
      }
      throw new Error('Failed to disable locally.');
    } catch (err) {
      setStatus('error');
      setError(err.message);
      return false;
    }
  }, []);

  return { status, error, subscriptionData, subscribe, unsubscribe };
}