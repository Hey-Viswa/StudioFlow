import { tagQueue } from '../queues/automationQueue.js';
import automationService from '../services/automationService.js';

export const startTagProcessor = () => {
    console.log('👷 TagProcessor: Worker starting...');

    // Process jobs from the 'automation-tags' queue
    // Concurrency: 5 (can be adjusted based on load)
    tagQueue.process('process-file-tags', 5, async (job) => {
        const { fileId, filename } = job.data;
        console.log(`👷 TagProcessor: Picked up job ${job.id} for file ${filename} (${fileId})`);

        try {
            await automationService.processTagAutomation(job.data);
            console.log(`✅ TagProcessor: Job ${job.id} completed`);
            return Promise.resolve({ success: true, fileId });
        } catch (error) {
            console.error(`❌ TagProcessor: Job ${job.id} failed:`, error);
            // Bull will automatically handle retries based on queue config
            throw error;
        }
    });

    // Error handling
    tagQueue.on('error', (error) => {
        console.error('❌ TagProcessor Queue Error:', error);
    });

    tagQueue.on('failed', (job, err) => {
        console.error(`❌ TagProcessor Job ${job.id} failed:`, err);
    });

    console.log('✅ TagProcessor: Worker started and listening for jobs');
};
