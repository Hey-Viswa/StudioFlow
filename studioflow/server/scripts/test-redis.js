import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const getRedisConfig = () => {
    if (process.env.REDIS_URL) {
        console.log('Using REDIS_URL');
        return process.env.REDIS_URL;
    }

    return {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
    };
};

const config = getRedisConfig();
console.log('Connecting to Redis with config:', typeof config === 'string' ? 'URL' : config);

const redis = new Redis(config);

redis.on('connect', () => {
    console.log('✅ Connected to Redis');
});

redis.on('error', (err) => {
    console.error('❌ Redis Error:', err);
});

const test = async () => {
    try {
        await redis.set('test-key', 'hello world');
        const value = await redis.get('test-key');
        console.log('📝 Read/Write Test:', value === 'hello world' ? 'PASSED' : 'FAILED');

        await redis.del('test-key');
        console.log('✅ Cleanup complete');
        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
};

test();
