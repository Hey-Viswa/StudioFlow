import dotenv from 'dotenv';

dotenv.config();

// Force localhost by setting REDIS_URL to empty string so dotenv doesn't overwrite it
process.env.REDIS_URL = '';
console.log('🔧 Forced local Redis configuration for testing.');

const IDLE_TIME_MS = 10000; // 10 seconds

console.log('🧪 Starting Redis Connection Stability Test...');
console.log(`⏱️  Simulating idle time of ${IDLE_TIME_MS / 1000} seconds...`);

async function runTest() {
    try {
        // Dynamic import to ensure env var is deleted BEFORE config loads
        const { notificationQueue } = await import('../src/queues/notificationQueue.js');

        // 1. Wait for connection
        notificationQueue.isReady().then(() => {
            console.log('✅ Queue is ready. Waiting...');
        });

        // 2. Simulate Idle Time
        setTimeout(async () => {
            console.log('⚡ Idle time over. Enqueuing test job...');

            try {
                // 3. Add Job
                const job = await notificationQueue.add('test-notification', {
                    type: 'TEST_CONNECTION',
                    data: { message: 'Keep-alive verification' },
                    actorId: 'test-user'
                });

                console.log(`📨 Job ${job.id} added. Waiting for processing...`);

                // 4. Process Job
                notificationQueue.process('test-notification', async (job) => {
                    console.log(`👷 Processing job ${job.id}...`);
                    return { success: true };
                });

                // 5. Listen for completion
                job.finished().then(() => {
                    console.log('✅ Test Passed: Job processed successfully after idle time.');
                    process.exit(0);
                }).catch((err) => {
                    console.error('❌ Test Failed: Job failed:', err);
                    process.exit(1);
                });

            } catch (error) {
                console.error('❌ Test Failed: Could not add job:', error);
                process.exit(1);
            }

        }, IDLE_TIME_MS);

        // Monitor for errors
        notificationQueue.on('error', (error) => {
            console.error('❌ Queue Error:', error);
        });

    } catch (error) {
        console.error('❌ Failed to import queue or initialize test:', error);
        process.exit(1);
    }
}

runTest();
