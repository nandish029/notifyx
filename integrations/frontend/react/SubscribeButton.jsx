import React from 'react';
import { useNotifyX } from './useNotifyX';

/**
 * ⚛️ SubscribeButton - Drop-in UI Component
 * * Props:
 * @param {string} publicKey - Your VAPID Public Key
 * @param {function} onSubscribeSuccess - Passes the subscription object to send to your backend
 * @param {function} onUnsubscribeSuccess - Triggers when you need to delete the backend record
 */
export default function SubscribeButton({ publicKey, onSubscribeSuccess, onUnsubscribeSuccess }) {
  const { status, error, subscriptionData, subscribe, unsubscribe } = useNotifyX(publicKey);

  const handleToggle = async () => {
    if (status === 'subscribed') {
      const success = await unsubscribe();
      if (success && onUnsubscribeSuccess) {
        onUnsubscribeSuccess(); // Tell backend to delete
      }
    } else {
      const sub = await subscribe();
      if (sub && onSubscribeSuccess) {
        onSubscribeSuccess(sub); // Tell backend to save
      }
    }
  };

  // 🎨 State-Driven UI Rendering
  if (status === 'unsupported') {
    return <button disabled>Push Not Supported in this Browser</button>;
  }

  if (status === 'denied') {
    return (
      <div style={{ color: 'red', fontSize: '14px' }}>
        <p>Notifications are blocked.</p>
        <small>Please enable them in your browser site settings.</small>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <button 
        onClick={handleToggle} 
        disabled={status === 'loading'}
        style={{
          padding: '10px 16px',
          cursor: status === 'loading' ? 'wait' : 'pointer',
          backgroundColor: status === 'subscribed' ? '#ef4444' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 'bold'
        }}
      >
        {status === 'loading' && 'Processing...'}
        {status === 'subscribed' && '🔕 Turn Off Notifications'}
        {status === 'unsubscribed' && '🔔 Turn On Notifications'}
        {status === 'error' && 'Retry Setup'}
      </button>

      {/* Surface framework errors smoothly to the UI if needed */}
      {error && <span style={{ color: '#ef4444', fontSize: '12px' }}>{error}</span>}
    </div>
  );
}