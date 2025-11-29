import cron from 'node-cron';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Razorpay from 'razorpay';

// Initialize Razorpay
let razorpay = null;
try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }
} catch (error) {
  console.error('✗ Razorpay initialization failed in subscription checker:', error);
}

// Format date for logging
const formatDate = (date) => {
  return date ? new Date(date).toISOString().split('T')[0] : 'N/A';
};

// Log with timestamp
const log = (message, data = null) => {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] ${message}`, data);
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
};

// Check for expired subscriptions and downgrade users
export const checkExpiredSubscriptions = async () => {
    try {
        const now = new Date();
        log('🔍 Starting subscription expiration check...');
        
        // Find users with active or cancelled subscriptions that have expired
        const expiredUsers = await User.find({
            'subscription.status': { $in: ['active', 'cancelled'] },
            'subscription.subscriptionEndDate': { $lte: now, $ne: null },
            'subscription.plan': { $in: ['pro', 'studio'] }
        });

        log(`Found ${expiredUsers.length} expired subscription(s) to process`);

        let successCount = 0;
        let failCount = 0;

        for (const user of expiredUsers) {
            try {
                // Double-check the subscription is actually expired
                if (user.subscription.subscriptionEndDate && user.subscription.subscriptionEndDate <= now) {
                    const userEmail = user.email || user.clerkUserId;
                    log(`📋 Processing expired subscription for: ${userEmail}`, {
                        plan: user.subscription.plan,
                        status: user.subscription.status,
                        endDate: formatDate(user.subscription.subscriptionEndDate)
                    });
                    
                    await downgradeUserToFree(user._id);
                    successCount++;
                    log(`✓ Successfully downgraded ${userEmail} to free plan`);
                } else {
                    log(`⚠️  Skipped user ${user.email} - end date in future or null`);
                }
            } catch (error) {
                failCount++;
                console.error(`✗ Failed to downgrade user ${user.email}:`, error.message);
            }
        }

        if (expiredUsers.length > 0) {
            log(`✅ Subscription check complete. Success: ${successCount}, Failed: ${failCount}`);
        } else {
            log('✅ No expired subscriptions found');
        }
    } catch (error) {
        console.error('❌ Error checking expired subscriptions:', error);
    }
};

// Verify subscription status with Razorpay
export const verifySubscriptionStatus = async () => {
    try {
        if (!razorpay) {
            log('⚠️  Razorpay not configured, skipping verification');
            return;
        }

        log('🔄 Starting subscription status verification with Razorpay...');
        
        // Find all users with active paid subscriptions
        const activeUsers = await User.find({
            'subscription.plan': { $in: ['pro', 'studio'] },
            'subscription.status': { $in: ['active', 'pending', 'created'] },
            'subscription.razorpaySubscriptionId': { $ne: null }
        });

        log(`Found ${activeUsers.length} active paid subscription(s) to verify`);

        let verifiedCount = 0;
        let mismatchCount = 0;

        for (const user of activeUsers) {
            try {
                const userEmail = user.email || user.clerkUserId;
                const subscription = await razorpay.subscriptions.fetch(
                    user.subscription.razorpaySubscriptionId
                );

                const razorpayStatus = subscription.status; // active, created, authenticated, cancelled, completed, expired, paused, halted
                const dbStatus = user.subscription.status;

                log(`🔍 Verifying ${userEmail}`, {
                    dbStatus,
                    razorpayStatus,
                    plan: user.subscription.plan
                });

                // Map Razorpay status to our status
                const statusMap = {
                    'active': 'active',
                    'created': 'created',
                    'authenticated': 'pending',
                    'cancelled': 'cancelled',
                    'completed': 'expired',
                    'expired': 'expired',
                    'paused': 'paused',
                    'halted': 'inactive'
                };

                const expectedStatus = statusMap[razorpayStatus] || dbStatus;

                // Check if status needs updating
                if (dbStatus !== expectedStatus) {
                    log(`⚠️  Status mismatch for ${userEmail}: DB=${dbStatus}, Razorpay=${razorpayStatus}`);
                    
                    // FIX: Do not automatically update status on startup/deploy to prevent accidental revocations.
                    // Subscriptions should only change via webhooks or user actions.
                    // user.subscription.status = expectedStatus;
                    // user.subscription.lastStatusChange = new Date();
                    
                    // Update dates if available
                    if (subscription.current_end) {
                        user.subscription.nextBillingDate = new Date(subscription.current_end * 1000);
                    }
                    if (subscription.ended_at) {
                        user.subscription.subscriptionEndDate = new Date(subscription.ended_at * 1000);
                    }
                    
                    await user.save();
                    mismatchCount++;
                    log(`✓ Updated dates for ${userEmail} (Status update skipped for safety)`);
                } else {
                    verifiedCount++;
                }
            } catch (error) {
                console.error(`✗ Failed to verify subscription for ${user.email}:`, error.message);
            }
        }

        log(`✅ Verification complete. Verified: ${verifiedCount}, Updated: ${mismatchCount}`);
    } catch (error) {
        console.error('❌ Error verifying subscriptions:', error);
    }
};

// Downgrade user to free plan
const downgradeUserToFree = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    const userEmail = user.email || user.clerkUserId;

    // Get all active projects owned by user
    const activeProjects = await Project.find({ 
        ownerId: userId.toString(), 
        status: { $ne: 'archived' } 
    }).sort({ createdAt: -1 });

    // Free plan allows 5 projects - archive extras
    const FREE_PLAN_LIMIT = 5;
    if (activeProjects.length > FREE_PLAN_LIMIT) {
        const projectsToArchive = activeProjects.slice(FREE_PLAN_LIMIT);
        
        for (const project of projectsToArchive) {
            project.status = 'archived';
            await project.save();
        }

        log(`  → Archived ${projectsToArchive.length} project(s) for ${userEmail}`);
    }

    // Update user subscription to free plan
    const previousPlan = user.subscription.plan;
    const previousStatus = user.subscription.status;
    
    user.subscription.plan = 'free';
    user.subscription.status = 'expired';
    user.subscription.lastStatusChange = new Date();
    user.subscription.razorpayOrderId = null;
    user.subscription.razorpayPaymentId = null;
    user.subscription.razorpaySubscriptionId = null;
    user.subscription.subscriptionStartDate = null;
    user.subscription.subscriptionEndDate = null;
    user.subscription.nextBillingDate = null;
    user.subscription.autoRenew = false;

    await user.save();

    log(`  → Downgraded ${userEmail} from ${previousPlan} (${previousStatus}) to free plan`);

    return {
        success: true,
        archivedProjectsCount: activeProjects.length > FREE_PLAN_LIMIT ? activeProjects.length - FREE_PLAN_LIMIT : 0,
    };
};

// Start the subscription checker with cron jobs
export const startSubscriptionChecker = () => {
    log('📅 Initializing subscription checker with cron jobs...');

    // Run immediately on startup
    checkExpiredSubscriptions();

    // Schedule daily expiration check at 00:00 (midnight)
    cron.schedule('0 0 * * *', () => {
        log('⏰ Running scheduled subscription expiration check (daily at midnight)');
        checkExpiredSubscriptions();
    });

    // Schedule status verification every 6 hours
    cron.schedule('0 */6 * * *', () => {
        log('⏰ Running scheduled subscription verification (every 6 hours)');
        verifySubscriptionStatus();
    });

    // Also run every hour as a backup (keeps existing behavior)
    const HOUR = 60 * 60 * 1000;
    setInterval(() => {
        checkExpiredSubscriptions();
    }, HOUR);

    log('✅ Subscription checker started:');
    log('   - Expiration check: Daily at midnight + hourly backup');
    log('   - Status verification: Every 6 hours');
};
