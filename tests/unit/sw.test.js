import { jest } from '@jest/globals';

describe('Service Worker (sw.ts) Payload & Intelligence', () => {
  let listeners = {};
  let mockShowNotification;
  let mockMatchAll;
  let mockPostMessage;

  beforeEach(async () => {
    jest.resetModules();
    listeners = {};
    mockShowNotification = jest.fn().mockResolvedValue();
    mockPostMessage = jest.fn();
    mockMatchAll = jest.fn().mockResolvedValue([]);

    // Mock ServiceWorkerGlobalScope (self)
    global.self = {
      addEventListener: (event, callback) => {
        listeners[event] = callback;
      },
      registration: {
        showNotification: mockShowNotification
      },
      clients: {
        matchAll: mockMatchAll
      },
      location: {
        origin: 'http://localhost'
      }
    };
    
    // Mock IndexedDB for analytics queue
    global.indexedDB = {
      open: jest.fn().mockImplementation(() => {
        const req = { onupgradeneeded: null, onsuccess: null, onerror: null, result: null };
        setTimeout(() => {
          req.result = {
            objectStoreNames: { contains: () => true },
            transaction: () => {
              const tx = {
                objectStore: () => ({ 
                  add: jest.fn().mockImplementation((val) => {
                    if (global.__mockIDBAdd) global.__mockIDBAdd(val);
                    return {};
                  }), 
                  getAll: jest.fn().mockImplementation(() => {
                    const r = {};
                    setTimeout(() => { 
                      r.result = global.__mockIDBEvents || []; 
                      if(r.onsuccess) r.onsuccess(); 
                    }, 0);
                    return r;
                  }),
                  clear: jest.fn()
                }) 
              };
              // Save the spies globally so tests can assert them
              global.__mockIDBStore = tx.objectStore();
              setTimeout(() => { if (tx.oncomplete) tx.oncomplete(); }, 0);
              return tx;
            }
          };
          if (req.onsuccess) {
            // Need to pass an event-like object where target is the request
            req.onsuccess({ target: req });
          }
        }, 0);
        return req;
      })
    };

    // Mock fetch for analytics flush
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    // Mock Notification prototype for feature detection
    global.Notification = {
      prototype: { actions: true }
    };

    // Dynamically import sw.js so it binds to our fresh global.self
    await import(`../../dist/sw.js?update=${Date.now()}${Math.random()}`);
  });

  // Helper to construct a fake PushEvent
  const createPushEvent = (dataObj) => {
    return {
      waitUntil: jest.fn(),
      data: {
        json: () => {
          if (dataObj === null) throw new Error("Invalid JSON");
          return dataObj;
        },
        text: () => typeof dataObj === 'string' ? dataObj : JSON.stringify(dataObj)
      }
    };
  };

  it('correctly maps rich visual properties', async () => {
    const payload = {
      title: 'Test Title',
      body: 'Test Body',
      icon: '/icon.png',
      image: '/image.png',
      badge: '/badge.png',
      tag: 'test-tag'
    };

    const event = createPushEvent(payload);
    await listeners['push'](event);
    
    // push event listener executes async code in waitUntil
    await event.waitUntil.mock.calls[0][0];

    expect(mockShowNotification).toHaveBeenCalledWith('Test Title', expect.objectContaining({
      body: 'Test Body',
      icon: '/icon.png',
      image: '/image.png',
      badge: '/badge.png',
      tag: 'test-tag',
      data: payload
    }));
  });

  it('correctly maps advanced OS controls', async () => {
    const payload = {
      title: 'Alert',
      vibrate: [100, 50, 100],
      silent: true,
      renotify: false,
      requireInteraction: true,
      actions: [{ action: 'yes', title: 'Yes' }]
    };

    const event = createPushEvent(payload);
    await listeners['push'](event);
    await event.waitUntil.mock.calls[0][0];

    expect(mockShowNotification).toHaveBeenCalledWith('Alert', expect.objectContaining({
      vibrate: [100, 50, 100],
      silent: true,
      renotify: false,
      requireInteraction: true,
      actions: [{ action: 'yes', title: 'Yes' }]
    }));
  });

  it('falls back safely when receiving invalid JSON', async () => {
    const event = createPushEvent(null); // Will throw on .json()
    // Override text() to simulate a plain text payload
    event.data.text = () => "Plain text message";

    // Silence console.warn for this test
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await listeners['push'](event);
    await event.waitUntil.mock.calls[0][0];

    expect(mockShowNotification).toHaveBeenCalledWith('New Notification', expect.objectContaining({
      body: 'Plain text message'
    }));

    warnSpy.mockRestore();
  });

  it('🧠 Intelligence: suppresses OS popup and routes to frontend if tab is focused', async () => {
    // Simulate an open, focused tab
    mockMatchAll.mockResolvedValue([{
      focused: true,
      postMessage: mockPostMessage
    }]);

    const payload = { title: 'Secret', body: 'Shh' };
    const event = createPushEvent(payload);
    
    // Silence console.log for intelligence
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await listeners['push'](event);
    await event.waitUntil.mock.calls[0][0];

    // Assert OS notification was NOT shown
    expect(mockShowNotification).not.toHaveBeenCalled();

    // Assert payload was routed to the frontend
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'NOTIFYX_IN_APP_PUSH',
      payload: payload
    });

    logSpy.mockRestore();
  });

  it('🧠 Intelligence Override: forces OS popup even if tab is focused (forceOSPopup: true)', async () => {
    // Simulate an open, focused tab
    mockMatchAll.mockResolvedValue([{
      focused: true,
      postMessage: mockPostMessage
    }]);

    const payload = { title: 'Emergency', forceOSPopup: true };
    const event = createPushEvent(payload);
    
    await listeners['push'](event);
    await event.waitUntil.mock.calls[0][0];

    // Assert OS notification WAS shown despite the focused tab
    expect(mockShowNotification).toHaveBeenCalled();
    // Assert it did NOT route to frontend
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  // --- NEW MISSING SCENARIOS ---

  // Helper for notificationclick
  const createNotificationClickEvent = (dataObj, action = '') => {
    return {
      waitUntil: jest.fn(),
      notification: {
        close: jest.fn(),
        data: dataObj
      },
      action: action
    };
  };

  it('1. Default values test: handles empty object {} safely', async () => {
    const event = createPushEvent({});
    await listeners['push'](event);
    await event.waitUntil.mock.calls[0][0];

    expect(mockShowNotification).toHaveBeenCalledWith('Notification', expect.objectContaining({
      body: '',
      tag: 'notifyx-default'
    }));
  });

  it('2. No payload test: handles event.data being completely absent', async () => {
    const event = { waitUntil: jest.fn() }; // No event.data
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await listeners['push'](event);
    await event.waitUntil.mock.calls[0][0];

    expect(mockShowNotification).toHaveBeenCalledWith('Notification', expect.objectContaining({
      body: 'You have a new update.',
      tag: 'notifyx-fallback'
    }));

    warnSpy.mockRestore();
  });

  it('3. Notification actions unsupported: strips actions gracefully', async () => {
    // Temporarily remove actions support
    const originalNotification = global.Notification;
    global.Notification = { prototype: {} };

    const payload = { title: 'No Actions', actions: [{ action: 'yes', title: 'Yes' }] };
    const event = createPushEvent(payload);
    await listeners['push'](event);
    await event.waitUntil.mock.calls[0][0];

    expect(mockShowNotification).toHaveBeenCalledWith('No Actions', expect.not.objectContaining({
      actions: expect.anything()
    }));

    global.Notification = originalNotification; // Restore
  });

  it('4. Multiple tabs test: suppresses if at least one tab is focused', async () => {
    mockMatchAll.mockResolvedValue([
      { focused: false, postMessage: mockPostMessage },
      { focused: true, postMessage: mockPostMessage }
    ]);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const event = createPushEvent({ title: 'Secret' });
    await listeners['push'](event);
    await event.waitUntil.mock.calls[0][0];

    expect(mockShowNotification).not.toHaveBeenCalled();
    expect(mockPostMessage).toHaveBeenCalledTimes(1);

    logSpy.mockRestore();
  });

  it('5. Notification click test: opens default URL', async () => {
    const event = createNotificationClickEvent({ url: '/dashboard' });
    
    // Mock clients.openWindow
    global.self.clients.openWindow = jest.fn().mockResolvedValue();

    await listeners['notificationclick'](event);
    
    // Process promises inside waitUntil
    await event.waitUntil.mock.calls[0][0];

    expect(event.notification.close).toHaveBeenCalled();
    expect(global.self.clients.openWindow).toHaveBeenCalledWith(expect.stringContaining('/dashboard'));
  });

  it('6. Error handling test: showNotification throws', async () => {
    mockShowNotification.mockRejectedValueOnce(new Error('OS Push Error'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const event = createPushEvent({ title: 'Fail' });
    await listeners['push'](event);
    
    // Should reject or resolve, but not crash the entire SW
    await expect(event.waitUntil.mock.calls[0][0]).rejects.toThrow('OS Push Error');

    warnSpy.mockRestore();
  });

  it('7. Duplicate notification/tag tests: respects renotify flag', async () => {
    const payload = { title: 'Update', tag: 'same-tag', renotify: false };
    const event = createPushEvent(payload);
    
    await listeners['push'](event);
    await event.waitUntil.mock.calls[0][0];

    expect(mockShowNotification).toHaveBeenCalledWith('Update', expect.objectContaining({
      tag: 'same-tag',
      renotify: false
    }));
  });

  it('8. Cross-browser edge cases: missing self.clients API', async () => {
    const originalClients = global.self.clients;
    delete global.self.clients;

    const event = createPushEvent({ title: 'Legacy Browser' });
    
    await listeners['push'](event);
    await event.waitUntil.mock.calls[0][0];

    // Should still show notification, not crash
    expect(mockShowNotification).toHaveBeenCalledWith('Legacy Browser', expect.anything());

    global.self.clients = originalClients; // Restore
  });

  it('9. Performance/stress test: handles 100 rapid pushes', async () => {
    const events = Array.from({ length: 100 }, (_, i) => createPushEvent({ title: `Push ${i}` }));
    
    // Dispatch all concurrently and verify no hidden rejections
    await expect(Promise.all(events.map(e => {
      listeners['push'](e);
      return e.waitUntil.mock.calls[0][0];
    }))).resolves.toBeDefined();

    expect(mockShowNotification).toHaveBeenCalledTimes(100);
  });

  it('10. Security/input validation tests: malicious array payload', async () => {
    const event = createPushEvent(["malicious array"]);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await listeners['push'](event);
    await event.waitUntil.mock.calls[0][0];

    // If an array is passed, title is undefined, falls back to 'Notification'
    expect(mockShowNotification).toHaveBeenCalledWith('Notification', expect.anything());

    warnSpy.mockRestore();
  });

  // --- DEEP-DIVE EXPERT SCENARIOS ---

  it('11. Graceful error recovery: IndexedDB open failure does not crash click handling', async () => {
    // Force IndexedDB to throw
    const originalOpen = global.indexedDB.open;
    global.indexedDB.open = jest.fn().mockImplementation(() => { throw new Error('IDB blocked'); });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const event = createNotificationClickEvent({ url: '/safe' });
    global.self.clients.openWindow = jest.fn().mockResolvedValue();

    await listeners['notificationclick'](event);
    await event.waitUntil.mock.calls[0][0];

    // Notification click still completes!
    expect(event.notification.close).toHaveBeenCalled();
    expect(global.self.clients.openWindow).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled(); // Verify behavior rather than exact string

    global.indexedDB.open = originalOpen;
    warnSpy.mockRestore();
  });

  it('12. Complete notification click/action test: routes to specific action URL', async () => {
    const payload = { 
      url: '/default', 
      actions: [{ action: 'buy', url: '/checkout' }, { action: 'view', url: '/details' }] 
    };
    
    // User clicked the 'buy' action button!
    const event = createNotificationClickEvent(payload, 'buy');
    global.self.clients.openWindow = jest.fn().mockResolvedValue();
    global.__mockIDBAdd = jest.fn();

    await listeners['notificationclick'](event);
    await event.waitUntil.mock.calls[0][0];

    // Assert it routed to the action's URL, NOT the default URL
    expect(global.self.clients.openWindow).toHaveBeenCalledWith(expect.stringContaining('/checkout'));
    
    // Assert the click was tracked correctly in IDB
    expect(global.__mockIDBAdd).toHaveBeenCalledWith(expect.objectContaining({
      type: 'click',
      payload: expect.objectContaining({ url: expect.stringContaining('/checkout') })
    }));
  });

  it('13. Actual IndexedDB queue/flush assertions (sync event)', async () => {
    // Provide fake data for IDB getAll() to return
    global.__mockIDBEvents = [
      { id: 1, type: 'click', payload: { tag: 'test' } },
      { id: 2, type: 'close', payload: { tag: 'test' } }
    ];
    
    // Construct a sync event
    const event = { tag: 'notifyx-analytics', waitUntil: jest.fn() };
    
    await listeners['sync'](event);
    await event.waitUntil.mock.calls[0][0];

    // Assert fetch was called to POST the data to the backend!
    expect(global.fetch).toHaveBeenCalledWith('/api/notifyx/analytics', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"type":"click"')
    }));
  });

  it('14. waitUntil verification: push, click, close, sync all wrap logic securely', async () => {
    const pushEvent = createPushEvent({ title: 'Test' });
    const clickEvent = createNotificationClickEvent({});
    const closeEvent = { notification: { data: {} }, waitUntil: jest.fn() };
    const syncEvent = { tag: 'notifyx-analytics', waitUntil: jest.fn() };

    listeners['push'](pushEvent);
    listeners['notificationclick'](clickEvent);
    listeners['notificationclose'](closeEvent);
    listeners['sync'](syncEvent);

    // All events MUST invoke event.waitUntil() exactly once and pass it a Promise
    expect(pushEvent.waitUntil).toHaveBeenCalledTimes(1);
    expect(clickEvent.waitUntil).toHaveBeenCalledTimes(1);
    expect(closeEvent.waitUntil).toHaveBeenCalledTimes(1);
    expect(syncEvent.waitUntil).toHaveBeenCalledTimes(1);

    expect(pushEvent.waitUntil.mock.calls[0][0] instanceof Promise).toBe(true);
    expect(clickEvent.waitUntil.mock.calls[0][0] instanceof Promise).toBe(true);
    expect(closeEvent.waitUntil.mock.calls[0][0] instanceof Promise).toBe(true);
    expect(syncEvent.waitUntil.mock.calls[0][0] instanceof Promise).toBe(true);
  });

  it('15. Notification close test: queues close analytics event', async () => {
    const closeEvent = { 
      notification: { data: { tag: 'promo-123' } }, 
      waitUntil: jest.fn() 
    };
    global.__mockIDBAdd = jest.fn();

    await listeners['notificationclose'](closeEvent);
    await closeEvent.waitUntil.mock.calls[0][0];

    // Assert the close event was securely tracked in IDB
    expect(global.__mockIDBAdd).toHaveBeenCalledWith(expect.objectContaining({
      type: 'close',
      payload: expect.objectContaining({ tag: 'promo-123' })
    }));
  });

  it('16. Race condition test: handles concurrent push, click, and sync events', async () => {
    // Inject mock data for the sync event to process
    global.__mockIDBEvents = [{ id: 1, type: 'click' }];
    
    const pushEvent = createPushEvent({ title: 'Race Push' });
    const clickEvent = createNotificationClickEvent({ url: '/race' });
    const syncEvent = { tag: 'notifyx-analytics', waitUntil: jest.fn() };
    
    global.self.clients.openWindow = jest.fn().mockResolvedValue();
    global.__mockIDBAdd = jest.fn();

    // Dispatch all simultaneously!
    listeners['push'](pushEvent);
    listeners['notificationclick'](clickEvent);
    listeners['sync'](syncEvent);

    // Wait for all completely concurrent promises to resolve
    await expect(Promise.all([
      pushEvent.waitUntil.mock.calls[0][0],
      clickEvent.waitUntil.mock.calls[0][0],
      syncEvent.waitUntil.mock.calls[0][0]
    ])).resolves.toBeDefined();

    // Assert outcomes were not scrambled and all logic finished correctly
    expect(mockShowNotification).toHaveBeenCalledWith('Race Push', expect.anything());
    expect(global.self.clients.openWindow).toHaveBeenCalledWith(expect.stringContaining('/race'));
    expect(global.fetch).toHaveBeenCalledWith('/api/notifyx/analytics', expect.anything());
  });
});
