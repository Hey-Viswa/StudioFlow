import { createQueue } from './QueueFactory.js';
import { isRedisAvailable } from '../config/redis.js';

const isRedisConfigured = process.env.ENABLE_REDIS_QUEUE === 'true';

// Use top-level await if supported (in ES modules) to check connection, or rely on Factory's logic
// The Factory handles the ENABLE_REDIS_QUEUE check internally.

const notificationQueue = createQueue('notification-queue', {
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    }
});

// Export isQueueEnabled compatible with old usage
const isQueueEnabled = isRedisConfigured;

export { notificationQueue, isQueueEnabled };

