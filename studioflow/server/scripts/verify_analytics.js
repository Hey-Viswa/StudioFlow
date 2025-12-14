
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Project from '../src/models/Project.js';
import Task from '../src/models/Task.js';
import ProjectInvoice from '../src/models/ProjectInvoice.js';
import AuditLog from '../src/models/AuditLog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const verifyAnalytics = async () => {
    try {
        console.log('🔍 Debugging Environment...');
        const rootDir = 'D:\\School\\StudioFlow';
        console.log(`Checking directory: ${rootDir}`);
        
        if (fs.existsSync(rootDir)) {
            const files = fs.readdirSync(rootDir);
            console.log('Files in root:', files.filter(f => f.startsWith('.'))); // List dotfiles
            
            if (files.includes('.env')) {
                console.log('✅ .env found in root.');
                const envPath = path.join(rootDir, '.env');
                dotenv.config({ path: envPath });
            } else {
                console.log('❌ .env NOT found in root.');
            }
        } else {
            console.log('❌ Root directory does not exist.');
        }

        const uri = process.env.MONGODB_URI;
        console.log('MONGODB_URI:', uri ? 'FOUND' : 'NOT FOUND');

        if (!uri) {
            throw new Error('MONGODB_URI is missing. Cannot continue.');
        }

        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('✅ Connected.');
        
        // Clear Redis Cache
        const Redis = (await import('ioredis')).default;
        const redisUri = process.env.REDIS_URL || 'redis://localhost:6379';
        console.log(`🔌 Connecting to Redis at ${redisUri}...`);
        const redis = new Redis(redisUri);
        
        try {
            const keys = await redis.keys('analytics:overview:*');
            if (keys.length > 0) {
                console.log(`🧹 Found ${keys.length} cached analytics keys. Deleting...`);
                await redis.del(keys);
                console.log('✅ Cache cleared.');
            } else {
                console.log('ℹ️ No cache keys found.');
            }
        } catch (redisErr) {
            console.warn('⚠️ Redis cache clear failed (non-critical):', redisErr.message);
        } finally {
            redis.quit();
        }

        // Pick a user ID
        const project = await Project.findOne();
        if (!project) {
            console.log('⚠️ No projects found. Cannot verify aggregation.');
            process.exit(0);
        }
        const userId = project.ownerId;
        console.log(`👤 Testing with UserId: ${userId}`);

        // Run Aggregations...
        // 1. Projects Completed
        const projectsCompleted = await Project.countDocuments({ ownerId: userId, status: 'completed' });
        console.log(`Metrics: Projects Completed = ${projectsCompleted}`);

        // 2. Revisions Count
        const revisionsCount = await Task.countDocuments({ assignedBy: userId, isRevisionTask: true });
        console.log(`Metrics: Revisions Count = ${revisionsCount}`);

        // 3. Payment Metrics
        const paymentMetrics = await ProjectInvoice.aggregate([
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
        ]);
        console.log('Metrics: Payment Raw:', paymentMetrics);

        // 4. Heatmap
        const heatmap = await AuditLog.aggregate([
            { 
                $match: { 
                    userId: userId, 
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
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
            }
        ]);
        console.log(`Metrics: Heatmap Points = ${heatmap.length}`);

        console.log('✅ Verification script finished successfully.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

verifyAnalytics();
