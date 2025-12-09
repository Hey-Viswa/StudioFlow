import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import { getRedisClient, isRedisAvailable } from '../config/redis.js';

// Global limiters
let globalLimiter = null;
let authLimiter = null;
let isRedis = false;

const initLimiters = async () => {
  if (globalLimiter) return;

  const redisAvailable = await isRedisAvailable();
  isRedis = redisAvailable;

  if (redisAvailable) {
    console.log('🛡️  Initializing Redis Rate Limiters...');
    const redisClient = getRedisClient();
    
    // IP-based limiter for unauthenticated requests
    globalLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl:ip',
      points: 100, // 100 requests
      duration: 60 * 15, // per 15 minutes
      inmemoryBlockOnConsumed: 100, // Prevent Redis flooding
    });

    // User-based limiter for authenticated requests
    authLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl:auth',
      points: 1000, // 1000 requests (generous but safe)
      duration: 60 * 15, // per 15 minutes
      inmemoryBlockOnConsumed: 1000, // Prevent Redis flooding
    });
  } else {
    console.log('🛡️  Initializing Memory Rate Limiters (Fallback)...');
    
    globalLimiter = new RateLimiterMemory({
      points: 100,
      duration: 60 * 15,
    });

    authLimiter = new RateLimiterMemory({
      points: 1000,
      duration: 60 * 15,
    });
  }
};

// Initialize immediately
initLimiters();

export const rateLimiter = async (req, res, next) => {
  try {
    if (!globalLimiter) {
      await initLimiters();
    }

    // Add a timeout to prevent hanging if Redis is slow
    const consumePromise = req.userId 
      ? authLimiter.consume(req.userId)
      : globalLimiter.consume(req.ip);

    // If using Redis, race with a timeout
    if (isRedis) {
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('RateLimiterTimeout')), 1000)
        );
        await Promise.race([consumePromise, timeoutPromise]);
    } else {
        await consumePromise;
    }
    
    next();
  } catch (err) {
    // If it's a rate limit error (has remainingPoints), send 429
    if (err && typeof err.remainingPoints !== 'undefined') {
        return res.status(429).json({
            error: 'Too Many Requests',
            message: 'You have exceeded the rate limit. Please try again later.',
            retryAfter: Math.round(err.msBeforeNext / 1000) || 60
        });
    }

    // If it's a timeout or Redis error, log warning and ALLOW request (Fail Open)
    console.warn('⚠️ Rate Limiter Error/Timeout (Allowing Request):', err.message || err);
    next();
  }
};

export default rateLimiter;
