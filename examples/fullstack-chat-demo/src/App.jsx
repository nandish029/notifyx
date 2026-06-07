import { useState, useEffect } from 'react';
import { setupNotifyX, initNotifications, disableNotifications, getSubscriptionStatus } from '@nandish029/notifyx';

// Initialize SDK
setupNotifyX({
  publicKey: 'BLYEtSxti1ThWZSRn7OFdN48xAqAJh28Ept2lP8iKqfgPuYPJRWAHdJVCFF8RCshHv1GlC4u57wYUcNzFwe3sLc',
  swPath: '/sw.js',
  debug: true,
  hooks: {
    onSubscribe: async (sub) => {
      // Send to backend
      await fetch('http://localhost:3001/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub)
      });
    }
  }
});

function App() {
  const [messages, setMessages] = useState([{ sender: 'AI', text: 'Hello! I am your AI assistant. Send me a message and minimize the window to test background pushes!' }]);
  const [input, setInput] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    getSubscriptionStatus().then(async sub => {
      setIsSubscribed(!!sub);
      if (sub) {
        // Sync with backend on page load in case the server restarted
        await fetch('http://localhost:3001/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub)
        }).catch(() => {});
      }
    });
  }, []);

  const handleTogglePush = async () => {
    try {
      if (isSubscribed) {
        await disableNotifications();
        setIsSubscribed(false);
      } else {
        await initNotifications();
        setIsSubscribed(true);
      }
    } catch (err) {
      alert('Error toggling push: ' + err.message);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages([...messages, { sender: 'You', text: input }]);
    setInput('');

    // Trigger backend
    await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input })
    });
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>AI Chat Demo (NotifyX)</h2>
        <button 
          onClick={handleTogglePush}
          style={{ padding: '8px 16px', cursor: 'pointer', background: isSubscribed ? '#f44336' : '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          {isSubscribed ? '🔕 Disable Push' : '🔔 Enable Push'}
        </button>
      </div>

      <div style={{ border: '1px solid #ccc', height: '400px', overflowY: 'auto', padding: '20px', marginTop: '20px', borderRadius: '8px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: '15px', textAlign: m.sender === 'You' ? 'right' : 'left' }}>
            <span style={{ 
              background: m.sender === 'You' ? '#007bff' : '#eee', 
              color: m.sender === 'You' ? 'white' : 'black',
              padding: '10px 15px', 
              borderRadius: '20px',
              display: 'inline-block' 
            }}>
              {m.text}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', marginTop: '20px' }}>
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder="Type a message..." 
          style={{ flex: 1, padding: '10px', fontSize: '16px', borderRadius: '4px 0 0 4px', border: '1px solid #ccc' }}
        />
        <button type="submit" style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '0 4px 4px 0', cursor: 'pointer' }}>
          Send
        </button>
      </form>
    </div>
  );
}

export default App;
