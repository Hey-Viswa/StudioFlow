import { tagQueue, taskQueue } from '../queues/automationQueue.js';
import automationService from '../services/automationService.js';
import { startTagProcessor } from './tagProcessor.js';

// Start Automation Workers
export const startAutomationWorker = () => {
    if (process.env.ENABLE_REDIS_QUEUE !== 'true') {
        console.log('ℹ️ Automation Worker skipped (Direct Mode active)');
        return;
    }

    console.log('🤖 Automation Worker starting...');

    // Start isolated Tag Processor
    startTagProcessor();

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
