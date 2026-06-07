import express from 'express';
import cors from 'cors';
import webpush from 'web-push';

const app = express();
app.use(cors());
app.use(express.json());

// In a real app, keep these in .env!
const VAPID_PUBLIC = 'BLYEtSxti1ThWZSRn7OFdN48xAqAJh28Ept2lP8iKqfgPuYPJRWAHdJVCFF8RCshHv1GlC4u57wYUcNzFwe3sLc';
const VAPID_PRIVATE = 'QM3G1v9MlNgnM-X9-YI6IDYgc0Y_bFtceRbw0eMgacQ'; // Demo only
webpush.setVapidDetails('mailto:admin@notifyx.dev', VAPID_PUBLIC, VAPID_PRIVATE);

// Simple in-memory DB
let subscriptions = [];

app.post('/api/subscribe', (req, res) => {
    const sub = req.body;
    if (!subscriptions.find(s => s.endpoint === sub.endpoint)) {
        subscriptions.push(sub);
    }
    res.status(201).json({ success: true });
});

// Mock Chat Endpoint
app.post('/api/chat', (req, res) => {
    const { message } = req.body;

    // Simulate AI taking time to respond, then pushing a notification
    setTimeout(() => {
        // 🚀 FULL V2.1 PAYLOAD SHOWCASE
        // Try changing these values to see how they instantly change the native OS experience!
        const payload = JSON.stringify({
            // Core Visuals
            title: 'New AI Response',
            body: `AI: "That's very interesting! Tell me more about '${message.substring(0, 10)}...'"`,
            icon: 'https://cdn-icons-png.flaticon.com/512/8943/8943377.png',

            // Rich Notifications (Banner Image)
            // 🖼️ I UNCOMMENTED THIS FOR YOU! You will now see a massive hero image!
            image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=800',

            // Navigation
            url: '/',
            tag: 'chat-thread-1', // Groups notifications together instead of spamming

            // Advanced OS Controls (v2.1 & v2.2)
            requireInteraction: true, // Forces notification to stay on screen until clicked
            vibrate: [200, 100, 200, 100, 200], // Custom vibration pattern for Android
            renotify: true, // Vibrate/alert again even if 'tag' is the same

            // 🧠 INTELLIGENCE OVERRIDE
            // Uncomment this line to forcefully trigger the OS popup EVEN IF the tab is open!
            // forceOSPopup: true, 

            // silent: true, // Uncomment to deliver without sound/vibration

            // Interactive Buttons (Windows/Android)
            actions: [
                { action: 'reply', title: '💬 Reply Now', url: '/chat' },
                { action: 'dismiss', title: '❌ Ignore' }
            ]
        });

        Promise.allSettled(subscriptions.map(sub =>
            webpush.sendNotification(sub, payload).catch(err => {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
                }
            })
        ));
    }, 3000);

    res.status(200).json({ status: 'Processing' });
});

app.listen(3001, () => {
    console.log('🤖 AI Chat Backend running on http://localhost:3001');
});
