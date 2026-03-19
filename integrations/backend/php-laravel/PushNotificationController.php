<?php
// integrations/backend/php/PushNotificationController.php

require __DIR__ . '/vendor/autoload.php';
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

/**
 * 🚀 NotifyX PHP Controller
 * Requires: composer require minishlink/web-push
 */
class PushNotificationController {
    
    private $webPush;

    public function __construct() {
        $auth = [
            'VAPID' => [
                'subject' => $_ENV['CONTACT_EMAIL'],
                'publicKey' => $_ENV['VAPID_PUBLIC_KEY'],
                'privateKey' => $_ENV['VAPID_PRIVATE_KEY'],
            ],
        ];
        // Set up WebPush with SSL verification disabled ONLY for localhost testing if needed
        $this->webPush = new WebPush($auth);
    }

    // ⚠️ MOCK DB METHODS: Replace with PDO, Eloquent, etc.
    private function saveToDB($subData) { /* Save to DB */ }
    private function deleteFromDB($endpoint) { /* Delete from DB */ }
    private function getAllSubscriptions() { return []; /* Return array of DB rows */ }

    /**
     * 📥 Handle Subscription Request
     */
    public function subscribe($requestBody) {
        $data = json_decode($requestBody, true);
        
        if (!isset($data['endpoint']) || !isset($data['keys'])) {
            http_response_code(400);
            echo json_encode(['error' => '[NotifyX] Invalid payload']);
            return;
        }

        $this->saveToDB($data);
        http_response_code(201);
        echo json_encode(['message' => 'Subscription saved.']);
    }

    /**
     * 🗑 Handle Unsubscribe Request
     */
    public function unsubscribe($requestBody) {
        $data = json_decode($requestBody, true);
        
        if (!isset($data['endpoint'])) {
            http_response_code(400);
            echo json_encode(['error' => '[NotifyX] Endpoint missing']);
            return;
        }

        $this->deleteFromDB($data['endpoint']);
        http_response_code(200);
        echo json_encode(['message' => 'Subscription removed.']);
    }

    /**
     * 📤 Broadcast a Notification
     */
    public function broadcast($title, $body, $url = '/', $tag = 'default') {
        $subscriptions = $this->getAllSubscriptions();
        
        $payload = json_encode([
            'title' => $title,
            'body' => $body,
            'url' => $url,
            'tag' => $tag,
            'actions' => []
        ]);

        // Queue all notifications
        foreach ($subscriptions as $subRow) {
            $subscription = Subscription::create([
                'endpoint' => $subRow['endpoint'],
                'publicKey' => $subRow['keys']['p256dh'],
                'authToken' => $subRow['keys']['auth'],
            ]);
            $this->webPush->queueNotification($subscription, $payload);
        }

        // Send them all at once
        $successCount = 0;
        $failCount = 0;

        foreach ($this->webPush->flush() as $report) {
            $endpoint = $report->getRequest()->getUri()->__toString();

            if ($report->isSuccess()) {
                $successCount++;
            } else {
                $failCount++;
                // EDGE CASE: 410 or 404 means the user blocked permissions manually.
                $statusCode = $report->getResponse() ? $report->getResponse()->getStatusCode() : 0;
                if ($statusCode === 410 || $statusCode === 404) {
                    error_log("[NotifyX] User revoked permission. Deleting: {$endpoint}");
                    $this->deleteFromDB($endpoint);
                } else {
                    error_log("[NotifyX] Push failed for {$endpoint}: {$report->getReason()}");
                }
            }
        }

        http_response_code(200);
        echo json_encode(['successful' => $successCount, 'failed' => $failCount]);
    }
}