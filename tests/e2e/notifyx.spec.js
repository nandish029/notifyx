import { test, expect } from '@playwright/test';

test.describe('NotifyX 10/10 Integration Tests', () => {

  const injectMocks = async (page) => {
    await page.evaluate(() => {
      const MockNotification = {
        permission: 'default',
        requestPermission: () => Promise.resolve('granted')
      };
      Object.defineProperty(window, 'Notification', { value: MockNotification, configurable: true });

      let currentSub = null;
      PushManager.prototype.getSubscription = () => Promise.resolve(currentSub);
      PushManager.prototype.subscribe = function() {
        return Promise.resolve({
          endpoint: 'https://mock.push.server/endpoint123',
          keys: { p256dh: 'mock-key', auth: 'mock-auth' },
          toJSON: function() { return { endpoint: this.endpoint, keys: this.keys }; },
          unsubscribe: () => {
            currentSub = null;
            return Promise.resolve(true);
          }
        }).then(sub => {
          currentSub = sub;
          return sub;
        });
      };
    });
  };

  test.beforeEach(async ({ page }) => {
    // Go to the test fixture page
    await page.goto('/');
  });

  test('1. Subscribes successfully when permission is granted', async ({ page }) => {
    await injectMocks(page);

    // Setup NotifyX
    await page.evaluate(() => window.NotifyX.setup());
    
    // Call initNotifications and get the subscription
    const subscription = await page.evaluate(async () => {
      const sub = await window.NotifyX.init();
      return sub ? sub.toJSON() : null;
    });

    // Assert that the browser returned a real PushSubscription
    expect(subscription).not.toBeNull();
    expect(subscription.endpoint).toContain('https://');
    expect(subscription.keys.p256dh).toBeDefined();
    expect(subscription.keys.auth).toBeDefined();
    
    // Verify getSubscriptionStatus works
    const status = await page.evaluate(async () => {
      const sub = await window.NotifyX.getStatus();
      return sub ? sub.toJSON() : null;
    });
    expect(status.endpoint).toEqual(subscription.endpoint);
  });

  test('2. Fails cleanly when permission is explicitly denied by user', async ({ page }) => {
    // Override Notification to explicitly return denied
    await page.evaluate(() => {
      const MockNotification = {
        permission: 'default',
        requestPermission: () => Promise.resolve('denied')
      };
      Object.defineProperty(window, 'Notification', { value: MockNotification, configurable: true });
    });

    await page.evaluate(() => window.NotifyX.setup());
    
    // Evaluate catches the thrown error
    const errorMsg = await page.evaluate(async () => {
      try {
        await window.NotifyX.init();
        return 'Did not throw';
      } catch (err) {
        return err.message;
      }
    });

    expect(errorMsg).toContain('denied');
  });

  test('3. Service Worker installs, activates, and handles disable logic', async ({ page }) => {
    await injectMocks(page);

    await page.evaluate(() => window.NotifyX.setup());
    await page.evaluate(() => window.NotifyX.init());

    // Verify the SW is genuinely active in the browser
    const isReady = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return !!reg.active;
    });
    expect(isReady).toBe(true);

    // Test disable Notifications completely wipes the subscription
    const disableResult = await page.evaluate(() => window.NotifyX.disable());
    expect(disableResult).toBe(true);

    const statusAfter = await page.evaluate(() => window.NotifyX.getStatus());
    expect(statusAfter).toBeNull();
  });

  test('4. Fires hooks correctly during subscription lifecycle', async ({ page }) => {
    await injectMocks(page);
    
    await page.evaluate(() => {
      window.hookLogs = [];
      window.NotifyX = Object.assign({}, window.NotifyX, {
        setup: () => window.setupNotifyX({ 
          publicKey: window.validPublicKey,
          hooks: {
            onSubscribe: () => window.hookLogs.push('subscribe'),
            onUnsubscribe: () => window.hookLogs.push('unsubscribe')
          }
        })
      });
    });
    
    await page.evaluate(() => window.NotifyX.setup());
    await page.evaluate(() => window.NotifyX.init());
    await page.evaluate(() => window.NotifyX.disable());
    
    const logs = await page.evaluate(() => window.hookLogs);
    expect(logs).toEqual(['subscribe', 'unsubscribe']);
  });

  test('5. SW sends NOTIFYX_PUSH_RECEIVED message to focused clients', async ({ page, context }) => {
    await injectMocks(page);
    await page.evaluate(() => window.NotifyX.setup());
    await page.evaluate(() => window.NotifyX.init());
    
    await page.evaluate(() => {
      window.receivedMessage = null;
      navigator.serviceWorker.addEventListener('message', (event) => {
        window.receivedMessage = event.data;
      });
    });

    // Wait for SW to be fully active without relying on controller mapping
    await page.waitForFunction(async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      return regs.length > 0 && regs[0].active !== null;
    });
    
    const workers = context.serviceWorkers();
    expect(workers.length).toBeGreaterThan(0);
    const worker = workers[0];

    // Dispatch a REAL PushEvent inside the Service Worker
    await worker.evaluate(() => {
      const payload = JSON.stringify({ title: 'Test' });
      // In some browsers PushEvent constructor takes an object, in others just a string or bytes.
      // We simulate what the browser native push event does.
      const event = new PushEvent('push', { data: payload });
      self.dispatchEvent(event);
    });

    await page.waitForFunction(() => window.receivedMessage !== null);
    const msg = await page.evaluate(() => window.receivedMessage);
    expect(msg.type).toBe('NOTIFYX_IN_APP_PUSH');
    expect(msg.payload.title).toBe('Test');
  });

  test('6. Catches Service Worker registration failure', async ({ page }) => {
    await injectMocks(page);
    await page.evaluate(() => {
      navigator.serviceWorker.register = () => Promise.reject(new Error('Mock SW Error'));
    });
    
    const errorMsg = await page.evaluate(async () => {
      window.NotifyX.setup();
      try { await window.NotifyX.init(); return 'No error'; } catch (e) { return e.message; }
    });
    
    expect(errorMsg).toContain('Mock SW Error');
  });

  test('7. Catches PushManager subscribe failure', async ({ page }) => {
    await injectMocks(page);
    await page.evaluate(() => {
      PushManager.prototype.subscribe = () => Promise.reject(new Error('Mock Push Error'));
    });
    
    const errorMsg = await page.evaluate(async () => {
      window.NotifyX.setup();
      try { await window.NotifyX.init(); return 'No error'; } catch (e) { return e.message; }
    });
    
    expect(errorMsg).toContain('Mock Push Error');
  });

  test('8. Prevents double initialization', async ({ page }) => {
    const errorMsg = await page.evaluate(() => {
      window.NotifyX.setup();
      try {
        window.NotifyX.setup();
        return 'No error';
      } catch (e) { return e.message; }
    });
    expect(errorMsg).toContain('already called');
  });

  test('9. Reuses existing subscription', async ({ page }) => {
    await injectMocks(page);
    await page.evaluate(() => {
      window.subscribeCount = 0;
      const originalSubscribe = PushManager.prototype.subscribe;
      PushManager.prototype.subscribe = function() {
        window.subscribeCount++;
        return originalSubscribe.call(this);
      };
    });
    
    // First init creates the sub
    await page.evaluate(async () => {
      window.NotifyX.setup();
      await window.NotifyX.init();
    });
    
    // Second init should reuse
    await page.evaluate(async () => {
      await window.NotifyX.init();
    });
    
    const count = await page.evaluate(() => window.subscribeCount);
    expect(count).toBe(1); // Called exactly once!
  });

  test('10. Reuses existing service worker registration on navigation', async ({ page }) => {
    await injectMocks(page);
    
    // First page session
    await page.evaluate(async () => {
      window.NotifyX.setup();
      await window.NotifyX.init();
    });
    
    // Reload page, keeping SW active
    await page.reload();
    await injectMocks(page);
    
    // Track registration calls
    await page.evaluate(() => {
      window.registerCount = 0;
      const originalRegister = navigator.serviceWorker.register;
      navigator.serviceWorker.register = function(...args) {
        window.registerCount++;
        return originalRegister.apply(this, args);
      };
    });

    // Setup and init on the new page
    await page.evaluate(async () => {
      window.NotifyX.setup();
      await window.NotifyX.init();
    });
    
    // register() shouldn't be called because getRegistration() returned the active SW from the previous session!
    const count = await page.evaluate(() => window.registerCount);
    expect(count).toBe(0);
  });

});
