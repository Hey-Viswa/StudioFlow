
import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const redis = new Redis(process.env.REDIS_URL);

async function clearCache() {
    try {
        console.log('Connecting to Redis...');
        const keys = await redis.keys('analytics:overview:*');
        
        if (keys.length === 0) {
            console.log('No analytics cache keys found.');
        } else {
            console.log(`Found ${keys.length} cache keys. Deleting...`);
            await redis.del(keys);
            console.log('Cache cleared successfully.');
        }
        
    } catch (err) {
        console.error('Error clearing cache:', err);
    } finally {
        redis.quit();
    }
}

clearCache();
