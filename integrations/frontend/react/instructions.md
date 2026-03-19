# ⚛️ How to use @nandish029/notifyx in React or Next.js (Simple Guide)

Welcome! This guide will help you add a "Turn on Notifications" button to your React website. 

You do not need to know how the complicated browser Push APIs work. We have written all the hard code for you. You just need to copy, paste, and add your secret keys.

## Step 1: Install the Package
First, open your terminal (command line), go to your frontend folder, and tell npm to download the core @nandish029/notifyx tool:
\`\`\`bash
npm install @nandish029/notifyx
\`\`\`

## Step 2: Move the "Service Worker" (Very Important!)
A "Service Worker" is a tiny JavaScript file that runs in the background of a user's browser, even when your website is closed. It is the thing that actually pops up the notification on the screen.

1. Go into your `node_modules/@nandish029/notifyx/frontend/` folder.
2. Find the file named `sw.js`.
3. Copy it and paste it into your project's **`public`** folder. 

**🤔 Why the public folder?** Think of the Service Worker like a security guard. If you put him in a back room (like an `/assets/` folder), he can only see that room. If you put him at the front door (the `/public/` folder), he can see and protect the whole house. 

## Step 3: Copy the React Files
Copy the two files we provided into your React project:
1. Put `use@nandish029/notifyx.js` into your `hooks` folder.
2. Put `SubscribeButton.jsx` into your `components` folder.

## Step 4: Add your VAPID Key
Push notifications require a special password called a **VAPID Key**. It proves to Google and Apple that the notification is really coming from your website, and not a hacker.

Open your `.env` file and paste your Public Key inside. 
*(If you are using Next.js, it must start with `NEXT_PUBLIC_` so the frontend can read it).*

\`\`\`env
NEXT_PUBLIC_VAPID_KEY="paste_your_long_public_key_string_here"
\`\`\`

## Step 5: Put the Button on your Website
Now, go to any page in your React app (like a Settings page) and drop the button in. 

When the user clicks it, it will create a "Subscription Object". You must send this object to your backend database so your server knows *where* to send the messages later.

\`\`\`jsx
import SubscribeButton from './components/SubscribeButton';

export default function SettingsPage() {
  
  // This runs when the user clicks "Turn On" and clicks "Allow" in the browser prompt
  const handleSaveToDatabase = async (subscriptionData) => {
    // Send the data to your backend
    await fetch('http://localhost:3000/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscriptionData)
    });
    alert('Awesome! You will now get notifications.');
  };

  // This runs when the user clicks "Turn Off"
  const handleDeleteFromDatabase = async () => {
    // Tell your backend to delete this user's notification data
    await fetch('http://localhost:3000/api/notifications/unsubscribe', { 
      method: 'DELETE' 
    });
    alert('Notifications turned off.');
  };

  return (
    <div>
      <h1>Settings</h1>
      
      <SubscribeButton 
        publicKey={process.env.NEXT_PUBLIC_VAPID_KEY}
        onSubscribeSuccess={handleSaveToDatabase}
        onUnsubscribeSuccess={handleDeleteFromDatabase}
      />
      
    </div>
  );
}
\`\`\`