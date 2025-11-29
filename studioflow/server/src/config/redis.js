import dotenv from 'dotenv';
import { URL } from 'url';

dotenv.config();

const getRedisConfig = () => {
    // Case 1: REDIS_URL (Common in Railway/Heroku)
    if (process.env.REDIS_URL) {
        try {
            const redisUrl = new URL(process.env.REDIS_URL);
            return {
                port: redisUrl.port,
                host: redisUrl.hostname,
                password: redisUrl.password,
                tls: redisUrl.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined
            };
        } catch (e) {
            console.warn('Invalid REDIS_URL, falling back to individual variables');
        }
    }

    // Case 2: Individual Variables (Standard or Railway specific)
    return {
        port: process.env.REDIS_PORT || process.env.REDISPORT || 6379,
        host: process.env.REDIS_HOST || process.env.REDISHOST || '127.0.0.1',
        password: process.env.REDIS_PASSWORD || process.env.REDISPASSWORD || undefined,
        // Add TLS support if needed for production Redis (e.g., Upstash, AWS)
        ...((process.env.REDIS_TLS === 'true' || process.env.REDIS_SSL === 'true') && {
            tls: {
                rejectUnauthorized: false
            }
        })
    };
};

const redisConfig = getRedisConfig();

export default redisConfig;
