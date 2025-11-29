import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../models/User.js';
import ProcessedWebhook from '../models/ProcessedWebhook.js';
import { paymentQueue } from '../queues/paymentQueue.js';

// Initialize Razorpay instance only if keys are configured
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'your-razorpay-key-id') {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
} else {
    console.warn('⚠️  Razorpay keys not configured. Payment features will be disabled.');
}

// Plan prices in INR (paise - 1 INR = 100 paise)
const PLAN_PRICES = {
    pro: 1000, // ₹10/month
    studio: 2500, // ₹25/month
};

// Create Razorpay order
export const createOrder = async (req, res) => {
    try {
        const { plan } = req.body;
        const userId = req.user?.id || req.user?._id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        if (!plan || !PLAN_PRICES[plan]) {
            return res.status(400).json({
                success: false,
                message: 'Invalid plan selected'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Create Razorpay order
        const options = {
            amount: PLAN_PRICES[plan] * 100, // Convert to paise
            currency: 'INR',
            receipt: `order_${userId}_${Date.now()}`,
            notes: {
                userId: userId.toString(),
                plan,
                email: user.email,
            },
        };

        const order = await razorpay.orders.create(options);

        // Update user's subscription status
        user.subscription.razorpayOrderId = order.id;
        user.subscription.plan = plan;
        user.subscription.status = 'created';
        await user.save();

        res.json({
            success: true,
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
            },
            key: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error.message
        });
    }
};

// Verify payment
export const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        const userId = req.user?.id || req.user?._id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        // Verify signature
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }

        // Update user subscription
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Activate subscription for 30 days
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        user.subscription.status = 'active';
        user.subscription.razorpayPaymentId = razorpay_payment_id;
        user.subscription.subscriptionStartDate = startDate;
        user.subscription.subscriptionEndDate = endDate;
        await user.save();

        res.json({
            success: true,
            message: 'Payment verified successfully',
            subscription: {
                plan: user.subscription.plan,
                status: user.subscription.status,
                validUntil: endDate,
            },
        });
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed',
            error: error.message
        });
    }
};

// Get subscription status
export const getSubscriptionStatus = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if subscription is expired
        if (user.subscription.status === 'active' && user.subscription.subscriptionEndDate) {
            if (new Date() > new Date(user.subscription.subscriptionEndDate)) {
                user.subscription.status = 'expired';
                await user.save();
            }
        }

        res.json({
            success: true,
            subscription: {
                plan: user.subscription.plan,
                status: user.subscription.status,
                startDate: user.subscription.subscriptionStartDate,
                endDate: user.subscription.subscriptionEndDate,
            },
        });
    } catch (error) {
        console.error('Get subscription status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get subscription status',
            error: error.message
        });
    }
};

// Cancel subscription
export const cancelSubscription = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Mark subscription as cancelled but keep active until end date
        user.subscription.status = 'cancelled';
        user.subscription.autoRenew = false;

        await user.save();

        res.json({
            success: true,
            message: 'Subscription cancelled successfully. You will retain access until the end of your billing period.',
            subscription: {
                plan: user.subscription.plan,
                status: user.subscription.status,
                validUntil: user.subscription.subscriptionEndDate,
            }
        });
    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel subscription',
            error: error.message
        });
    }
};

// Downgrade user to free plan after cancellation
const downgradeToFreePlan = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            console.error(`User ${userId} not found for downgrade`);
            return;
        }

        // Import Project model dynamically to avoid circular dependency
        const Project = (await import('../models/Project.js')).default;

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

            console.log(`Archived ${projectsToArchive.length} projects for user ${userId}`);
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

        console.log(`User ${userId} downgraded to free plan successfully`);

        return {
            success: true,
            archivedProjectsCount: activeProjects.length > FREE_PLAN_LIMIT ? activeProjects.length - FREE_PLAN_LIMIT : 0,
        };
    } catch (error) {
        console.error(`Error downgrading user ${userId}:`, error);
        throw error;
    }
};

// Razorpay Webhook Handler
export const handleRazorpayWebhook = async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const webhookSignature = req.headers['x-razorpay-signature'];
        const eventId = req.headers['x-razorpay-event-id'];

        if (!webhookSecret) {
            console.warn('⚠️  Razorpay webhook secret not configured');
            return res.status(200).json({ status: 'ok' });
        }

        // Idempotency check
        if (eventId) {
            const processed = await ProcessedWebhook.findOne({ eventId });
            if (processed) {
                console.log(`ℹ️  Event ${eventId} already processed, skipping.`);
                return res.status(200).json({ status: 'ok', message: 'Already processed' });
            }
        }

        // Verify webhook signature
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(JSON.stringify(req.body))
            .digest('hex');

        if (webhookSignature !== expectedSignature) {
            console.error('Invalid webhook signature');
            return res.status(400).json({ error: 'Invalid signature' });
        }

        const event = req.body.event;
        const payload = req.body.payload;

        console.log(`Razorpay Webhook Event: ${event}`);

        // Add to queue for async processing
        if (process.env.ENABLE_REDIS_QUEUE === 'true') {
            await paymentQueue.add({
                event,
                payload
            }, {
                attempts: 5,
                backoff: {
                    type: 'exponential',
                    delay: 5000
                },
                removeOnComplete: true
            });
            console.log(`✅ Added ${event} to payment queue`);
        } else {
            console.log('⚠️ Redis Queue disabled, processing inline (fallback)');
            // Fallback to inline processing if queue is disabled
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
                    console.log(`Unhandled webhook event: ${event}`);
            }
        }

        // Mark as processed
        if (eventId) {
            try {
                await ProcessedWebhook.create({
                    eventId,
                    eventType: event
                });
            } catch (err) {
                console.warn('Failed to save webhook event ID:', err.message);
            }
        }

        res.status(200).json({ status: 'ok' });
    } catch (error) {
        console.error('Webhook handler error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};

// --- Helper Functions (Keep for inline fallback) ---

// Handle successful subscription charge
const handleSubscriptionCharged = async (payload) => {
    try {
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

        console.log(`Subscription renewed for user ${userId}`);
    } catch (error) {
        console.error('Error handling subscription charged:', error);
    }
};

// Handle subscription cancellation
const handleSubscriptionCancelled = async (payload) => {
    try {
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

        // Downgrade user to free plan
        await downgradeToFreePlan(user._id);

        console.log(`User ${user._id} downgraded after subscription cancellation`);
    } catch (error) {
        console.error('Error handling subscription cancelled:', error);
    }
};

// Handle subscription paused
const handleSubscriptionPaused = async (payload) => {
    try {
        const subscriptionId = payload.subscription.entity.id;

        const user = await User.findOne({
            'subscription.razorpaySubscriptionId': subscriptionId
        });

        if (user) {
            user.subscription.status = 'paused';
            await user.save();
            console.log(`Subscription paused for user ${user._id}`);
        }
    } catch (error) {
        console.error('Error handling subscription paused:', error);
    }
};

// Handle subscription resumed
const handleSubscriptionResumed = async (payload) => {
    try {
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
    } catch (error) {
        console.error('Error handling subscription resumed:', error);
    }
};

// Handle payment failed
const handlePaymentFailed = async (payload) => {
    try {
        const paymentId = payload.payment.entity.id;
        const notes = payload.payment.entity.notes || {};
        const userId = notes.userId;

        if (userId) {
            const user = await User.findById(userId);
            if (user) {
                user.subscription.status = 'payment_failed';
                await user.save();
                console.log(`Payment failed for user ${userId}`);
                // TODO: Send email notification to user
            }
        }
    } catch (error) {
        console.error('Error handling payment failed:', error);
    }
};
