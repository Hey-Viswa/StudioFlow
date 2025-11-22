// server/src/middlewares/rateLimiter.js
// Production-ready rate limiter with per-plan limits
// Uses sliding window algorithm with in-memory storage (Redis recommended for multi-instance deployments)

import User from '../models/User.js';

const requestCounts = new Map();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes sliding window

// Rate limits per subscription plan (requests per 15-minute window)
const PLAN_LIMITS = {
  free: {
    maxRequests: 100,
    burst: 20 // Max requests in 1 minute burst
  },
  pro: {
    maxRequests: 500,
    burst: 100
  },
  studio: {
    maxRequests: 2000,
    burst: 400
  },
  default: {
    maxRequests: 50, // For unauthenticated users
    burst: 10
  }
};

function cleanup() {
    const now = Date.now();
    for (const [key, data] of requestCounts.entries()) {
        if (now - data.resetTime > WINDOW_MS) {
            requestCounts.delete(key);
        }
    }
}

// Run cleanup every 10 minutes
setInterval(cleanup, 10 * 60 * 1000);

export async function rateLimiter(req, res, next) {
    const now = Date.now();
    let key, limit, burstLimit;
    
    // Use user ID if authenticated, otherwise IP address
    if (req.userId) {
        key = `user:${req.userId}`;
        
        // Fetch user's plan from database
        try {
            const user = await User.findOne({ clerkUserId: req.userId }).select('subscription.plan');
            const userPlan = user?.subscription?.plan || 'free';
            limit = PLAN_LIMITS[userPlan] || PLAN_LIMITS.free;
        } catch (error) {
            console.error('Rate limiter: Error fetching user plan:', error);
            limit = PLAN_LIMITS.free;
        }
    } else {
        key = `ip:${req.ip || req.connection.remoteAddress}`;
        limit = PLAN_LIMITS.default;
    }
    
    burstLimit = limit.burst;
    const maxRequests = limit.maxRequests;
    
    if (!requestCounts.has(key)) {
        requestCounts.set(key, {
            count: 1,
            resetTime: now,
            burstCount: 1,
            burstResetTime: now
        });
        return next();
    }
    
    const data = requestCounts.get(key);
    
    // Reset window if expired
    if (now - data.resetTime > WINDOW_MS) {
        data.count = 1;
        data.resetTime = now;
        data.burstCount = 1;
        data.burstResetTime = now;
        return next();
    }
    
    // Reset burst counter every minute
    if (now - data.burstResetTime > 60 * 1000) {
        data.burstCount = 1;
        data.burstResetTime = now;
    } else {
        data.burstCount++;
    }
    
    // Increment main counter
    data.count++;
    
    // Check burst limit first (prevents rapid-fire abuse)
    if (data.burstCount > burstLimit) {
        const retryAfter = Math.ceil((60 * 1000 - (now - data.burstResetTime)) / 1000);
        res.set('Retry-After', String(retryAfter));
        res.set('X-RateLimit-Limit', String(maxRequests));
        res.set('X-RateLimit-Remaining', '0');
        res.set('X-RateLimit-Reset', String(Math.floor((data.resetTime + WINDOW_MS) / 1000)));
        
        return res.status(429).json({
            error: 'Too many requests',
            message: `Burst limit exceeded. Please slow down. Try again in ${retryAfter} seconds.`,
            retryAfter,
            limitType: 'burst'
        });
    }
    
    // Check main rate limit
    if (data.count > maxRequests) {
        const retryAfter = Math.ceil((WINDOW_MS - (now - data.resetTime)) / 1000);
        res.set('Retry-After', String(retryAfter));
        res.set('X-RateLimit-Limit', String(maxRequests));
        res.set('X-RateLimit-Remaining', '0');
        res.set('X-RateLimit-Reset', String(Math.floor((data.resetTime + WINDOW_MS) / 1000)));
        
        return res.status(429).json({
            error: 'Too many requests',
            message: `Rate limit exceeded. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
            retryAfter,
            limitType: 'window',
            upgradeMessage: req.userId ? 'Upgrade your plan for higher limits' : 'Sign in for higher limits'
        });
    }
    
    // Add rate limit headers to response
    res.set('X-RateLimit-Limit', String(maxRequests));
    res.set('X-RateLimit-Remaining', String(maxRequests - data.count));
    res.set('X-RateLimit-Reset', String(Math.floor((data.resetTime + WINDOW_MS) / 1000)));
    
    next();
}

export default rateLimiter;
