import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../models/User.js';
import { createClerkClient } from '@clerk/backend';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});

// Initialize Razorpay
let razorpay = null;

try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('✓ Razorpay initialized successfully');
  } else {
    console.warn('⚠️  Razorpay credentials not configured');
  }
} catch (error) {
  console.error('✗ Razorpay initialization failed:', error);
}

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Starter',
    price: 0,
    currency: 'INR',
    features: {
      maxProjects: 5,
      maxMembers: 1,
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
    price: 100, // ₹100/month
    currency: 'INR',
    razorpayPlanId: process.env.RAZORPAY_PRO_PLAN_ID || 'plan_RcTPS7sz19ku5N',
    features: {
      maxProjects: 50,
      maxMembers: 5,
      basicInvoicing: true,
      emailSupport: true,
      brandedInvoices: true,
      clientCollaboration: true,
      prioritySupport: true,
      realTimeUpdates: true,
      advancedAnalytics: true
    }
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    price: 499, // ₹499/month
    currency: 'INR',
    razorpayPlanId: process.env.RAZORPAY_STUDIO_PLAN_ID || 'plan_RcTPuLbBYG9E8N',
    features: {
      maxProjects: 100,
      maxMembers: -1, // Unlimited
      basicInvoicing: true,
      emailSupport: true,
      brandedInvoices: true,
      clientCollaboration: true,
      prioritySupport: true,
      realTimeUpdates: true,
      advancedAnalytics: true,
      teamPermissions: true,
      customWorkflows: true,
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
          plan: 'free',
          status: 'active'
        }
      });
    }

    const currentPlan = SUBSCRIPTION_PLANS[user.subscription.plan] || SUBSCRIPTION_PLANS.free;

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

    console.log('=== CREATE SUBSCRIPTION REQUEST ===');
    console.log('User ID:', userId);
    console.log('Plan ID:', planId);
    console.log('User Name:', req.userName);
    console.log('User Email:', req.userEmail);

    // Check Razorpay initialization
    if (!razorpay) {
      console.error('❌ Razorpay not initialized');
      return res.status(500).json({ 
        error: 'Payment gateway not configured. Please contact support.' 
      });
    }

    // Validate plan
    if (!['pro', 'studio'].includes(planId)) {
      console.error('❌ Invalid plan:', planId);
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const plan = SUBSCRIPTION_PLANS[planId];
    
    if (!plan.razorpayPlanId) {
      console.error('❌ Razorpay plan ID not configured for:', planId);
      return res.status(400).json({ error: 'Plan configuration error' });
    }

    console.log('✓ Using Razorpay Plan ID:', plan.razorpayPlanId);

    // Get or create user
    let user = await User.findOne({ clerkUserId: userId });
    
    if (!user) {
      console.log('✓ Creating new user:', userId);
      try {
        user = await User.create({
          clerkUserId: userId,
          name: req.userName || '',
          email: req.userEmail || '',
          subscription: {
            plan: 'free',
            status: 'active'
          }
        });
        console.log('✓ User created successfully');
      } catch (userError) {
        console.error('❌ Failed to create user:', userError);
        return res.status(500).json({ error: 'Failed to create user profile' });
      }
    } else {
      console.log('✓ User found:', user.email);
    }

    // Create Razorpay customer if doesn't exist
    let customerId = user.subscription.razorpayCustomerId;
    
    if (!customerId) {
      console.log('Creating Razorpay customer for:', req.userEmail);
      try {
        const customer = await razorpay.customers.create({
          name: req.userName || '',
          email: req.userEmail,
          fail_existing: 0
        });
        customerId = customer.id;
        
        user.subscription.razorpayCustomerId = customerId;
        await user.save();
        console.log('✓ Created Razorpay customer:', customerId);
      } catch (customerError) {
        console.error('❌ Error creating Razorpay customer:', customerError);
        console.error('Customer Error Details:', customerError.error || customerError);
        return res.status(500).json({ 
          error: 'Failed to create customer profile',
          details: customerError.error?.description || customerError.message
        });
      }
    } else {
      console.log('✓ Using existing Razorpay customer:', customerId);
    }

    // Create Razorpay subscription
    console.log('Creating Razorpay subscription...');
    console.log('  Plan ID:', plan.razorpayPlanId);
    console.log('  Customer ID:', customerId);
    try {
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

      console.log('✓ Razorpay subscription created:', subscription.id);
      console.log('  Status:', subscription.status);
      console.log('  Short URL:', subscription.short_url);

      // Update user subscription
      user.subscription.razorpaySubscriptionId = subscription.id;
      user.subscription.status = 'created';
      await user.save();

      console.log('✓ User subscription updated');
      console.log('=== SUBSCRIPTION CREATION SUCCESS ===');

      res.json({
        subscriptionId: subscription.id,
        planId: planId,
        amount: plan.price * 100, // Convert to paise
        currency: plan.currency
      });
    } catch (subscriptionError) {
      console.error('❌ Error creating Razorpay subscription:', subscriptionError);
      console.error('Subscription Error Details:', subscriptionError.error || subscriptionError);
      return res.status(500).json({ 
        error: 'Failed to create subscription', 
        details: subscriptionError.error?.description || subscriptionError.message 
      });
    }
  } catch (error) {
    console.error('=== CREATE SUBSCRIPTION FAILED ===');
    console.error('❌ Unexpected error:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Failed to create subscription',
      details: error.message 
    });
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
