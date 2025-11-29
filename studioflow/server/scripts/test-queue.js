import { triggerNotification } from '../src/services/notificationService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const test = async () => {
    console.log('🚀 Adding test job to queue...');
    try {
        await triggerNotification(
            'TEST_NOTIFICATION',
            {
                message: 'This is a test notification from the diagnostic script',
                timestamp: new Date()
            },
            'system-test'
        );

        console.log(`✅ Notification triggered successfully!`);
        console.log('Check console logs for "DIRECT MODE" or worker output.');

    } catch (e) {
        console.error('❌ Error adding job:', e);
    }

    // Allow time for connection to close gracefully
    setTimeout(() => {
        console.log('👋 Exiting...');
        process.exit(0);
    }, 2000);
};

test();
