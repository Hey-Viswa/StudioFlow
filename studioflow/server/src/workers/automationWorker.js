import { tagQueue, taskQueue } from '../queues/automationQueue.js';
import automationService from '../services/automationService.js';

// Start Automation Workers
export const startAutomationWorker = () => {
    if (process.env.ENABLE_REDIS_QUEUE !== 'true') {
        console.log('ℹ️ Automation Worker skipped (Direct Mode active)');
        return;
    }

    console.log('🤖 Automation Worker starting...');

    // Process Auto-Tagging Jobs
    tagQueue.process(async (job) => {
        try {
            await automationService.processTagAutomation(job.data);
        } catch (error) {
            console.error(`❌ Auto-tagging failed for job ${job.id}:`, error);
            throw error;
        }
    });

    // Process Task Automation Jobs
    taskQueue.process(async (job) => {
        try {
            await automationService.processTaskAutomation(job.data);
        } catch (error) {
            console.error(`❌ Task automation failed for job ${job.id}:`, error);
            throw error;
        }
    });

    console.log('🤖 Automation workers initialized');
};
