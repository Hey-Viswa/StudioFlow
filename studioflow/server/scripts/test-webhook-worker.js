import Bull from 'bull';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const redisConfig = process.env.REDIS_URL
    ? process.env.REDIS_URL
    : {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined
    };

const paymentQueue = new Bull('payment', {
    redis: redisConfig
});

const testWorker = async () => {
    console.log('🧪 Testing Payment Webhook Worker...');

    const mockPayload = {
        subscription: {
            entity: {
                id: 'sub_test_123',
                notes: {
                    userId: 'test_user_id_placeholder' // Replace with a valid user ID for real testing
                }
            }
        }
    };

    console.log('📤 Adding mock job to queue...');

    const job = await paymentQueue.add({
        event: 'subscription.charged',
        payload: mockPayload
    });

    console.log(`✅ Job added with ID: ${job.id}`);
    console.log('👀 Check server logs to see if it was processed.');

    // Wait a bit then exit
    setTimeout(() => {
        console.log('👋 Exiting test script');
        process.exit(0);
    }, 2000);
};

testWorker().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
