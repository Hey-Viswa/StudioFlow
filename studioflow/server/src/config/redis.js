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
let redisErrorLogged = false;

export const getRedisClient = () => {
    if (!redisClient) {
        console.log('🔌 Initializing Redis Client...');
        // Standard ioredis constructor handles string or object
        redisClient = new Redis(redisConfig);

        redisClient.on('connect', () => {
            console.log('✅ Redis Connected');
        });

        redisClient.on('error', (err) => {
            if (!redisErrorLogged) {
                console.warn('⚠️ Redis error (using in-memory fallback if available):', err.message);
                redisErrorLogged = true;
            }
        });
    }
    return redisClient;
};

// Factory for creating new instances
export const createRedisClient = () => {
    const options = {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times) => {
            if (times > 3) {
                if (!redisErrorLogged) {
                    console.warn('⚠️ Redis connection failed multiple times. Realtime features falling back to memory.');
                    redisErrorLogged = true;
                }
                return 5000;
            }
            return 1000;
        }
    };

    // Handle string vs object config to avoid spreading a string
    let client;
    if (typeof redisConfig === 'string') {
        client = new Redis(redisConfig, options);
    } else {
        client = new Redis({
            ...redisConfig,
            ...options
        });
    }

    client.on('error', (err) => {
        if (!redisErrorLogged) {
            console.warn('⚠️ Redis Client Error:', err.message);
            redisErrorLogged = true;
        }
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
