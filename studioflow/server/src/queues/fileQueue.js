import { createQueue } from './QueueFactory.js';

/**
 * Queue for handling file processing tasks:
 * - Virus scanning (simulated)
 * - Thumbnail generation (simulated)
 * - Cloud synchronization
 */
const fileQueue = createQueue('file-processing', {
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000
        },
        removeOnComplete: true
    }
});

export { fileQueue };
