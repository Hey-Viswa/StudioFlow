
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import ProjectInvoice from '../models/ProjectInvoice.js';
import AuditLog from '../models/AuditLog.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';
import { getRedisClient } from '../config/redis.js';

export const getOverview = async (req, res) => {
    try {
        const userId = req.userId;
        const { range = 'week' } = req.query; // 'day', 'week', 'month'
        console.log(`[Analytics] Request for overview. UserId: ${userId}, Range: ${range}`);

        if (!userId) {
            console.error('[Analytics] Error: userId is missing from request object.');
            return res.status(401).json({ error: 'User ID missing' });
        }

        // 1. Feature Flag Check
        const isEnabled = await isFeatureEnabled('ANALYTICS_DASHBOARD');
        if (!isEnabled) {
            return res.status(403).json({ error: 'Analytics dashboard is currently disabled.' });
        }

        // Determine Date Range
        const now = new Date();
        let startDate = new Date();
        if (range === 'day') startDate.setHours(0, 0, 0, 0); // Today
        else if (range === 'month') startDate.setDate(now.getDate() - 30);
        else startDate.setDate(now.getDate() - 7); // Default 'week'

        // 2. Cache Check
        const redis = getRedisClient();
        const cacheKey = `analytics:overview:${userId}:${range}`;

        if (redis) {
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
               return res.status(200).json(JSON.parse(cachedData));
            }
        }

        console.log(`[Analytics] Fetching data from ${startDate.toISOString()}...`);

        // 3. Aggregations (Executed in parallel)
        const [
            projectsCompleted,
            revisionsCount,
            paymentMetrics,
            heatmap,
            timeline
        ] = await Promise.all([
            // Metric 1: Projects Completed
            Project.countDocuments({ 
                ownerId: userId, 
                status: 'completed',
                updatedAt: { $gte: startDate } 
            }),

            // Metric 2: Revisions Count
            Task.countDocuments({ 
                assignedBy: userId, 
                isRevisionTask: true,
                createdAt: { $gte: startDate }
            }),

            // Metric 3, 4, 5: Payment Metrics
            ProjectInvoice.aggregate([
                { $match: { 
                    userId: userId, 
                    status: { $in: ['paid', 'overdue', 'failed'] },
                    updatedAt: { $gte: startDate }
                }},
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

            // Metric 6: Activity Heatmap (Day of Week x Hour)
            // This stays as "Weekly Pattern" even for Month view, to populate the Grid
            AuditLog.aggregate([
                { 
                    $match: { 
                        userId: userId, 
                        createdAt: { $gte: startDate } 
                    } 
                },
                { 
                    $project: { 
                        dayOfWeek: { $dayOfWeek: '$createdAt' }, 
                        hour: { $hour: '$createdAt' }
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
            ]),

            // Metric 7: Timeline (Time Series for Line Graph)
            AuditLog.aggregate([
                {
                    $match: {
                        userId: userId,
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: range === 'day' 
                            ? { hour: { $hour: '$createdAt' } } // Group by Hour for Day view
                            : { 
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' },
                                day: { $dayOfMonth: '$createdAt' } // Group by Date for Week/Month view
                              },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
            ])
        ]);

        // Process Timeline Data for Frontend
        const processedTimeline = timeline.map(t => {
            if (range === 'day') {
                return { label: `${t._id.hour}:00`, count: t.count, sortKey: t._id.hour };
            } else {
                const dateStr = `${t._id.year}-${String(t._id.month).padStart(2, '0')}-${String(t._id.day).padStart(2, '0')}`;
                return { label: dateStr, count: t.count, sortKey: dateStr };
            }
        });

        // Fill in missing gaps for Timeline (Optional but good for UI)
        // ... (Skipping complex gap filling for brevity, Frontend can handle gaps or distinct points)

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
            timeline: processedTimeline,
            meta: {
                cached: false,
                range,
                generatedAt: new Date().toISOString()
            }
        };

        // 4. Cache Result (TTL: 5 mins for filtered)
        if (redis) {
            await redis.setex(cacheKey, 300, JSON.stringify({ ...responsePayload, meta: { ...responsePayload.meta, cached: true } }));
        }

        console.log('[Analytics] Successfully generated report. Sending response.');
        res.status(200).json(responsePayload);

    } catch (error) {
        console.error('Error fetching analytics overview:', error);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
};
