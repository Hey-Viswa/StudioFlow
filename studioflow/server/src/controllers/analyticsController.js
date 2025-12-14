
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import ProjectInvoice from '../models/ProjectInvoice.js';
import AuditLog from '../models/AuditLog.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';
import { getRedisClient } from '../config/redis.js';

export const getOverview = async (req, res) => {
    try {
        const userId = req.userId;
        console.log(`[Analytics] Request for overview. UserId: ${userId}`);

        if (!userId) {
            console.error('[Analytics] Error: userId is missing from request object.');
            return res.status(401).json({ error: 'User ID missing' });
        }

        // 1. Feature Flag Check
        const isEnabled = await isFeatureEnabled('ANALYTICS_DASHBOARD');
        console.log(`[Analytics] Feature Enabled: ${isEnabled}`);
        if (!isEnabled) {
            return res.status(403).json({ error: 'Analytics dashboard is currently disabled.' });
        }

        // 2. Cache Check
        const redis = getRedisClient();
        const cacheKey = `analytics:overview:${userId}`;

        if (redis) {
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
                return res.status(200).json(JSON.parse(cachedData));
            }
        }

        // 3. Aggregations (Executed in parallel)
        console.log('[Analytics] Starting aggregations...');
        const [
            projectsCompleted,
            revisionsCount,
            paymentMetrics,
            heatmap
        ] = await Promise.all([
            // Metric 1: Projects Completed
            Project.countDocuments({ ownerId: userId, status: 'completed' }),

            // Metric 2: Revisions Count (Tasks assigned by user that are revisions)
            Task.countDocuments({ assignedBy: userId, isRevisionTask: true }),

            // Metric 3, 4, 5: Payment Metrics (Response Time, Success Rate, Avg Value)
            ProjectInvoice.aggregate([
                { $match: { userId: userId, status: { $in: ['paid', 'overdue', 'failed'] } } },
                {
                    $group: {
                        _id: null,
                        totalInvoices: { $sum: 1 },
                        paidInvoices: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
                        totalPaidAmount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$total', 0] } },
                        avgResponseTime: {
                            $avg: {
                                $cond: [
                                    { $and: [{ $eq: ['$status', 'paid'] }, { $ne: ['$sentAt', null] }, { $ne: ['$paidAt', null] }] },
                                    { $subtract: ['$paidAt', '$sentAt'] },
                                    null
                                ]
                            }
                        }
                    }
                }
            ]),

            // Metric 6: Weekly Activity Heatmap
            AuditLog.aggregate([
                { 
                    $match: { 
                        userId: userId, 
                        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
                    } 
                },
                { 
                    $project: { 
                        dayOfWeek: { $dayOfWeek: '$createdAt' }, // 1 (Sun) - 7 (Sat)
                        hour: { $hour: '$createdAt' } // 0 - 23
                    } 
                },
                { 
                    $group: { 
                        _id: { day: '$dayOfWeek', hour: '$hour' }, 
                        count: { $sum: 1 } 
                    } 
                },
                {
                    $project: {
                        _id: 0,
                        day: '$_id.day',
                        hour: '$_id.hour',
                        count: 1
                    }
                }
            ])
        ]);

        // Process Payment Metrics
        const paymentStats = paymentMetrics[0] || { totalInvoices: 0, paidInvoices: 0, totalPaidAmount: 0, avgResponseTime: 0 };
        const paymentSuccessRate = paymentStats.totalInvoices > 0 
            ? (paymentStats.paidInvoices / paymentStats.totalInvoices) * 100 
            : 0;
        const avgInvoiceValue = paymentStats.paidInvoices > 0 
            ? paymentStats.totalPaidAmount / paymentStats.paidInvoices 
            : 0;

        // Construct Response
        const responsePayload = {
            summary: {
                projectsCompleted,
                revisionsCount,
                paymentSuccessRate: parseFloat(paymentSuccessRate.toFixed(2)),
                avgInvoiceValue: parseFloat(avgInvoiceValue.toFixed(2)),
                avgClientResponseTimeMs: Math.round(paymentStats.avgResponseTime || 0)
            },
            heatmap,
            meta: {
                cached: false,
                generatedAt: new Date().toISOString()
            }
        };

        // 4. Cache Result (TTL: 15 mins)
        if (redis) {
            await redis.setex(cacheKey, 900, JSON.stringify({ ...responsePayload, meta: { ...responsePayload.meta, cached: true } }));
        }

        console.log('[Analytics] Successfully generated report. Sending response.');
        res.status(200).json(responsePayload);

    } catch (error) {
        console.error('Error fetching analytics overview:', error);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
};
