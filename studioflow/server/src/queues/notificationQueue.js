import Queue from 'bull';
import redisConfig from '../config/redis.js';

// Create the notification queue
const notificationQueue = new Queue('notification-queue', {
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

export { notificationQueue };
