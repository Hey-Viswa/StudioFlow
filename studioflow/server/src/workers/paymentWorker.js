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
                case 'invoice.payment.process':
                    await handleInvoicePayment(payload);
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

const handleInvoicePayment = async (payload) => {
    const { invoiceId, paymentId, idempotencyKey } = payload;

    // Dynamic imports to ensure we have fresh models
    const ProjectInvoice = (await import('../models/ProjectInvoice.js')).default;
    const PaymentThread = (await import('../models/PaymentThread.js')).default;
    const Entitlement = (await import('../models/Entitlement.js')).default;
    const Project = (await import('../models/Project.js')).default;
    const KpiAggregate = (await import('../models/KpiAggregate.js')).default;
    const mongoose = (await import('mongoose')).default;

    console.log(`Processing invoice payment: ${invoiceId} (Key: ${idempotencyKey})`);

    // 1. Idempotency Check
    const existing = await ProjectInvoice.findOne({ idempotencyKey });
    if (existing && existing.status === 'paid') {
        console.log(`Skipping duplicate webhook for invoice ${invoiceId}`);
        return;
    }

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            // 2. Update Invoice
            const invoice = await ProjectInvoice.findByIdAndUpdate(invoiceId, {
                status: 'paid',
                razorpayPaymentId: paymentId,
                paidAt: new Date(),
                idempotencyKey: idempotencyKey,
                isImmutable: true,
                accessGranted: true
            }, { session, new: true });

            if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);

            // 3. Update Thread
            if (invoice.paymentThreadId) {
                await PaymentThread.findByIdAndUpdate(invoice.paymentThreadId, {
                    status: 'paid',
                    paidAt: new Date(),
                    razorpayPaymentId: paymentId
                }, { session });
            }

            // 4. Create Entitlements
            await Entitlement.create([{
                userId: invoice.payerUserId, // Client
                projectId: invoice.projectId,
                sourceId: invoice._id,
                sourceType: 'invoice',
                scope: invoice.accessType === 'specific_files' ? 'file_download' : 'project_download',
                resourceIds: invoice.linkedFileIds || [],
                validUntil: new Date(Date.now() + (invoice.accessDurationDays * 24 * 60 * 60 * 1000)),
                isActive: true
            }], { session });

            // 5. Update KPI Aggregates (Real-time Metric)
            await updateKpiAggregates(invoice, KpiAggregate, session);

            // 6. Broadcast Real-Time Event (Socket)
            // Note: We'll broadcast *after* transaction commits to ensure data is visible
        });

        // Post-Transaction: Notification & Broadcast

        // Notify Owner (Payee)
        try {
            await createNotificationWithIdempotency({
                projectId: invoice.projectId,
                recipients: [invoice.payeeUserId],
                type: 'invoice-paid',
                title: '💰 Payment Received',
                message: `Payment of ${invoice.currency} ${invoice.total} for Invoice #${invoice.invoiceNumber} has been received.`,
                link: `/dashboard/invoices/${invoiceId}`,
                priority: 'high',
                category: 'payment',
                sendEmail: true,
                eventType: 'invoice.paid', // Unique key for idempotency
                metadata: {
                    invoiceId: invoiceId,
                    amount: invoice.total,
                    currency: invoice.currency,
                    payerId: invoice.payerUserId
                }
            });
        } catch (notifError) {
            console.error('Failed to send payment notification to owner:', notifError);
        }

        // Post-Transaction: Broadcast
        // Fetch fresh invoice to get all fields
        const finalInvoice = await ProjectInvoice.findById(invoiceId);

        // Publish to Redis for Socket.IO
        const redisPubSub = (await import('../config/redis.js')).redisPubSub;
        if (redisPubSub) {
            redisPubSub.publish('kpi:updates', JSON.stringify({
                invoiceId: finalInvoice._id,
                projectId: finalInvoice.projectId,
                ownerId: finalInvoice.payeeUserId,
                clientId: finalInvoice.payerUserId,
                amount: finalInvoice.total,
                currency: finalInvoice.currency,
                timestamp: finalInvoice.paidAt
            }));
        }

        console.log(`✅ Invoice ${invoiceId} processed successfully`);

    } catch (error) {
        console.error('Invoice payment transaction failed:', error);
        throw error;
    } finally {
        session.endSession();
    }
};

// Helper: Upsert KPIs
async function updateKpiAggregates(invoice, KpiModel, session) {
    const startOfPeriod = (date, period) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        if (period === 'month') d.setDate(1);
        if (period === 'year') { d.setMonth(0); d.setDate(1); }
        if (period === 'all_time') return new Date(0);
        return d;
    };

    const periods = ['day', 'month', 'year', 'all_time'];

    for (const period of periods) {
        const periodStart = startOfPeriod(invoice.paidAt, period);

        // Update OWNER (Revenue)
        const ownerId = invoice.payeeUserId || invoice.userId;
        if (ownerId) {
            await KpiModel.findOneAndUpdate(
                {
                    userId: ownerId,
                    role: 'owner',
                    projectId: invoice.projectId,
                    periodType: period,
                    periodStart: periodStart
                },
                {
                    $inc: {
                        revenueIncoming: invoice.total,
                        revenueNet: invoice.total,
                        invoiceCount: 1
                    },
                    $set: { lastUpdatedAt: new Date() }
                },
                { upsert: true, new: true, session }
            );
        }

        // Update CLIENT (Expense)
        const clientId = invoice.payerUserId || (invoice.client && invoice.client.userId);
        if (clientId) {
            await KpiModel.findOneAndUpdate(
                {
                    userId: clientId,
                    role: 'client',
                    projectId: invoice.projectId,
                    periodType: period,
                    periodStart: periodStart
                },
                {
                    $inc: {
                        expenseOutgoing: invoice.total,
                        invoiceCount: 1
                    },
                    $set: { lastUpdatedAt: new Date() }
                },
                { upsert: true, new: true, session }
            );
        }
    }
}

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
