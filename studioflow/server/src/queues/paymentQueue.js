import Bull from 'bull';

// Redis configuration - supports both REDIS_URL and individual config
const redisConfig = process.env.REDIS_URL
    ? process.env.REDIS_URL  // Railway/Cloud Redis URL
    : {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retryStrategy: (times) => Math.min(times * 50, 2000)
    };

// Create payment queue
let paymentQueue;
const isQueueEnabled = process.env.ENABLE_REDIS_QUEUE === 'true';

if (isQueueEnabled) {
    paymentQueue = new Bull('payment', {
        redis: redisConfig,
        defaultJobOptions: {
            attempts: 5, // Higher attempts for payments
            backoff: {
                type: 'exponential',
                delay: 5000 // Start with 5s delay
            },
            removeOnComplete: true,
            removeOnFail: false
        }
    });
} else {
    console.log('⚠️ Redis Queue DISABLED. Using Mock Payment Queue.');
    paymentQueue = {
        process: () => { },
        add: async () => { console.log('ℹ️ Mock Payment Queue: Job added (skipped)'); },
        on: () => { },
        isReady: () => false
    };
}

// Queue event listeners
if (isQueueEnabled) {
    paymentQueue.on('completed', (job) => {
        console.log(`✅ Payment job ${job.id} completed`);
    });

    paymentQueue.on('failed', (job, err) => {
        console.error(`❌ Payment job ${job.id} failed:`, err.message);
    });
}

console.log('💳 Payment queue initialized');

export { paymentQueue };
export default paymentQueue;
