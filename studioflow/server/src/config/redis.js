import dotenv from 'dotenv';
import { URL } from 'url';

dotenv.config();

const getRedisConfig = () => {
    // Case 1: REDIS_URL (Common in Railway/Heroku)
    if (process.env.REDIS_URL) {
        try {
            const redisUrl = new URL(process.env.REDIS_URL);
            const isTls = redisUrl.protocol === 'rediss:';

            console.log(`🔌 Redis Config: Using REDIS_URL (${isTls ? 'TLS' : 'Non-TLS'})`);

            return {
                port: Number(redisUrl.port),
                host: redisUrl.hostname,
                password: redisUrl.password,
                // Bull/ioredis specific TLS handling
                tls: isTls ? { rejectUnauthorized: false } : undefined,
                // Ensure we don't pass null/undefined for db if not present
                db: redisUrl.pathname ? Number(redisUrl.pathname.substring(1)) : 0
            };
        } catch (e) {
            console.warn('⚠️ Invalid REDIS_URL, falling back to individual variables:', e.message);
        }
    }

    // Case 2: Individual Variables (Standard or Railway specific)
    const host = process.env.REDIS_HOST || process.env.REDISHOST || '127.0.0.1';
    const port = Number(process.env.REDIS_PORT || process.env.REDISPORT || 6379);
    const password = process.env.REDIS_PASSWORD || process.env.REDISPASSWORD || undefined;
    const useTls = process.env.REDIS_TLS === 'true' || process.env.REDIS_SSL === 'true';

    console.log(`🔌 Redis Config: Using variables (Host: ${host}, Port: ${port}, TLS: ${useTls})`);

    return {
        port,
        host,
        password,
        tls: useTls ? { rejectUnauthorized: false } : undefined
    };
};

const redisConfig = getRedisConfig();

export default redisConfig;
