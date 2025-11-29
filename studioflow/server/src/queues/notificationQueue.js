import Queue from 'bull';
import redisConfig from '../config/redis.js';

// Check if Redis queue is enabled
// Forcing Direct Mode for local development reliability
const isQueueEnabled = false; // process.env.ENABLE_REDIS_QUEUE === 'true';

let notificationQueue;

if (isQueueEnabled) {
    console.log('🔌 Initializing Redis Notification Queue...');
    // Create the notification queue
    notificationQueue = new Queue('notification-queue', {
        redis: redisConfig,
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000,
            },
            removeOnComplete: true,
            removeOnFail: false,
        },
    });

    // Event listeners for logging
    notificationQueue.on('active', (job) => {
        console.log(`Processing notification job ${job.id} of type ${job.name}`);
    });

    notificationQueue.on('completed', (job) => {
        console.log(`Notification job ${job.id} completed`);
    });

    notificationQueue.on('failed', (job, err) => {
        console.error(`Notification job ${job.id} failed:`, err);
    });

    notificationQueue.on('error', (error) => {
        console.error('❌ Notification Queue Error:', error);
    });

    notificationQueue.on('waiting', (jobId) => {
        console.log(`⏳ Notification job ${jobId} waiting in queue`);
    });

    notificationQueue.on('ready', () => {
        console.log('✅ Notification Queue connected to Redis');
    });
} else {
    console.log('⚠️ Redis Queue DISABLED. Using Direct Notification Mode.');
    // Mock queue interface
    notificationQueue = {
        add: async () => {
            throw new Error('Queue is disabled');
        },
        process: () => {
            console.log('ℹ️ Queue processing skipped (Direct Mode active)');
        },
        on: () => { },
        isReady: () => false
    };
}

export { notificationQueue, isQueueEnabled };
