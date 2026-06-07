# 🐘 How to use NotifyX in PHP

Welcome! Whether you are using plain PHP, Laravel, or Symfony, this guide will help you set up your server to send push notifications. 

We have written a complete PHP "Controller" for you. It handles all the complicated encryption and error-checking automatically.

## Step 1: Install the Web-Push Library
Your server needs a way to securely lock (encrypt) the messages before sending them across the internet. We use a popular package for this. Run this in your terminal:
```bash
composer require minishlink/web-push
```

## Step 2: Use your VAPID Keys
If you already ran the NotifyX setup CLI in your project root (`npx @nandish029/notifyx init`), you should already have a `.env` file generated with your secure VAPID keys.

Ensure your backend has access to these keys (or copy the `.env` file to your backend directory if your backend runs in a separate folder):

```env
VAPID_PUBLIC_KEY="your_public_key"
VAPID_PRIVATE_KEY="your_private_key"
CONTACT_EMAIL="mailto:your_email@gmail.com"
```
*(Note: Always include `mailto:` in the email!).*

## Step 3: Connect your Database
1. Copy the `PushNotificationController.php` file we provided into your project.
2. Open it up and look for the "MOCK DB METHODS" section near the top.

You need to update these three functions to talk to your real database (using MySQL, PDO, or Laravel's Eloquent).
* **`saveToDB`**: Save the incoming user data.
* **`deleteFromDB`**: Delete a user's data.
* **`getAllSubscriptions`**: Grab all the saved users from your database so you can send them a message.

## Step 4: Create the API Routes
Your frontend needs a URL to send data to. Create a simple `api.php` file to catch the requests from your website and pass them to our Controller:

```php
<?php
require_once 'PushNotificationController.php';
$controller = new PushNotificationController();

$method = $_SERVER['REQUEST_METHOD'];
$uri = $_SERVER['REQUEST_URI'];

// 1. The frontend asks to save a user
if ($method === 'POST' && $uri === '/api/notifications/subscribe') {
    $controller->subscribe(file_get_contents('php://input'));
} 
// 2. The frontend asks to delete a user
elseif ($method === 'DELETE' && $uri === '/api/notifications/unsubscribe') {
    $controller->unsubscribe(file_get_contents('php://input'));
}
// 3. You trigger this to send a message to everyone!
elseif ($method === 'POST' && $uri === '/api/notifications/broadcast') {
    $controller->broadcast("Hello PHP!", "This is a test notification.");
}
```

## 🧠 Good to Know: How PHP sends messages so fast
If you have 10,000 users, sending them messages one by one would take forever. 

Our PHP Controller is smart. Inside the `broadcast` function, it lines up all 10,000 messages in a queue, and then uses a command called `flush()` to send them all at the exact same time. 

If any of those users manually blocked your website in their browser settings, the `flush()` command will notice it and automatically delete them from your database, keeping everything perfectly clean!