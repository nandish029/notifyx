# ⚛️ How to use NotifyX in React or Next.js (Simple Guide)

Welcome! This guide will help you add a "Turn on Notifications" button to your React website. 

You do not need to know how the complicated browser Push APIs work. We have written all the hard code for you. You just need to copy, paste, and add your secret keys.

## Step 1: Run the NotifyX CLI
Instead of manually installing packages and copying files, let the automated CLI do the heavy lifting for you! Open your terminal in your React project root and run:

```bash
npx @nandish029/notifyx init
```

The CLI will automatically:
1. Detect that you are using React.
2. Install the `@nandish029/notifyx` package.
3. Move the `sw.js` Service Worker into your `public` folder.
4. Generate secure VAPID keys and save them to a `.env` file (e.g., `NEXT_PUBLIC_VAPID_KEY`).

## Step 2: Copy the React Files
Now that the core is set up, copy the two integration files we provided in this folder into your React project:
1. Put `useNotifyX.js` into your `hooks` folder.
2. Put `SubscribeButton.jsx` into your `components` folder.

## Step 3: Put the Button on your Website
Now, go to any page in your React app (like a Settings page) and drop the button in. 

When the user clicks it, it will create a "Subscription Object". You must send this object to your backend database so your server knows *where* to send the messages later.

```jsx
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
```