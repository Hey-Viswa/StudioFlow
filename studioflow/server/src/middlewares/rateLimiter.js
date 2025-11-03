// server/src/middlewares/rateLimiter.js
// Simple in-memory rate limiter to prevent abuse
// For production, use Redis-backed rate limiting (e.g., express-rate-limit with Redis store)

const requestCounts = new Map();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 10; // Max 10 requests per window

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

export function rateLimiter(req, res, next) {
    // Use IP address as key (in production, consider using user ID if authenticated)
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!requestCounts.has(key)) {
        requestCounts.set(key, {
            count: 1,
            resetTime: now
        });
        return next();
    }
    
    const data = requestCounts.get(key);
    
    // Reset if window has passed
    if (now - data.resetTime > WINDOW_MS) {
        data.count = 1;
        data.resetTime = now;
        return next();
    }
    
    // Increment count
    data.count++;
    
    // Check if limit exceeded
    if (data.count > MAX_REQUESTS) {
        const retryAfter = Math.ceil((WINDOW_MS - (now - data.resetTime)) / 1000);
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({
            error: 'Too many requests',
            message: `Rate limit exceeded. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
            retryAfter
        });
    }
    
    next();
}

export default rateLimiter;
