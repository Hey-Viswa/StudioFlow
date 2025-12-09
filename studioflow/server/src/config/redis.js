import Redis from 'ioredis';

// Resolve config at call time to honor env loaded later (e.g., scripts that load dotenv after imports)
export const getRedisConfig = () => process.env.REDIS_URL
    ? process.env.REDIS_URL
    : {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
        retryStrategy: (times) => Math.min(times * 50, 2000),
    };

// Singleton instance for general purpose (caching, presence, throttling)
let redisClient = null;
let redisErrorLogged = false;

export const getRedisClient = () => {
    if (!redisClient) {
        console.log('🔌 Initializing Redis Client...');
        // Standard ioredis constructor handles string or object
        redisClient = new Redis(getRedisConfig());

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
    const redisConfig = getRedisConfig();
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
    const redisConfig = getRedisConfig();
    // Create a temporary client with no retries to fail fast
    const baseOptions = {
        maxRetriesPerRequest: 0,
        retryStrategy: null,
        connectTimeout: 2000,
        lazyConnect: true
    };

    // Handle string vs object config correctly (spreading a string breaks host/port)
    const tempClient = typeof redisConfig === 'string'
        ? new Redis(redisConfig, baseOptions)
        : new Redis({
            ...redisConfig,
            ...baseOptions
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
