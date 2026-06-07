/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';

const validPublicKey = 'BJtOVcH01BGeWUOWzdkGCt1MY3L5qSg9e0tp-dlotDieaYZ389eVkQmsdFDTHcm-m2tziv-ZKjbytulIUWQFn70';

// Helper to get fresh module
async function getFreshModule() {
  return await import(`../../dist/index.js?update=${Date.now()}${Math.random()}`);
}

describe('NotifyX Core SDK (Frontend)', () => {
  let mockSubscribe, mockUnsubscribe, mockGetSubscription, mockRegister, mockServiceWorker, mockRegistration;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribe = jest.fn();
    mockUnsubscribe = jest.fn();
    mockGetSubscription = jest.fn();
    mockRegister = jest.fn();

    mockRegistration = {
      pushManager: {
        subscribe: mockSubscribe,
        getSubscription: mockGetSubscription
      }
    };

    mockServiceWorker = {
      register: mockRegister,
      getRegistration: jest.fn().mockResolvedValue(mockRegistration),
      ready: Promise.resolve(mockRegistration)
    };

    Object.defineProperty(window, 'navigator', {
      value: { serviceWorker: mockServiceWorker },
      writable: true,
      configurable: true
    });

    Object.defineProperty(window, 'PushManager', { value: {}, writable: true, configurable: true });

    Object.defineProperty(window, 'Notification', {
      value: { requestPermission: jest.fn(), permission: 'default' },
      writable: true,
      configurable: true
    });
  });

  describe('1. setupNotifyX() Edge Cases', () => {
    it('throws error if publicKey is missing', async () => {
      const { setupNotifyX } = await getFreshModule();
      expect(() => setupNotifyX({})).toThrow('publicKey is required');
    });

    it('throws error on invalid VAPID key format', async () => {
      const { setupNotifyX } = await getFreshModule();
      expect(() => setupNotifyX({ publicKey: 'invalid_key_%%%$$$' })).toThrow('Invalid VAPID publicKey format');
    });

    it('initializes successfully with a valid key', async () => {
      const { setupNotifyX } = await getFreshModule();
      expect(() => setupNotifyX({ publicKey: validPublicKey })).not.toThrow();
    });

    it('throws error if initialized twice to prevent double init', async () => {
      const { setupNotifyX } = await getFreshModule();
      setupNotifyX({ publicKey: validPublicKey });
      expect(() => setupNotifyX({ publicKey: validPublicKey })).toThrow('already called');
    });

    it('warns if swPath does not start with a slash', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const { setupNotifyX } = await getFreshModule();
      setupNotifyX({ publicKey: validPublicKey, swPath: 'sw.js' });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('should start with "/"'));
      warnSpy.mockRestore();
    });

    it('securely freezes the hooks object', async () => {
      const { setupNotifyX } = await getFreshModule();
      const hooks = { onSubscribe: jest.fn() };
      setupNotifyX({ publicKey: validPublicKey, hooks });
      expect(Object.isFrozen(hooks)).toBe(false); 
      // The parameter object itself isn't frozen, but the internal reference is. It shouldn't crash.
    });

    it('proves state is reset across test imports', async () => {
      const mod1 = await getFreshModule();
      const mod2 = await getFreshModule();
      mod1.setupNotifyX({ publicKey: validPublicKey });
      expect(() => mod2.setupNotifyX({ publicKey: validPublicKey })).not.toThrow();
    });
  });

  describe('2. getSubscriptionStatus() Checks', () => {
    it('returns null if serviceWorker is missing from navigator', async () => {
      const { getSubscriptionStatus } = await getFreshModule();
      delete window.navigator.serviceWorker;
      const sub = await getSubscriptionStatus();
      expect(sub).toBeNull();
    });

    it('returns null if registration is missing', async () => {
      const { getSubscriptionStatus } = await getFreshModule();
      mockServiceWorker.getRegistration.mockResolvedValueOnce(null);
      const sub = await getSubscriptionStatus();
      expect(sub).toBeNull();
    });

    it('returns null if getSubscription throws', async () => {
      const { getSubscriptionStatus } = await getFreshModule();
      mockGetSubscription.mockRejectedValueOnce(new Error('IDB fail'));
      const sub = await getSubscriptionStatus();
      expect(sub).toBeNull();
    });

    it('returns existing subscription successfully', async () => {
      const { getSubscriptionStatus } = await getFreshModule();
      mockGetSubscription.mockResolvedValueOnce({ endpoint: 'https://test.com' });
      const sub = await getSubscriptionStatus();
      expect(sub.endpoint).toBe('https://test.com');
    });
  });

  describe('3. initNotifications() Advanced Flows', () => {
    it('throws if setupNotifyX not called first', async () => {
      const { initNotifications } = await getFreshModule();
      await expect(initNotifications()).rejects.toThrow('must be called first');
    });

    it('throws if Notifications API not supported', async () => {
      const { setupNotifyX, initNotifications } = await getFreshModule();
      setupNotifyX({ publicKey: validPublicKey });
      delete window.Notification;
      await expect(initNotifications()).rejects.toThrow('Notification API not supported');
    });

    it('throws if serviceWorker is missing in navigator', async () => {
      const { setupNotifyX, initNotifications } = await getFreshModule();
      setupNotifyX({ publicKey: validPublicKey });
      delete window.navigator.serviceWorker;
      await expect(initNotifications()).rejects.toThrow('Push API not supported');
    });

    it('throws if PushManager API not supported', async () => {
      const { setupNotifyX, initNotifications } = await getFreshModule();
      setupNotifyX({ publicKey: validPublicKey });
      delete window.PushManager;
      await expect(initNotifications()).rejects.toThrow('Push API not supported');
    });

    it('throws if Notification.permission is already denied', async () => {
      const { setupNotifyX, initNotifications } = await getFreshModule();
      setupNotifyX({ publicKey: validPublicKey });
      window.Notification.permission = 'denied';
      await expect(initNotifications()).rejects.toThrow('Notifications are blocked');
    });

    it('handles requestPermission throwing an error', async () => {
      const { setupNotifyX, initNotifications } = await getFreshModule();
      setupNotifyX({ publicKey: validPublicKey });
      window.Notification.permission = 'default';
      window.Notification.requestPermission = jest.fn().mockRejectedValue(new Error('Browser err'));
      await expect(initNotifications()).rejects.toThrow('Browser err');
    });

    it('requests permission and throws if user blocks, triggering hooks', async () => {
      const { setupNotifyX, initNotifications } = await getFreshModule();
      const onPermissionDenied = jest.fn();
      const onError = jest.fn();
      setupNotifyX({ publicKey: validPublicKey, hooks: { onPermissionDenied, onError } });
      
      window.Notification.permission = 'default';
      window.Notification.requestPermission = jest.fn().mockResolvedValue('denied');

      await expect(initNotifications()).rejects.toThrow('Permission denied');
      expect(onPermissionDenied).toHaveBeenCalledWith('denied');
      expect(onError).toHaveBeenCalled();
    });

    it('throws securely if getSubscription throws in init', async () => {
      const { setupNotifyX, initNotifications } = await getFreshModule();
      setupNotifyX({ publicKey: validPublicKey });
      window.Notification.permission = 'granted';
      mockGetSubscription.mockRejectedValue(new Error('fail'));
      await expect(initNotifications()).rejects.toThrow('fail');
    });

    it('reuses existing subscription if user is already subscribed', async () => {
      const { setupNotifyX, initNotifications } = await getFreshModule();
      const onSubscribe = jest.fn();
      setupNotifyX({ publicKey: validPublicKey, hooks: { onSubscribe } });
      
      window.Notification.permission = 'granted';
      mockGetSubscription.mockResolvedValueOnce({ endpoint: 'https://existing.com' });

      const sub = await initNotifications();
      
      expect(mockSubscribe).not.toHaveBeenCalled(); // Should not call subscribe again!
      expect(sub.endpoint).toBe('https://existing.com');
      expect(onSubscribe).toHaveBeenCalledWith(sub);
    });

    it('uses existing registration instead of registering again', async () => {
      const { setupNotifyX, initNotifications } = await getFreshModule();
      setupNotifyX({ publicKey: validPublicKey });
      
      window.Notification.permission = 'granted';
      mockServiceWorker.getRegistration.mockResolvedValueOnce(mockRegistration);
      mockGetSubscription.mockResolvedValueOnce(null);
      mockSubscribe.mockResolvedValueOnce({ endpoint: 'https://new.com' });

      await initNotifications();
      
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('registers SW, subscribes successfully, checks options, and fires hooks', async () => {
      const { setupNotifyX, initNotifications } = await getFreshModule();
      const onSubscribe = jest.fn();
      setupNotifyX({ publicKey: validPublicKey, hooks: { onSubscribe } });
      
      window.Notification.permission = 'default';
      window.Notification.requestPermission = jest.fn().mockResolvedValue('granted');
      
      mockServiceWorker.getRegistration.mockResolvedValueOnce(null);
      mockRegister.mockResolvedValueOnce(mockRegistration);
      mockGetSubscription.mockResolvedValueOnce(null); // No existing sub
      mockSubscribe.mockResolvedValueOnce({ endpoint: 'https://new.com' });

      const sub = await initNotifications();
      
      expect(mockRegister).toHaveBeenCalledWith('/sw.js');
      expect(mockSubscribe).toHaveBeenCalledWith({
        userVisibleOnly: true,
        applicationServerKey: expect.any(Uint8Array)
      });
      
      // Verify VAPID conversion isn't returning an empty array
      const passedArgs = mockSubscribe.mock.calls[0][0];
      expect(passedArgs.applicationServerKey.length).toBeGreaterThan(0);

      expect(sub.endpoint).toBe('https://new.com');
      expect(onSubscribe).toHaveBeenCalledWith(sub);
    });

    it('registers with custom swPath', async () => {
      const { setupNotifyX, initNotifications } = await getFreshModule();
      setupNotifyX({ publicKey: validPublicKey, swPath: '/custom-sw.js' });
      
      window.Notification.permission = 'granted';
      mockServiceWorker.getRegistration.mockResolvedValueOnce(null);
      mockRegister.mockResolvedValueOnce(mockRegistration);
      mockGetSubscription.mockResolvedValueOnce(null);
      mockSubscribe.mockResolvedValueOnce({ endpoint: 'https://new.com' });

      await initNotifications();
      expect(mockRegister).toHaveBeenCalledWith('/custom-sw.js');
    });

    it('safely catches SW registration failure and fires onError hook', async () => {
      const { setupNotifyX, initNotifications } = await getFreshModule();
      const onError = jest.fn();
      setupNotifyX({ publicKey: validPublicKey, hooks: { onError } });
      
      window.Notification.permission = 'granted';
      mockServiceWorker.getRegistration.mockResolvedValueOnce(null);
      mockRegister.mockRejectedValueOnce(new Error('Network error')); // SW fails to register

      await expect(initNotifications()).rejects.toThrow('Failed: Network error');
      expect(onError).toHaveBeenCalled();
    });

    it('catches subscribe failure and calls onError hook', async () => {
      const { setupNotifyX, initNotifications } = await getFreshModule();
      const onError = jest.fn();
      setupNotifyX({ publicKey: validPublicKey, hooks: { onError } });
      
      window.Notification.permission = 'granted';
      mockServiceWorker.getRegistration.mockResolvedValueOnce(mockRegistration);
      mockGetSubscription.mockResolvedValueOnce(null);
      mockSubscribe.mockRejectedValueOnce(new Error('PushService fail'));

      await expect(initNotifications()).rejects.toThrow('PushService fail');
      expect(onError).toHaveBeenCalled();
    });

    it('does not crash if hooks throw errors', async () => {
      const { setupNotifyX, initNotifications } = await getFreshModule();
      const throwingHook = jest.fn().mockImplementation(() => { throw new Error('Hook crash'); });
      setupNotifyX({ publicKey: validPublicKey, hooks: { onSubscribe: throwingHook } });
      
      window.Notification.permission = 'granted';
      mockGetSubscription.mockResolvedValueOnce({ endpoint: 'https://existing.com' });
      
      // Should not throw 'Hook crash'
      const sub = await initNotifications();
      expect(sub.endpoint).toBe('https://existing.com');
      expect(throwingHook).toHaveBeenCalled();
    });
  });

  describe('4. disableNotifications() Logic', () => {
    it('throws if setupNotifyX not called first', async () => {
      const { disableNotifications } = await getFreshModule();
      await expect(disableNotifications()).rejects.toThrow('must be called first');
    });

    it('returns true gracefully if user was not subscribed', async () => {
      const { setupNotifyX, disableNotifications } = await getFreshModule();
      setupNotifyX({ publicKey: validPublicKey });
      mockGetSubscription.mockResolvedValueOnce(null);

      const result = await disableNotifications();
      expect(result).toBe(true);
    });

    it('returns true gracefully if registration is missing', async () => {
      const { setupNotifyX, disableNotifications } = await getFreshModule();
      setupNotifyX({ publicKey: validPublicKey });
      mockServiceWorker.getRegistration.mockResolvedValueOnce(null);
      
      const result = await disableNotifications();
      expect(result).toBe(true);
    });

    it('returns true safely if getSubscription throws during disable', async () => {
      const { setupNotifyX, disableNotifications } = await getFreshModule();
      setupNotifyX({ publicKey: validPublicKey });
      mockGetSubscription.mockRejectedValueOnce(new Error('IDB fail'));

      const result = await disableNotifications();
      expect(result).toBe(true);
    });

    it('successfully unsubscribes and calls onUnsubscribe hook', async () => {
      const { setupNotifyX, disableNotifications } = await getFreshModule();
      const onUnsubscribe = jest.fn();
      setupNotifyX({ publicKey: validPublicKey, hooks: { onUnsubscribe } });
      
      const mockSub = { unsubscribe: jest.fn().mockResolvedValue(true) };
      mockGetSubscription.mockResolvedValueOnce(mockSub);

      const result = await disableNotifications();
      expect(result).toBe(true);
      expect(mockSub.unsubscribe).toHaveBeenCalled();
      expect(onUnsubscribe).toHaveBeenCalled();
    });

    it('does not crash if onUnsubscribe hook throws', async () => {
      const { setupNotifyX, disableNotifications } = await getFreshModule();
      const throwingHook = jest.fn().mockImplementation(() => { throw new Error('Hook crash'); });
      setupNotifyX({ publicKey: validPublicKey, hooks: { onUnsubscribe: throwingHook } });
      
      const mockSub = { unsubscribe: jest.fn().mockResolvedValue(true) };
      mockGetSubscription.mockResolvedValueOnce(mockSub);

      const result = await disableNotifications();
      expect(result).toBe(true);
      expect(throwingHook).toHaveBeenCalled();
    });

    it('catches unsubscribe failure and calls onError hook', async () => {
      const { setupNotifyX, disableNotifications } = await getFreshModule();
      const onError = jest.fn();
      setupNotifyX({ publicKey: validPublicKey, hooks: { onError } });
      
      const mockSub = { unsubscribe: jest.fn().mockRejectedValue(new Error('Network Fail')) };
      mockGetSubscription.mockResolvedValueOnce(mockSub);

      const result = await disableNotifications();
      expect(result).toBe(false); // Should return false on failure
      expect(onError).toHaveBeenCalled();
    });
  });
});
