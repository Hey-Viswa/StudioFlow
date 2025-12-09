import path from 'node:path';
import dotenv from 'dotenv';
import { isRedisAvailable, getRedisConfig } from '../src/config/redis.js';

// Load root .env (server/.env relative to this script)
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const describeConfig = () => {
  const cfg = getRedisConfig();
  if (typeof cfg === 'string') return cfg.replace(/:[^:@/]+@/, ':***@');
  const { host, port } = cfg;
  return `${host || 'localhost'}:${port || 6379}`;
};

(async () => {
  try {
    const reachable = await isRedisAvailable();
    if (reachable) {
      console.log(`✅ Redis reachable at ${describeConfig()}`);
      process.exit(0);
    }
    console.error(`❌ Redis NOT reachable at ${describeConfig()}`);
    console.error('Hint: set ENABLE_REDIS_QUEUE=true and REDIS_URL (or REDIS_HOST/PORT/PASSWORD), then restart.');
    process.exit(1);
  } catch (err) {
    console.error('❌ Redis check failed:', err.message);
    process.exit(1);
  }
})();
