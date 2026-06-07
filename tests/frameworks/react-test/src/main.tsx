import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { setupNotifyX } from '@nandish029/notifyx'
// @ts-ignore
import * as swModule from '@nandish029/notifyx/sw'

console.log('React app loaded with NotifyX swModule', !!swModule);
setupNotifyX({ publicKey: 'TEST_KEY' });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
