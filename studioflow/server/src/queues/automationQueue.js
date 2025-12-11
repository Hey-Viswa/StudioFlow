import { createQueue } from './QueueFactory.js';

// Queue for auto-tagging files based on rules
export const tagQueue = createQueue('automation-tags', {
    defaultJobOptions: {
        priority: 5 // Lower priority than critical emails
    }
});

// Queue for auto-creating tasks from comments/events
export const taskQueue = createQueue('automation-tasks', {
    defaultJobOptions: {
        priority: 5
    }
});

export default {
    tagQueue,
    taskQueue
};
