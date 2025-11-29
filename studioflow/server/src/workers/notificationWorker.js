import { notificationQueue } from '../queues/notificationQueue.js';
import { processNotificationEvent } from '../services/notificationService.js';

// This function will be called to start processing jobs
// This function will be called to start processing jobs
export const startNotificationWorker = () => {
    if (process.env.ENABLE_REDIS_QUEUE !== 'true') {
        console.log('ℹ️ Notification Worker skipped (Direct Mode active)');
        return;
    }

    console.log('👷 Notification Worker starting...');

    // Process with concurrency (e.g., 5 jobs at a time)
    notificationQueue.process(5, async (job) => {
        const { type, data, actorId } = job.data;

        console.log(`📨 Processing ${type} notification (Job ID: ${job.id})`);

        try {
            // Use the shared processing logic
            await processNotificationEvent(type, data, actorId);
        } catch (error) {
            console.error(`Error processing job ${job.id}:`, error);
            throw error;
        }
    });

    console.log('👷 Notification Worker started with concurrency: 5');
};

