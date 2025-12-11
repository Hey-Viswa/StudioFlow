import { createQueue } from './QueueFactory.js';

// Queue for aggregating notifications into digests
export const notificationBatchQueue = createQueue('notification-batch', {
    defaultJobOptions: {
        priority: 10, // Low priority background work
        removeOnComplete: true
    }
});

export default notificationBatchQueue;
