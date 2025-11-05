import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../models/User.js';
import { createClerkClient } from '@clerk/backend';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Starter',
    price: 0,
    currency: 'INR',
    features: {
      maxProjects: 5,
      basicInvoicing: true,
      emailSupport: true,
      brandedInvoices: false,
      clientCollaboration: false,
      prioritySupport: false
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 799, // ₹799/month
    currency: 'INR',
    razorpayPlanId: process.env.RAZORPAY_PRO_PLAN_ID,
    features: {
      maxProjects: -1, // Unlimited
      basicInvoicing: true,
      emailSupport: true,
      brandedInvoices: true,
      clientCollaboration: true,
      prioritySupport: true,
      unlimitedProjects: true
    }
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    price: 1999, // ₹1999/month
    currency: 'INR',
    razorpayPlanId: process.env.RAZORPAY_STUDIO_PLAN_ID,
    features: {
      maxProjects: -1, // Unlimited
      basicInvoicing: true,
      emailSupport: true,
      brandedInvoices: true,
      clientCollaboration: true,
      prioritySupport: true,
      unlimitedProjects: true,
      teamPermissions: true,
      advancedReviews: true,
      dedicatedSupport: true
    }
  }
};

// @desc    Get current user's subscription
// @route   GET /api/subscriptions/current
// @access  Protected
export const getCurrentSubscription = async (req, res) => {
  try {
    const userId = req.userId;

    // Get or create user
    let user = await User.findOne({ clerkUserId: userId });
    
    if (!user) {
      // Create user if doesn't exist
      user = await User.create({
        clerkUserId: userId,
        name: req.userName || '',
        email: req.userEmail || '',
        subscription: {
          plan: 'starter',
          status: 'active'
        }
      });
    }

    const currentPlan = SUBSCRIPTION_PLANS[user.subscription.plan] || SUBSCRIPTION_PLANS.starter || SUBSCRIPTION_PLANS.free;

    res.json({
      subscription: user.subscription,
      plan: currentPlan,
      features: currentPlan.features
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
};

// @desc    Create Razorpay subscription
// @route   POST /api/subscriptions/create
// @access  Protected
export const createSubscription = async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.userId;

    if (!['pro', 'studio'].includes(planId)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const plan = SUBSCRIPTION_PLANS[planId];
    
    if (!plan.razorpayPlanId) {
      return res.status(400).json({ error: 'Razorpay plan not configured' });
    }

    // Get or create user
    let user = await User.findOne({ clerkUserId: userId });
    
    if (!user) {
      user = await User.create({
        clerkUserId: userId,
        name: req.userName || '',
        email: req.userEmail || '',
        subscription: {
          plan: 'starter',
          status: 'active'
        }
      });
    }

    // Create Razorpay customer if doesn't exist
    let customerId = user.subscription.razorpayCustomerId;
    
    if (!customerId) {
      const customer = await razorpay.customers.create({
        name: req.userName || '',
        email: req.userEmail,
        fail_existing: 0
      });
      customerId = customer.id;
      
      user.subscription.razorpayCustomerId = customerId;
      await user.save();
    }

    // Create Razorpay subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: plan.razorpayPlanId,
      customer_id: customerId,
      quantity: 1,
      total_count: 12, // 12 months
      customer_notify: 1,
      notes: {
        userId: userId,
        email: req.userEmail,
        plan: planId
      }
    });

    // Update user subscription
    user.subscription.razorpaySubscriptionId = subscription.id;
    user.subscription.status = 'created';
    await user.save();

    res.json({
      subscriptionId: subscription.id,
      planId: planId,
      amount: plan.price * 100, // Convert to paise
      currency: plan.currency
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
};

// @desc    Verify Razorpay payment
// @route   POST /api/subscriptions/verify
// @access  Protected
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature
    } = req.body;

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Find user by subscription ID
    const user = await User.findOne({
      'subscription.razorpaySubscriptionId': razorpay_subscription_id
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get subscription details from Razorpay
    const subscription = await razorpay.subscriptions.fetch(razorpay_subscription_id);
    
    // Determine plan from subscription notes
    const planId = subscription.notes?.plan || 'pro';

    // Update user subscription
    user.subscription.plan = planId;
    user.subscription.status = 'active';
    user.subscription.razorpayPaymentId = razorpay_payment_id;
    user.subscription.subscriptionStartDate = new Date(subscription.start_at * 1000);
    user.subscription.subscriptionEndDate = new Date(subscription.end_at * 1000);
    
    await user.save();

    res.json({
      message: 'Payment verified successfully',
      subscription: user.subscription
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
};

// @desc    Cancel subscription
// @route   POST /api/subscriptions/cancel
// @access  Protected
export const cancelSubscription = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findOne({ clerkUserId: userId });
    
    if (!user || !user.subscription.razorpaySubscriptionId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Cancel Razorpay subscription
    await razorpay.subscriptions.cancel(user.subscription.razorpaySubscriptionId);

    // Update user subscription
    user.subscription.status = 'cancelled';
    await user.save();

    res.json({
      message: 'Subscription cancelled successfully',
      subscription: user.subscription
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

// @desc    Handle Razorpay webhooks
// @route   POST /api/subscriptions/webhook
// @access  Public (but verified)
export const handleWebhook = async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log('📨 Webhook received:', event);

    switch (event) {
      case 'subscription.activated':
        await handleSubscriptionActivated(payload.subscription.entity);
        break;
      
      case 'subscription.charged':
        await handleSubscriptionCharged(payload.subscription.entity, payload.payment.entity);
        break;
      
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(payload.subscription.entity);
        break;
      
      case 'subscription.completed':
        await handleSubscriptionCompleted(payload.subscription.entity);
        break;

      case 'subscription.paused':
      case 'subscription.halted':
        await handleSubscriptionPaused(payload.subscription.entity);
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// Helper functions for webhook events
async function handleSubscriptionActivated(subscription) {
  const user = await User.findOne({
    'subscription.razorpaySubscriptionId': subscription.id
  });

  if (user) {
    user.subscription.status = 'active';
    user.subscription.plan = subscription.notes?.plan || 'pro';
    user.subscription.subscriptionStartDate = new Date(subscription.start_at * 1000);
    user.subscription.subscriptionEndDate = new Date(subscription.end_at * 1000);
    await user.save();
    console.log('✅ Subscription activated for:', user.email);
  }
}

async function handleSubscriptionCharged(subscription, payment) {
  const user = await User.findOne({
    'subscription.razorpaySubscriptionId': subscription.id
  });

  if (user) {
    user.subscription.razorpayPaymentId = payment.id;
    user.subscription.status = 'active';
    await user.save();
    console.log('💳 Payment successful for:', user.email);
  }
}

async function handleSubscriptionCancelled(subscription) {
  const user = await User.findOne({
    'subscription.razorpaySubscriptionId': subscription.id
  });

  if (user) {
    user.subscription.status = 'cancelled';
    // Downgrade to free plan after current period ends
    user.subscription.plan = 'free';
    await user.save();
    console.log('❌ Subscription cancelled for:', user.email);
  }
}

async function handleSubscriptionCompleted(subscription) {
  const user = await User.findOne({
    'subscription.razorpaySubscriptionId': subscription.id
  });

  if (user) {
    user.subscription.status = 'expired';
    user.subscription.plan = 'free';
    await user.save();
    console.log('⏰ Subscription expired for:', user.email);
  }
}

async function handleSubscriptionPaused(subscription) {
  const user = await User.findOne({
    'subscription.razorpaySubscriptionId': subscription.id
  });

  if (user) {
    user.subscription.status = 'inactive';
    await user.save();
    console.log('⏸️ Subscription paused for:', user.email);
  }
}

// Export plans for use in other controllers
export { SUBSCRIPTION_PLANS };
