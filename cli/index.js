#!/usr/bin/env node

import prompts from 'prompts';
import fs from 'fs-extra';
import path from 'path';
import webpush from 'web-push';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.join(__dirname, '..');

async function run() {
    console.log('\n🔔 Welcome to NotifyX v2.0 Setup!\n');

    const response = await prompts([
        {
            type: 'select',
            name: 'frontend',
            message: 'Which frontend integration do you need?',
            choices: [
                { title: 'React / Next.js', value: 'react' },
                { title: 'Vanilla JS (Core only)', value: 'vanilla' },
            ],
            initial: 0
        },
        {
            type: 'select',
            name: 'backend',
            message: 'Which backend integration do you need?',
            choices: [
                { title: 'Node.js (Express)', value: 'node-express' },
                { title: 'Python (Flask)', value: 'python-flask' },
                { title: 'PHP (Laravel / Raw)', value: 'php-laravel' },
                { title: 'None (I will build my own)', value: 'none' }
            ],
            initial: 0
        }
    ]);

    if (!response.frontend || !response.backend) {
        console.log('Setup cancelled.');
        process.exit(0);
    }

    console.log('\n⚙️  Generating secure VAPID keys...');
    const vapidKeys = webpush.generateVAPIDKeys();
    
    // 1. Create .env file
    const envContent = `VAPID_PUBLIC_KEY=${vapidKeys.publicKey}\nVAPID_PRIVATE_KEY=${vapidKeys.privateKey}\nCONTACT_EMAIL=mailto:admin@example.com\n`;
    const envPath = path.join(process.cwd(), '.env');
    
    let envAction = 'Created new .env file';
    if (fs.existsSync(envPath)) {
        fs.appendFileSync(envPath, `\n# NotifyX Keys\n${envContent}`);
        envAction = 'Appended keys to existing .env file';
    } else {
        fs.writeFileSync(envPath, envContent);
    }
    console.log(`✅ ${envAction}`);

    // 2. Copy Frontend integration
    if (response.frontend === 'react') {
        const dest = path.join(process.cwd(), 'notifyx-frontend');
        fs.copySync(path.join(packageRoot, 'integrations/frontend/react'), dest);
        console.log(`✅ Copied React hooks & components to ./notifyx-frontend/`);
    } else {
        console.log(`✅ For Vanilla JS, simply import { setupNotifyX } from '@nandish029/notifyx'`);
    }

    // 3. Copy Backend integration
    if (response.backend !== 'none') {
        const dest = path.join(process.cwd(), 'notifyx-backend');
        fs.copySync(path.join(packageRoot, `integrations/backend/${response.backend}`), dest);
        console.log(`✅ Copied backend boilerplate to ./notifyx-backend/`);
    }

    console.log('\n🚀 Setup Complete! You are ready to vibe code.');
    console.log('VAPID Public Key:', vapidKeys.publicKey);
}

run().catch(console.error);
