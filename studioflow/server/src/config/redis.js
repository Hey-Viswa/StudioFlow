import dotenv from 'dotenv';

dotenv.config();

const redisConfig = {
    port: process.env.REDIS_PORT || 6379,
    host: process.env.REDIS_HOST || '127.0.0.1',
    password: process.env.REDIS_PASSWORD || undefined,
    // Add TLS support if needed for production Redis (e.g., Upstash, AWS)
    ...(process.env.REDIS_TLS === 'true' && {
        tls: {
            rejectUnauthorized: false
        }
    })
};

export default redisConfig;
