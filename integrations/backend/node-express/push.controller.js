const express = require('express');
const webpush = require('web-push');
const router = express.Router();

/**
 * 🚀 NotifyX Express Router
 * * SETUP: You must configure web-push with your VAPID keys before using this router.
 * Typically done in your main server.js:
 * * webpush.setVapidDetails(
 * 'mailto:admin@yourdomain.com',
 * process.env.VAPID_PUBLIC_KEY,
 * process.env.VAPID_PRIVATE_KEY
 * );
 */

// ⚠️ MOCK DATABASE: Replace these functions with your actual DB logic (MongoDB, Postgres, etc.)
let mockDatabase = []; 
const saveToDB = async (sub) => mockDatabase.push(sub);
const deleteFromDB = async (endpoint) => {
    mockDatabase = mockDatabase.filter(sub => sub.endpoint !== endpoint);
};
const getAllSubscriptions = async () => mockDatabase;

/**
 * 📥 Route 1: Save a new subscription
 * The frontend `<SubscribeButton />` hits this route when a user opts-in.
 */
router.post('/subscribe', async (req, res) => {
    const subscription = req.body;

    // Strict Validation: Ensure the object is a valid Web Push subscription
    if (!subscription || !subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
        return res.status(400).json({ error: '[NotifyX] Invalid subscription object format.' });
    }

    try {
        await saveToDB(subscription);
        res.status(201).json({ message: 'Subscription saved successfully.' });
    } catch (error) {
        console.error('[NotifyX] Database save failed:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * 🗑 Route 2: Delete a subscription
 * The frontend `<SubscribeButton />` hits this route when a user turns off notifications.
 */
router.delete('/unsubscribe', async (req, res) => {
    const { endpoint } = req.body;

    if (!endpoint) {
        return res.status(400).json({ error: '[NotifyX] Endpoint is required to unsubscribe.' });
    }

    try {
        await deleteFromDB(endpoint);
        res.status(200).json({ message: 'Subscription removed successfully.' });
    } catch (error) {
        console.error('[NotifyX] Database delete failed:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * 📤 Route 3: Trigger a Push Notification (Admin/System Route)
 * Your system hits this route to broadcast a message to users.
 */
router.post('/broadcast', async (req, res) => {
    const { title, body, url, tag, actions } = req.body;

    // Build the payload matching the strict NotifyX schema
    const payload = JSON.stringify({
        title: title || 'System Update',
        body: body || 'You have a new notification.',
        url: url || '/',
        tag: tag || 'default-tag',
        actions: actions || []
    });

    try {
        const subscriptions = await getAllSubscriptions();
        let successCount = 0;
        let failCount = 0;

        // Loop through all users and send the push
        // Note: For massive scale, use Promise.allSettled() or a message queue (like RabbitMQ)
        for (const sub of subscriptions) {
            try {
                await webpush.sendNotification(sub, payload);
                successCount++;
            } catch (error) {
                // EDGE CASE: If error is 410 (Gone) or 404 (Not Found), the user revoked permission 
                // at the browser level. We MUST delete their dead subscription from our DB.
                if (error.statusCode === 410 || error.statusCode === 404) {
                    console.warn(`[NotifyX] Subscription expired for endpoint. Cleaning up database.`);
                    await deleteFromDB(sub.endpoint);
                } else {
                    console.error('[NotifyX] Push delivery failed:', error);
                }
                failCount++;
            }
        }

        res.status(200).json({ 
            message: 'Broadcast complete.',
            stats: { successful: successCount, failed: failCount }
        });

    } catch (error) {
        console.error('[NotifyX] Broadcast execution failed:', error);
        res.status(500).json({ error: 'Failed to process broadcast.' });
    }
});

module.exports = router;