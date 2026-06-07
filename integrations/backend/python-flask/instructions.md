# 🐍 How to use NotifyX in Python (Flask)

Welcome! This guide will show you how to turn your Flask server into a push notification "Post Office." 

We have written a ready-to-use Flask "Blueprint" for you. You just plug it into your app, connect your database, and you are ready to send messages.

## Step 1: Install the Required Tools
Your Python server needs a special tool to safely encrypt your messages before sending them to Apple or Google. Open your terminal and run:
```bash
pip install pywebpush flask python-dotenv
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

## Step 3: Plug in the NotifyX Routes
1. Copy the `push_routes.py` file we provided and put it in your project.
2. Open your main `app.py` file and plug the routes in like this:

```python
from flask import Flask
from dotenv import load_dotenv

# Import the NotifyX Blueprint we wrote for you
from push_routes import NotifyX_bp

load_dotenv()
app = Flask(__name__)

# This turns on the routes so your React frontend can talk to them!
app.register_blueprint(NotifyX_bp, url_prefix='/api/notifications')

if __name__ == '__main__':
    app.run(port=5000)
```

## Step 4: Hook up your Database
Open the `push_routes.py` file. Near the top, you will see a section called "MOCK DATABASE". 

Right now, it just saves users to a temporary list. You need to change those small functions to use your real database (like SQLAlchemy or PyMongo).
* **`save_to_db`**: Save the user's subscription data to your database.
* **`delete_from_db`**: Delete the user from your database.

## Step 5: Sending a Notification
When you are ready to send a message to everyone, just send a POST request to your `/api/notifications/broadcast` route. You can test it with Postman or a Python script:

```python
import requests

requests.post('http://localhost:5000/api/notifications/broadcast', json={
    "title": "Hello Python!",
    "body": "My Flask server just sent a push notification.",
    "url": "https://mywebsite.com"
})
```

## 🧠 Good to Know: The "410 Gone" Error
If a user gets annoyed and blocks your website in their Chrome settings, your database won't know about it. The next time you try to send them a message, Google will reject it with a **410 Gone** error. 

Don't worry! The `push_routes.py` file automatically catches this exact error and runs your `delete_from_db` function, throwing away their old address so your server stays fast and clean.