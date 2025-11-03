/**
 * Simple in-memory cache middleware for reducing MongoDB queries
 * For production, consider using Redis
 */

const cache = new Map();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Cache middleware factory
 * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
 * @returns {function} Express middleware
 */
export const cacheMiddleware = (ttl = DEFAULT_TTL) => {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Create cache key from URL and user ID
        const key = `${req.userId}:${req.originalUrl}`;
        const cachedResponse = cache.get(key);

        if (cachedResponse) {
            const { data, timestamp } = cachedResponse;
            const age = Date.now() - timestamp;

            // Check if cache is still valid
            if (age < ttl) {
                console.log(`✅ Cache HIT: ${key} (age: ${Math.round(age / 1000)}s)`);
                return res.json(data);
            } else {
                // Cache expired, remove it
                cache.delete(key);
                console.log(`⏰ Cache EXPIRED: ${key}`);
            }
        }

        console.log(`❌ Cache MISS: ${key}`);

        // Store original res.json
        const originalJson = res.json.bind(res);

        // Override res.json to cache the response
        res.json = function (data) {
            // Cache the response
            cache.set(key, {
                data,
                timestamp: Date.now()
            });
            console.log(`💾 Cached response: ${key}`);

            // Call original json method
            return originalJson(data);
        };

        next();
    };
};

/**
 * Clear cache for a specific user
 * Call this after mutations (POST, PUT, DELETE)
 */
export const clearUserCache = (userId) => {
    let cleared = 0;
    for (const key of cache.keys()) {
        if (key.startsWith(`${userId}:`)) {
            cache.delete(key);
            cleared++;
        }
    }
    console.log(`🧹 Cleared ${cleared} cache entries for user: ${userId}`);
};

/**
 * Clear all cache
 */
export const clearAllCache = () => {
    const size = cache.size;
    cache.clear();
    console.log(`🧹 Cleared all ${size} cache entries`);
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
    return {
        size: cache.size,
        keys: Array.from(cache.keys())
    };
};

// Clean up expired cache entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > DEFAULT_TTL) {
            cache.delete(key);
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        console.log(`🧹 Auto-cleaned ${cleaned} expired cache entries`);
    }
}, 10 * 60 * 1000);
