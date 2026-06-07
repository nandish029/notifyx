# 🟢 How to use NotifyX in Node.js (Simple Guide)

Welcome! While the React frontend *asks* the user for permission, your Node.js backend is the "Post Office". It stores the addresses (subscriptions) and actually *mails out* the notifications.

We have written a complete Express Router for you. You just need to plug it into your server.

## Step 1: Install the Web-Push Library
Your server needs a way to encrypt the messages before sending them to Google/Apple. Run this in your backend terminal:
```bash
npm install web-push
```

## Step 2: Use your VAPID Keys
If you already ran the NotifyX setup CLI in your project root (`npx @nandish029/notifyx init`), you should already have a `.env` file generated with your secure VAPID keys.

Ensure your backend has access to these keys (or copy the `.env` file to your backend directory if your backend runs in a separate folder):

```env
VAPID_PUBLIC_KEY="your_public_key"
VAPID_PRIVATE_KEY="your_private_key"
CONTACT_EMAIL="mailto:your_email@gmail.com" 
```
*(Note: You must include `mailto:` in the email. Push services use this to contact you if your server sends too much spam).*

## Step 3: Connect the Router
1. Copy the `push.controller.js` file we provided and put it in your `routes` or `controllers` folder.
2. Open your main server file (usually `server.js` or `app.js`) and add these lines:

```javascript
require('dotenv').config();
const express = require('express');
const webpush = require('web-push');

const app = express();
app.use(express.json());

// 1. Give your server the secret keys
webpush.setVapidDetails(
  process.env.CONTACT_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// 2. Turn on the NotifyX routes
const pushRoutes = require('./routes/push.controller');
app.use('/api/notifications', pushRoutes);

app.listen(3000, () => console.log('Server is running!'));
```

## Step 4: Hook up your Database
Open the `push.controller.js` file. At the very top, you will see "MOCK DATABASE". 

You need to replace those three small functions with your actual database code (like MongoDB or Postgres). 
* When `saveToDB` runs, save the data to your database.
* When `deleteFromDB` runs, delete the data from your database.

## Step 5: How to Send a Message
When you want to send a notification to everyone, you just send a POST request to your `/api/notifications/broadcast` route. 

You can test this using a tool like Postman. Send this JSON data to the route:
```json
{
  "title": "Hello World!",
  "body": "This is my very first push notification.",
  "url": "https://mywebsite.com"
}
```
Your server will automatically encrypt it and send it to every user in your database!

## 🧠 Good to Know: The "410 Gone" Error
What happens if a user gets annoyed, goes into their Google Chrome settings, and manually blocks your website? 

Your React app won't know they did that. The next time your Node.js server tries to send them a message, Google will reject it and reply with an error code: **410 Gone**. 

Don't panic! The `push.controller.js` file we gave you is smart. It catches that error and automatically deletes that user from your database so your server doesn't waste time trying to send them messages again.