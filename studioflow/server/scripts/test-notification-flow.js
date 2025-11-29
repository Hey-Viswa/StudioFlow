
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { triggerNotification } from '../src/services/notificationService.js';
import { startNotificationWorker } from '../src/workers/notificationWorker.js';
import mongoose from 'mongoose';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });
console.log('DEBUG: ENABLE_REDIS_QUEUE =', process.env.ENABLE_REDIS_QUEUE);

const testNotification = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🚀 Starting Notification Worker...');
        startNotificationWorker();

        console.log('📨 Triggering Test Notification...');
        const result = await triggerNotification(
            'test.event',
            {
                message: 'This is a test notification',
                title: 'Test Notification',
                projectId: 'test-project',
                priority: 'medium'
            },
            'test-actor-id'
        );

        console.log('✅ Notification Trigger Result:', result ? (result.id ? `Job ID: ${result.id}` : 'Direct Execution') : 'Failed');

        // Keep alive for a bit to allow worker to process
        console.log('⏳ Waiting for worker to process...');
        setTimeout(async () => {
            console.log('🏁 Finished waiting. Exiting...');
            await mongoose.disconnect();
            process.exit(0);
        }, 5000);

    } catch (error) {
        console.error('❌ Error testing notification:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

testNotification();
