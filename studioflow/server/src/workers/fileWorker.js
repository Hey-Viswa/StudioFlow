import { fileQueue } from '../queues/fileQueue.js';

/**
 * Starts the worker for processing file jobs.
 */
export const startFileWorker = () => {
    if (process.env.ENABLE_REDIS_QUEUE !== 'true') {
        console.log('ℹ️ File Worker skipped (Redis disabled)');
        return;
    }

    console.log('👷 File Worker starting...');

    fileQueue.process(async (job) => {
        const { fileId, filename, size, userId } = job.data;
        console.log(`📂 Processing file: ${filename} (ID: ${fileId})`);

        try {
            // Simulator: 1. Virus Scan
            await simulateStep('Virus Scan', 2000);
            job.progress(33);

            // Simulator: 2. Image Optimization / Thumbnail
            await simulateStep('Optimization', 3000);
            job.progress(66);

            // Simulator: 3. Cloud Sync / Finalize
            await simulateStep('Cloud Sync', 1000);
            job.progress(100);

            console.log(`✅ File processing complete: ${filename}`);
            return { processed: true, fileId };

        } catch (error) {
            console.error(`❌ File processing failed for ${filename}:`, error);
            throw error;
        }
    });
};

const simulateStep = (name, duration) => {
    return new Promise((resolve) => {
        console.log(`   ⟳ Running ${name}...`);
        setTimeout(resolve, duration);
    });
};
