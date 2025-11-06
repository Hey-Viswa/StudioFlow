import User from '../models/User.js';
import Project from '../models/Project.js';

// Check for expired subscriptions and downgrade users
export const checkExpiredSubscriptions = async () => {
    try {
        const now = new Date();
        
        // Find users with active or cancelled subscriptions that have expired
        const expiredUsers = await User.find({
            'subscription.status': { $in: ['active', 'cancelled'] },
            'subscription.subscriptionEndDate': { $lte: now, $ne: null },
            'subscription.plan': { $in: ['pro', 'studio'] }
        });

        console.log(`Found ${expiredUsers.length} expired subscriptions to process`);

        for (const user of expiredUsers) {
            try {
                // Double-check the subscription is actually expired
                if (user.subscription.subscriptionEndDate && user.subscription.subscriptionEndDate <= now) {
                    await downgradeUserToFree(user._id);
                    console.log(`✓ Downgraded user ${user.email} to free plan`);
                } else {
                    console.log(`⚠️  Skipped user ${user.email} - end date in future or null`);
                }
            } catch (error) {
                console.error(`✗ Failed to downgrade user ${user.email}:`, error);
            }
        }

        if (expiredUsers.length > 0) {
            console.log(`Subscription check complete. Processed ${expiredUsers.length} users.`);
        }
    } catch (error) {
        console.error('Error checking expired subscriptions:', error);
    }
};

// Downgrade user to free plan
const downgradeUserToFree = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

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

        console.log(`  → Archived ${projectsToArchive.length} projects for user ${userId}`);
    }

    // Update user subscription to free plan
    user.subscription.plan = 'free';
    user.subscription.status = 'expired';
    user.subscription.razorpayOrderId = null;
    user.subscription.razorpayPaymentId = null;
    user.subscription.razorpaySubscriptionId = null;
    user.subscription.subscriptionStartDate = null;
    user.subscription.subscriptionEndDate = null;
    user.subscription.autoRenew = false;

    await user.save();

    return {
        success: true,
        archivedProjectsCount: activeProjects.length > FREE_PLAN_LIMIT ? activeProjects.length - FREE_PLAN_LIMIT : 0,
    };
};

// Start the subscription checker (runs every hour)
export const startSubscriptionChecker = () => {
    // Run immediately on startup
    checkExpiredSubscriptions();

    // Then run every hour
    const HOUR = 60 * 60 * 1000;
    setInterval(checkExpiredSubscriptions, HOUR);

    console.log('📅 Subscription checker started (runs every hour)');
};
