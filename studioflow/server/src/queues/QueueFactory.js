import Queue from 'bull';
import Redis from 'ioredis';
import { redisConfig } from '../config/redis.js';

/**
 * Factory to create Bull queues with consistent Redis connections and error handling.
 */
export const createQueue = (queueName, options = {}) => {
    const isRedisEnabled = process.env.ENABLE_REDIS_QUEUE === 'true';

    // If queues are disabled via env, return a mock queue to avoid noise
    if (!isRedisEnabled) {
        console.warn(`⚠️ Redis Queue DISABLED. Mocking queue: ${queueName}`);
        return {
            name: queueName,
            add: async () => { console.log(`ℹ️ [Mock ${queueName}] Job added (skipped)`); },
            process: () => { console.log(`ℹ️ [Mock ${queueName}] Worker started (mock)`); },
            on: () => { },
            isReady: () => false,
            close: async () => { }
        };
    }

    console.log(`🔌 Initializing Queue: ${queueName}...`);

    // Custom client creator for Bull to handle ioredis connections robustly
    const createClient = (type) => {
        const client = new Redis({
            ...redisConfig,
            // Bull requirements
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            // Retry strategy including a slightly longer delay to prevent rapid loops
            retryStrategy: (times) => Math.min(times * 200, 5000)
        });

        // Simple throttle for error logging
        let lastErrorTime = 0;
        client.on('error', (err) => {
            const now = Date.now();
            if (now - lastErrorTime > 5000) { // Log at most once every 5 seconds per client
                if (err.code !== 'ECONNRESET' && err.code !== 'ECONNREFUSED') {
                    console.error(`❌ Redis ${type} error (${queueName}):`, err.message);
                } else if (err.code === 'ECONNREFUSED') {
                    console.warn(`⚠️ Redis ${type} disconnected (${queueName}) - retrying...`);
                }
                lastErrorTime = now;
            }
        });

        return client;
    };

    const queue = new Queue(queueName, {
        createClient,
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
            removeOnComplete: true,
            removeOnFail: false, // Keep failed jobs for debugging
            ...options.defaultJobOptions // Override defaults if provided
        },
        ...options
    });

    // Standard Logging
    queue.on('active', (job) => {
        console.log(`[${queueName}] Processing job ${job.id}`);
    });

    queue.on('completed', (job) => {
        console.log(`[${queueName}] Job ${job.id} completed`);
    });

    queue.on('failed', (job, err) => {
        console.error(`[${queueName}] Job ${job.id} failed: ${err.message}`);
    });

    queue.on('error', (error) => {
        if (error.code !== 'ECONNRESET') {
            console.error(`[${queueName}] Queue Error:`, error.message, '→ Ensure Redis is running or set ENABLE_REDIS_QUEUE=false to silence.');
        }
    });

    queue.on('ready', () => {
        console.log(`✅ Queue Ready: ${queueName}`);
    });

    return queue;
};
