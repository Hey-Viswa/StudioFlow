import { getRedisClient, isRedisAvailable } from '../config/redis.js';

const PRESENCE_TTL = 45; // 45 seconds

export class RealtimeService {
    constructor(io) {
        this.io = io;
        this.redis = null;
        this.enabled = false;
        // Defer Redis connection until availability is confirmed to avoid noisy disconnect errors
        this.ready = this.initializeRedis();
    }

    async initializeRedis() {
        const available = await isRedisAvailable();
        this.enabled = available;

        if (!available) {
            console.warn('⚠️ RealtimeService: Redis unavailable. Presence and Rate Limiting disabled.');
            return;
        }

        this.redis = getRedisClient();
    }

    /**
     * Handle user presence heartbeat
     * @param {string} projectId 
     * @param {string} userId 
     * @param {object} userInfo - { displayName, etc }
     */
    async updatePresence(projectId, userId, userInfo) {
        await this.ready;
        if (!this.enabled || !this.redis) return;
        try {
            const key = `presence:${projectId}:${userId}`;
            const now = Date.now();

            // Update presence data with TTL
            await this.redis.hset(key, {
                userId,
                ...userInfo,
                state: 'online',
                lastActiveAt: now
            });
            await this.redis.expire(key, PRESENCE_TTL);

            this.io.to(`project:${projectId}:presence`).emit('presence.update', {
                projectId,
                users: [{ userId, state: 'online', lastActiveAt: now, ...userInfo }]
            });
        } catch (e) {
            console.warn('RealtimeService error (updatePresence):', e.message);
        }
    }

    /**
     * Remove user presence
     */
    async removePresence(projectId, userId) {
        await this.ready;
        if (!this.enabled || !this.redis) {
            // Fallback: just emit offline
            this.io.to(`project:${projectId}:presence`).emit('presence.update', {
                projectId,
                users: [{ userId, state: 'offline', lastActiveAt: Date.now() }]
            });
            return;
        }

        try {
            const key = `presence:${projectId}:${userId}`;
            await this.redis.del(key);

            this.io.to(`project:${projectId}:presence`).emit('presence.update', {
                projectId,
                users: [{ userId, state: 'offline', lastActiveAt: Date.now() }]
            });
        } catch (e) {
            console.warn('RealtimeService error (removePresence):', e.message);
        }
    }

    /**
     * Get all active users in a project
     */
    async getProjectPresence(projectId) {
        await this.ready;
        if (!this.enabled || !this.redis) return [];
        try {
            // Scan for keys matching presence:{projectId}:*
            const pattern = `presence:${projectId}:*`;
            const keys = await this.redis.keys(pattern);

            if (keys.length === 0) return [];

            const pipeline = this.redis.pipeline();
            keys.forEach(key => pipeline.hgetall(key));
            const results = await pipeline.exec();

            return results.map(([err, data]) => data).filter(data => data && data.userId);
        } catch (e) {
            console.warn('RealtimeService error (getProjectPresence):', e.message);
            return [];
        }
    }

    /**
     * Rate limiting check using Token Bucket (Redis)
     * Limit: 5 comments / 10s per user per project
     */
    async checkRateLimit(projectId, userId, actionType = 'comment', limit = 5, windowSeconds = 10) {
        await this.ready;
        if (!this.enabled || !this.redis) return { allowed: true }; // Allow if Redis is down

        try {
            const key = `ratelimit:${projectId}:${userId}:${actionType}`;
            const current = await this.redis.incr(key);

            if (current === 1) {
                await this.redis.expire(key, windowSeconds);
            }

            if (current > limit) {
                const ttl = await this.redis.ttl(key);
                return {
                    allowed: false,
                    retryAfterMs: Math.max(0, ttl * 1000)
                };
            }
            return { allowed: true };
        } catch (e) {
            console.warn('RealtimeService error (checkRateLimit):', e.message);
            return { allowed: true }; // Fail open
        }
    }
}
