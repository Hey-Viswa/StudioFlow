import Redis from 'ioredis';

// Basic configuration from environment variables
export const redisConfig = process.env.REDIS_URL
    ? process.env.REDIS_URL
    : {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retryStrategy: (times) => Math.min(times * 50, 2000),
    };

// Singleton instance for general purpose (caching, presence, throttling)
let redisClient = null;

export const getRedisClient = () => {
    if (!redisClient) {
        console.log('🔌 Initializing Redis Client...');
        redisClient = new Redis(redisConfig);

        redisClient.on('connect', () => {
            console.log('✅ Redis Connected');
        });

        redisClient.on('error', (err) => {
            console.error('❌ Redis Error:', err);
        });
    }
    return redisClient;
};

// Factory for creating new instances
export const createRedisClient = () => {
    const client = new Redis({
        ...redisConfig,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times) => {
            if (times > 3) {
                console.warn('⚠️ Redis connection failed multiple times. Dependencies may not work.');
                return null; // Stop retrying after 3 attempts to prevent log spam/crashing loops if desired, but ioredis default is better.
                // Actually, let's keep retrying but slow down.
                return Math.min(times * 1000, 5000);
            }
            return 1000;
        }
    });

    client.on('error', (err) => {
        // Suppress initial connection errors to allow server to start
        // console.warn('Redis Client Error:', err.message);
    });

    return client;
};

export const isRedisAvailable = async () => {
    // Create a temporary client with no retries to fail fast
    const tempClient = new Redis({
        ...redisConfig,
        maxRetriesPerRequest: 0,
        retryStrategy: null,
        connectTimeout: 2000,
        lazyConnect: true
    });

    // Suppress error events (like ECONNREFUSED) to prevent runtime noise
    tempClient.on('error', () => { });

    try {
        await tempClient.connect();
        await tempClient.ping();
        await tempClient.quit();
        return true;
    } catch (e) {
        return false;
    }
};

export default getRedisClient;
