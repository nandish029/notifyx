import { setupNotifyX, initNotifications } from '@nandish029/notifyx';
// @ts-ignore
import * as swModule from '@nandish029/notifyx/sw';

console.log('SW module resolved:', Object.keys(swModule));

setupNotifyX({ 
  publicKey: 'BJtOVcH01BGeWUOWzdkGCt1MY3L5qSg9e0tp-dlotDieaYZ389eVkQmsdFDTHcm-m2tziv-ZKjbytulIUWQFn70',
  swPath: '/sw.js'
});

initNotifications().then(sub => {
  console.log('Notifications initialized in Vite!', sub);
}).catch(err => {
  console.error('Failed to init in Vite', err);
});
