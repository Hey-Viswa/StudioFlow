import { paymentQueue } from '../queues/paymentQueue.js';
import User from '../models/User.js';
import { createNotificationWithIdempotency } from '../services/notificationServiceV2.js';

// Import models dynamically to avoid circular dependencies if any
// (Though typically models don't have circular deps with workers)

// This function will be called to start processing jobs
export const startPaymentWorker = () => {
    if (process.env.ENABLE_REDIS_QUEUE !== 'true') {
        console.log('ℹ️ Payment Worker skipped (Direct Mode active)');
        return;
    }

    console.log('👷 Payment Worker starting...');

    // Process with concurrency (e.g., 5 jobs at a time)
    paymentQueue.process(5, async (job) => {
        const { event, payload } = job.data;

        console.log(`💳 Processing ${event} (Job ID: ${job.id})`);

        try {
            switch (event) {
                case 'subscription.charged':
                    await handleSubscriptionCharged(payload);
                    break;
                case 'subscription.cancelled':
                case 'subscription.expired':
                    await handleSubscriptionCancelled(payload);
                    break;
                case 'subscription.paused':
                    await handleSubscriptionPaused(payload);
                    break;
                case 'subscription.resumed':
                    await handleSubscriptionResumed(payload);
                    break;
                case 'payment.failed':
                    await handlePaymentFailed(payload);
                    break;
                default:
                    console.log(`⚠️ Unhandled payment event in worker: ${event}`);
            }
        } catch (error) {
            console.error(`Error processing payment job ${job.id}:`, error);
            throw error;
        }
    });

    console.log('👷 Payment Worker started with concurrency: 5');
};

// --- Handler Functions (Moved from Controller) ---

// Handle successful subscription charge
const handleSubscriptionCharged = async (payload) => {
    const subscriptionId = payload.subscription.entity.id;
    const notes = payload.subscription.entity.notes || {};
    const userId = notes.userId;

    if (!userId) {
        console.error('No userId found in subscription notes');
        return;
    }

    const user = await User.findById(userId);
    if (!user) {
        console.error(`User ${userId} not found`);
        return;
    }

    // Extend subscription by 30 days
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    user.subscription.status = 'active';
    user.subscription.razorpaySubscriptionId = subscriptionId;
    user.subscription.subscriptionEndDate = endDate;
    user.subscription.autoRenew = true;

    await user.save();

    console.log(`✅ Subscription renewed for user ${userId}`);

    // Send notification
    try {
        await createNotificationWithIdempotency({
            recipients: [userId],
            type: 'payment-success',
            eventType: 'payment.success',
            actorId: 'system',
            title: '✅ Payment Successful',
            message: 'Your subscription has been successfully renewed.',
            link: '/dashboard/settings/billing',
            priority: 'high',
            category: 'system',
            metadata: {
                subscriptionId
            }
        });
    } catch (err) {
        console.error('Failed to send payment success notification:', err);
    }
};

// Handle subscription cancellation
const handleSubscriptionCancelled = async (payload) => {
    const subscriptionId = payload.subscription.entity.id;

    // Find user by subscription ID
    const user = await User.findOne({
        'subscription.razorpaySubscriptionId': subscriptionId
    });

    if (!user) {
        console.error(`User not found for subscription ${subscriptionId}`);
        return;
    }

    console.log(`Processing cancellation for user ${user._id}`);

    // Import downgrade logic dynamically or duplicate it?
    // Ideally, we should move `downgradeToFreePlan` to a service.
    // For now, I'll import it from the controller if exported, or duplicate/move it.
    // Let's assume we need to move it to a service later, but for now, I'll implement a basic version here
    // or better, let's move the logic to a shared service in a future refactor.
    // For this task, I will replicate the core logic to keep it self-contained in the worker
    // OR import it if I export it from the controller.
    // Checking paymentController.js... it is NOT exported.
    // I will implement the logic here directly to avoid modifying the controller too much just for exports.

    // Downgrade logic
    const Project = (await import('../models/Project.js')).default;

    // Get all active projects owned by user
    const activeProjects = await Project.find({
        ownerId: user._id.toString(),
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
        console.log(`Archived ${projectsToArchive.length} projects for user ${user._id}`);
    }

    // Downgrade user to free plan
    user.subscription.plan = 'free';
    user.subscription.status = 'expired';
    user.subscription.razorpayOrderId = null;
    user.subscription.razorpayPaymentId = null;
    user.subscription.razorpaySubscriptionId = null;
    user.subscription.subscriptionStartDate = null;
    user.subscription.subscriptionEndDate = null;
    user.subscription.autoRenew = false;

    await user.save();

    console.log(`✅ User ${user._id} downgraded after subscription cancellation`);
};

// Handle subscription paused
const handleSubscriptionPaused = async (payload) => {
    const subscriptionId = payload.subscription.entity.id;

    const user = await User.findOne({
        'subscription.razorpaySubscriptionId': subscriptionId
    });

    if (user) {
        user.subscription.status = 'paused';
        await user.save();
        console.log(`Subscription paused for user ${user._id}`);
    }
};

// Handle subscription resumed
const handleSubscriptionResumed = async (payload) => {
    const subscriptionId = payload.subscription.entity.id;

    const user = await User.findOne({
        'subscription.razorpaySubscriptionId': subscriptionId
    });

    if (user) {
        user.subscription.status = 'active';
        user.subscription.autoRenew = true;
        await user.save();
        console.log(`Subscription resumed for user ${user._id}`);
    }
};

// Handle payment failed
const handlePaymentFailed = async (payload) => {
    const paymentId = payload.payment.entity.id;
    const notes = payload.payment.entity.notes || {};
    const userId = notes.userId;

    if (userId) {
        const user = await User.findById(userId);
        if (user) {
            user.subscription.status = 'payment_failed';
            await user.save();
            console.log(`Payment failed for user ${userId}`);

            // Send notification
            try {
                await createNotificationWithIdempotency({
                    recipients: [userId],
                    type: 'payment-failed',
                    eventType: 'payment.failed',
                    actorId: 'system',
                    title: '❌ Payment Failed',
                    message: 'Your subscription payment failed. Please update your payment method.',
                    link: '/dashboard/settings/billing',
                    priority: 'high',
                    category: 'system',
                    metadata: {
                        paymentId
                    }
                });
            } catch (err) {
                console.error('Failed to send payment failed notification:', err);
            }
        }
    }
};
