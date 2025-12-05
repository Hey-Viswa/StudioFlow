import Queue from 'bull';
import Redis from 'ioredis';
import { redisConfig, isRedisAvailable } from '../config/redis.js';

// Check if Redis queue is enabled and available
const isRedisConfigured = process.env.ENABLE_REDIS_QUEUE === 'true';
// Use top-level await to prevent connection attempts if Redis is down
const isRedisUp = isRedisConfigured ? await isRedisAvailable() : false;

const isQueueEnabled = isRedisUp;

let notificationQueue;

if (isQueueEnabled) {
    console.log('🔌 Initializing Redis Notification Queue...');

    // Custom createClient function to handle Redis connections robustly
    const createClient = (type) => {
        // Bull requires maxRetriesPerRequest to be null
        // enableReadyCheck: false is also recommended/required for bclient/subscriber
        const client = new Redis({
            ...redisConfig,
            maxRetriesPerRequest: null,
            enableReadyCheck: false
        });

        client.on('error', (err) => {
            // Suppress ECONNRESET logs to avoid spamming, as ioredis handles reconnection
            if (err.code === 'ECONNRESET') {
                // console.warn(`⚠️ Redis ${type} connection reset. Reconnecting...`);
            } else {
                console.error(`❌ Redis ${type} error:`, err);
            }
        });

        client.on('connect', () => {
            // console.log(`✅ Redis ${type} connected`);
        });

        return client;
    };

    // Create the notification queue with custom client creator
    notificationQueue = new Queue('notification-queue', {
        createClient,
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000,
            },
            removeOnComplete: true,
            removeOnFail: false,
        },
    });

    // Event listeners for logging
    notificationQueue.on('active', (job) => {
        console.log(`Processing notification job ${job.id} of type ${job.name}`);
    });

    notificationQueue.on('completed', (job) => {
        console.log(`Notification job ${job.id} completed`);
    });

    notificationQueue.on('failed', (job, err) => {
        console.error(`Notification job ${job.id} failed:`, err);
    });

    notificationQueue.on('error', (error) => {
        // Handle queue-level errors
        if (error.code === 'ECONNRESET') {
            // console.warn('⚠️ Notification Queue connection reset');
        } else {
            console.error('❌ Notification Queue Error:', error);
        }
    });

    notificationQueue.on('waiting', (jobId) => {
        console.log(`⏳ Notification job ${jobId} waiting in queue`);
    });

    notificationQueue.on('ready', () => {
        console.log('✅ Notification Queue connected to Redis');
    });
} else {
    if (isRedisConfigured) {
        console.warn('⚠️ Redis configured but unreachable. Notification Queue disabled.');
    } else {
        console.log('⚠️ Redis Queue DISABLED. Using Direct Notification Mode.');
    }
    // Mock queue interface
    notificationQueue = {
        add: async () => {
            throw new Error('Queue is disabled');
        },
        process: () => {
            console.log('ℹ️ Queue processing skipped (Direct Mode active)');
        },
        on: () => { },
        isReady: () => false
    };
}

export { notificationQueue, isQueueEnabled };
