import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Invoice from '../models/Invoice.js';
import { createClerkClient } from '@clerk/backend';
import { generateInvoicePDF, getInvoicePDFPath } from '../utils/pdfGenerator.js';
import { sendInvoiceEmail } from '../utils/emailService.js';
import EntitlementService from '../services/EntitlementService.js';
import SubscriptionStateMachine from '../services/SubscriptionStateMachine.js';

// Guard helper so routes fail fast when Razorpay creds are missing
const ensureRazorpay = (res, context = 'operation') => {
  if (!razorpay) {
    console.error(`❌ Razorpay not configured - cannot perform ${context}`);
    res.status(500).json({ error: 'Payment gateway not configured. Please contact support.' });
    return false;
  }
  return true;
};

// Ensure we have or create a Razorpay customer id for a user
const ensureRazorpayCustomer = async (user, email, name = '') => {
  if (user.subscription.razorpayCustomerId) return user.subscription.razorpayCustomerId;

  const customer = await razorpay.customers.create({
    name: name || user.name || '',
    email: email || user.email,
    fail_existing: 0
  });

  user.subscription.razorpayCustomerId = customer.id;
  await user.save();
  return customer.id;
};

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
    trialDays: 0,
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
    price: 1, // ₹100/month
    currency: 'INR',
    trialDays: 0, // No trial
    razorpayPlanId: process.env.RAZORPAY_PRO_PLAN_ID || 'plan_RcTPS7s2l9ku5N',
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
    price: 2, // ₹499/month
    currency: 'INR',
    trialDays: 0, // No trial
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

    console.log('📋 Fetching subscription for user:', userId);

    // Get or create user
    let user = await User.findOne({ clerkUserId: userId });

    if (!user) {
      console.log('⚠️  User not found, creating new user');
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
      console.log('✓ Created new user with free plan');
    } else {
      console.log('✓ User found');
      console.log('  Current plan:', user.subscription.plan);
      console.log('  Status:', user.subscription.status);
      console.log('  Subscription ID:', user.subscription.razorpaySubscriptionId || 'None');
      console.log('  End date:', user.subscription.subscriptionEndDate);
      console.log('  Auto-renew:', user.subscription.autoRenew);

      // CRITICAL: If status is 'created' or 'pending', check if it's stale (older than 24 hours)
      // We allow a grace period for the Webhook or VerifyPayment to complete
      const isStale = user.subscription.updatedAt &&
        (new Date() - new Date(user.subscription.updatedAt)) > 24 * 60 * 60 * 1000;

      if (['created', 'pending'].includes(user.subscription.status) && user.subscription.plan !== 'free' && isStale) {
        console.log('⚠️  Subscription payment stale (>24h) - treating as FREE user');
        user.subscription.plan = 'free';
        user.subscription.status = 'active';
        await user.save();
      } else if (['created', 'pending'].includes(user.subscription.status) && user.subscription.plan !== 'free') {
        console.log('⏳ Subscription in progress (within grace period) - Waiting for payment confirmation');
        // Do NOT downgrade yet, let the UI show "Processing" or keep current access
      }

      // SELF-HEALING: Check if user is on Free plan but has a valid Paid Invoice active
      // This recovers users who were accidentally downgraded or if webhook failed
      if (user.subscription.plan === 'free') {
        console.log('🔍 Checking for lost subscription (Self-Healing)...');
        try {
          const invoices = await Invoice.find({ userId: userId }).sort({ createdAt: -1 }).limit(3);
          console.log(`Found ${invoices.length} recent invoices`);

          let latestPaidInvoice = null;

          for (const inv of invoices) {
            console.log(`Inv: ${inv.invoiceNumber}, Status: ${inv.status}, End: ${inv.billingPeriodEnd}`);
            if (inv.status === 'paid' && new Date(inv.billingPeriodEnd) > new Date()) {
              latestPaidInvoice = inv;
              break;
            }
          }

          if (latestPaidInvoice) {
            console.log('🔄 Self-Healing: Triggered! Restoring plan:', latestPaidInvoice.planId);

            user.subscription.plan = latestPaidInvoice.planId;
            user.subscription.status = 'active';
            user.subscription.subscriptionEndDate = latestPaidInvoice.billingPeriodEnd;
            user.subscription.razorpaySubscriptionId = latestPaidInvoice.subscriptionId;

            await user.save();
            console.log('✅ Plan restored.');
          } else {
            console.log('❌ No valid restoration invoice found.');
          }
        } catch (healError) {
          console.error('⚠️ Self-healing error:', healError);
        }
      }
    }

    const currentPlanConfig = SUBSCRIPTION_PLANS[user.subscription.plan] || SUBSCRIPTION_PLANS.free;
    const entitlements = EntitlementService.getEntitlements(user.subscription.plan);

    // Get project count
    const projectCount = await Project.countDocuments({ ownerId: userId });
    console.log('  Project count:', projectCount, '/', entitlements.maxProjects);

    const responseData = {
      subscription: user.subscription,
      plan: {
        ...currentPlanConfig,
        features: entitlements
      },
      features: entitlements,
      usage: {
        projectCount,
        maxProjects: entitlements.maxProjects
      }
    };

    console.log('📤 Returning subscription data:');
    console.log('  Plan:', responseData.subscription.plan);
    console.log('  Status:', responseData.subscription.status);
    console.log('  Trial End:', responseData.subscription.trialEnd);
    console.log('  Subscription End:', responseData.subscription.subscriptionEndDate);
    console.log('  Auto-Renew:', responseData.subscription.autoRenew);
    console.log('  Updated At:', responseData.subscription.updatedAt);

    res.json(responseData);
  } catch (error) {
    console.error('❌ Get subscription error:', error);
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
      const customerEmail = req.userEmail || user.email;
      const customerName = req.userName || user.name || 'StudioFlow User';

      if (!customerEmail) {
        console.error('❌ Missing customer email for Razorpay');
        return res.status(400).json({
          error: 'Email required to create subscription. Please add an email to your profile.'
        });
      }

      console.log('Creating/Fetching Razorpay customer for:', customerEmail);
      try {
        // Strategy 1: Try to create (with fail_existing: 0)
        try {
          const customer = await razorpay.customers.create({
            name: customerName,
            email: customerEmail,
            fail_existing: 0
          });
          customerId = customer.id;
          console.log('✓ Created/Retrieved Razorpay customer:', customerId);
        } catch (createError) {
          // Strategy 2: If creation fails, try to fetch by email
          console.warn('⚠️ Creation failed, attempting to fetch existing customer by email...');

          const existingCustomers = await razorpay.customers.all({
            email: customerEmail,
            count: 1
          });

          if (existingCustomers.items && existingCustomers.items.length > 0) {
            customerId = existingCustomers.items[0].id;
            console.log('✓ Found existing Razorpay customer:', customerId);
          } else {
            // If fetch also fails, throw the original error
            console.error('❌ Could not find existing customer after creation failure');
            throw createError;
          }
        }

        if (customerId) {
          user.subscription.razorpayCustomerId = customerId;
          await user.save();
        } else {
          throw new Error('Failed to obtain valid customer ID');
        }

      } catch (customerError) {
        console.error('❌ Error handling Razorpay customer:', customerError);
        console.error('Customer Error Details:', customerError.error || customerError);
        return res.status(502).json({
          error: 'Failed to create/fetch customer profile',
          details: customerError.error?.description || customerError.message
        });
      }
    } else {
      console.log('✓ Using existing Razorpay customer:', customerId);
    }

    // Check if user has never subscribed before (eligible for trial)
    const isFirstSubscription = user.subscription.plan === 'free' &&
      !user.subscription.previousPlan;

    // Start 7-day trial for first-time subscribers
    if (isFirstSubscription && plan.trialDays > 0) {
      console.log(`🎁 Starting ${plan.trialDays}-day free trial for user`);
      const { startTrial } = await import('../utils/subscriptionHelpers.js');

      const trialResult = await startTrial(user, planId);

      console.log(`✅ Trial activated: ${planId} plan until ${trialResult.trialEnd.toLocaleDateString()}`);

      return res.json({
        success: true,
        trial: true,
        message: `${plan.trialDays}-day free trial activated! No charge until ${trialResult.trialEnd.toLocaleDateString()}`,
        subscription: {
          plan: planId,
          status: 'trial',
          trialStart: trialResult.trialStart,
          trialEnd: trialResult.trialEnd
        }
      });
    }

    // Create Razorpay subscription (for non-trial or returning users)
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

    console.log('=== VERIFYING PAYMENT ===');
    console.log('Payment ID:', razorpay_payment_id);
    console.log('Subscription ID:', razorpay_subscription_id);

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.error('❌ Invalid signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    console.log('✓ Signature verified');

    // Find user by subscription ID
    const user = await User.findOne({
      'subscription.razorpaySubscriptionId': razorpay_subscription_id
    });

    if (!user) {
      console.error('❌ User not found for subscription:', razorpay_subscription_id);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✓ User found:', user.email);

    // Get subscription details from Razorpay
    const subscription = await razorpay.subscriptions.fetch(razorpay_subscription_id);
    console.log('✓ Fetched subscription from Razorpay:', subscription.id);
    console.log('  Plan ID:', subscription.plan_id);
    console.log('  Status:', subscription.status);
    console.log('  Notes:', subscription.notes);

    // Determine plan from subscription notes or plan_id
    let planId = subscription.notes?.plan;

    // Fallback: determine from plan_id if notes don't have plan
    if (!planId) {
      if (subscription.plan_id === process.env.RAZORPAY_PRO_PLAN_ID || subscription.plan_id === 'plan_RcTPS7s2l9ku5N') {
        planId = 'pro';
      } else if (subscription.plan_id === process.env.RAZORPAY_STUDIO_PLAN_ID || subscription.plan_id === 'plan_RcTPuLbBYG9E8N') {
        planId = 'studio';
      } else {
        planId = 'pro'; // Default fallback
      }
      console.log('⚠️  Plan not in notes, determined from plan_id:', planId);
    } else {
      console.log('✓ Plan from notes:', planId);
    }

    // Update user subscription
    user.subscription.plan = planId;

    try {
      const newStatus = SubscriptionStateMachine.transition(user.subscription.status, 'active');
      user.subscription.status = newStatus;
    } catch (error) {
      console.error('❌ State transition failed:', error.message);
      // Force active on verification success, but log error
      user.subscription.status = 'active';
    }

    user.subscription.razorpayPaymentId = razorpay_payment_id;
    user.subscription.subscriptionStartDate = new Date(subscription.start_at * 1000);

    // Use current_end for next billing date (monthly cycle)
    // current_end = next billing date for recurring subscriptions
    // end_at = final subscription expiry (after all cycles)
    // For monthly SaaS, we want current_end to show next renewal date
    if (subscription.current_end) {
      user.subscription.subscriptionEndDate = new Date(subscription.current_end * 1000);
      console.log('✓ Using current_end for next billing:', user.subscription.subscriptionEndDate);
    } else if (subscription.charge_at) {
      // Fallback to charge_at if current_end not available
      user.subscription.subscriptionEndDate = new Date(subscription.charge_at * 1000);
      console.log('✓ Using charge_at for next billing:', user.subscription.subscriptionEndDate);
    } else if (subscription.end_at) {
      // Last resort: use end_at (but this is subscription expiry, not next billing)
      user.subscription.subscriptionEndDate = new Date(subscription.end_at * 1000);
      console.log('⚠️  Using end_at (may be far in future):', user.subscription.subscriptionEndDate);
    } else {
      // Fallback: Calculate 30 days from start date
      const endDate = new Date(subscription.start_at * 1000);
      endDate.setDate(endDate.getDate() + 30);
      user.subscription.subscriptionEndDate = endDate;
      console.log('⚠️  No end date in subscription, calculated +30 days:', endDate);
    }

    user.subscription.autoRenew = subscription.status === 'active';

    await user.save();

    console.log('✓ User subscription updated to:', planId);
    console.log('  Status:', user.subscription.status);
    console.log('  Start:', user.subscription.subscriptionStartDate);
    console.log('  End:', user.subscription.subscriptionEndDate);

    // Create invoice for successful payment with PDF generation
    const planConfig = SUBSCRIPTION_PLANS[planId];
    if (planConfig) {
      try {
        const invoice = await Invoice.create({
          userId: req.userId,
          subscriptionId: razorpay_subscription_id,
          planId: planId,
          planName: planConfig.name,
          amount: planConfig.price,
          currency: 'INR',
          type: 'payment',
          status: 'paid',
          razorpayPaymentId: razorpay_payment_id,
          billingPeriodStart: user.subscription.subscriptionStartDate,
          billingPeriodEnd: user.subscription.subscriptionEndDate,
          description: `${planConfig.name} plan subscription payment`,
          metadata: {
            prorated: false,
            userEmail: user.email,
            userName: user.name
          }
        });
        console.log('✓ Invoice created:', invoice.invoiceNumber);

        // Generate PDF and send email asynchronously
        generateInvoiceWithPDF(invoice, user).catch(err => {
          console.error('⚠️  Background invoice PDF generation failed:', err.message);
        });

      } catch (invoiceError) {
        console.error('⚠️  Failed to create invoice:', invoiceError.message);
        // Don't fail the payment verification if invoice creation fails
      }
    }

    console.log('=== PAYMENT VERIFICATION SUCCESS ===');

    res.json({
      message: 'Payment verified successfully',
      subscription: user.subscription
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
};

// Helper function to generate invoice PDF and send email
async function generateInvoiceWithPDF(invoice, user) {
  try {
    console.log(`📄 Generating PDF for invoice ${invoice.invoiceNumber}...`);

    // Generate PDF
    const pdfPath = await generateInvoicePDF(invoice, user);

    // Update invoice with PDF path
    invoice.pdfUrl = `/api/invoices/${invoice.invoiceNumber}/download`;
    invoice.pdfGenerated = true;
    await invoice.save();

    console.log(`✅ PDF generated and saved for ${invoice.invoiceNumber}`);

    // Send email with PDF attachment if user has email
    if (user.email) {
      console.log(`📧 Sending invoice email to ${user.email}...`);
      const emailResult = await sendInvoiceEmail({
        to: user.email,
        userName: user.name || 'Customer',
        invoice: invoice,
        pdfPath: pdfPath
      });

      if (emailResult.success) {
        invoice.emailSent = true;
        invoice.emailSentAt = new Date();
        await invoice.save();
        console.log(`✅ Invoice email sent successfully`);
      } else {
        console.error(`⚠️  Failed to send invoice email:`, emailResult.error);
      }
    } else {
      console.log(`⚠️  No email address for user, skipping email`);
    }

  } catch (error) {
    console.error(`❌ Error in generateInvoiceWithPDF:`, error);
  }
}

// @desc    Cancel subscription with refund
// @route   POST /api/subscriptions/cancel
// @access  Protected
export const cancelSubscription = async (req, res) => {
  try {
    if (!ensureRazorpay(res, 'cancellation')) return;
    const userId = req.userId;
    const { reason } = req.body; // Optional cancellation reason

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] === CANCEL SUBSCRIPTION REQUEST ===`);
    console.log(`[${timestamp}] User ID:`, userId);
    console.log(`[${timestamp}] Reason:`, reason || 'Not provided');

    const user = await User.findOne({ clerkUserId: userId });

    if (!user) {
      console.error(`[${timestamp}] ❌ User not found`);
      return res.status(404).json({ error: 'User not found' });
    }

    // SPECIAL CASE: Handle trial cancellation
    const { isTrialActive, endTrial } = await import('../utils/subscriptionHelpers.js');

    if (isTrialActive(user)) {
      console.log(`[${timestamp}] 🎁 Cancelling during trial period - full refund (no charge)`);

      const trialResult = await endTrial(user, false, razorpay);

      console.log(`[${timestamp}] ✅ Trial cancelled - downgraded to free plan`);

      return res.json({
        success: true,
        message: 'Trial cancelled. No charges applied.',
        subscription: {
          plan: 'free',
          status: 'active',
          refund: 0,
          wasTrial: true
        }
      });
    }

    if (!user.subscription.razorpaySubscriptionId) {
      console.error(`[${timestamp}] ❌ No active subscription found`);
      return res.status(404).json({ error: 'No active subscription found' });
    }

    if (user.subscription.status === 'cancelled') {
      console.error(`[${timestamp}] ❌ Subscription already cancelled`);
      // If already cancelled, just return success with current status
      return res.json({
        message: 'Subscription is already cancelled.',
        subscription: {
          plan: user.subscription.plan,
          status: user.subscription.status,
          cancelledAt: user.subscription.cancelledAt,
          accessUntil: user.subscription.subscriptionEndDate,
          autoRenew: false
        }
      });
    }

    console.log(`[${timestamp}] ✓ Subscription ID:`, user.subscription.razorpaySubscriptionId);
    console.log(`[${timestamp}] ✓ Current plan:`, user.subscription.plan);
    console.log(`[${timestamp}] ✓ Current status:`, user.subscription.status);
    console.log(`[${timestamp}] ✓ Payment ID:`, user.subscription.razorpayPaymentId);

    // Calculate prorated refund
    const now = new Date();
    const subscriptionEnd = new Date(user.subscription.subscriptionEndDate);
    const subscriptionStart = new Date(user.subscription.subscriptionStartDate);

    const totalDays = Math.ceil((subscriptionEnd - subscriptionStart) / (1000 * 60 * 60 * 24));
    const unusedDays = Math.max(0, Math.ceil((subscriptionEnd - now) / (1000 * 60 * 60 * 24)));

    const planPrice = SUBSCRIPTION_PLANS[user.subscription.plan]?.price || 0;
    const refundAmount = Math.round((planPrice * unusedDays / totalDays) * 100) / 100;

    console.log(`[${timestamp}] 📊 Cancellation Details:`);
    console.log(`[${timestamp}]   Total days:`, totalDays);
    console.log(`[${timestamp}]   Unused days:`, unusedDays);
    console.log(`[${timestamp}]   Plan price: ₹`, planPrice);
    console.log(`[${timestamp}]   Access until:`, subscriptionEnd.toISOString());

    // Cancel Razorpay subscription at period end (no immediate refund)
    let razorpayCancelSuccess = false;
    try {
      const cancelledSub = await razorpay.subscriptions.cancel(
        user.subscription.razorpaySubscriptionId,
        { cancel_at_cycle_end: 1 } // Cancel at end of billing cycle, not immediately
      );
      console.log(`[${timestamp}] ✓ Razorpay subscription set to cancel at period end`);
      console.log(`[${timestamp}]   Razorpay status:`, cancelledSub.status);
      console.log(`[${timestamp}]   Ends at:`, new Date(cancelledSub.current_end * 1000).toISOString());
      razorpayCancelSuccess = true;
    } catch (cancelError) {
      console.error(`[${timestamp}] ❌ Failed to cancel Razorpay subscription:`, cancelError.message);
      // Continue anyway to update local status
    }

    // Update user subscription status - keep active until end of period
    const previousStatus = user.subscription.status;
    const previousPlan = user.subscription.plan;

    try {
      // Validate transition
      const newStatus = SubscriptionStateMachine.transition(previousStatus, 'cancelled');
      user.subscription.status = newStatus;
    } catch (error) {
      console.error(`[${timestamp}] ❌ State transition failed:`, error.message);
      return res.status(400).json({ error: error.message });
    }

    // DO NOT change plan yet - keep current plan until subscriptionEndDate
    user.subscription.lastStatusChange = now;
    user.subscription.cancelledAt = now;
    user.subscription.cancelReason = reason || 'User requested cancellation';
    user.subscription.autoRenew = false; // Turn off auto-renewal
    // subscriptionEndDate remains the same - user keeps access until then

    await user.save();

    console.log(`[${timestamp}] ✓ Subscription marked as cancelled`);
    console.log(`[${timestamp}]   Plan remains: ${user.subscription.plan} (until ${subscriptionEnd.toLocaleDateString()})`);
    console.log(`[${timestamp}]   Status: ${user.subscription.status}`);
    console.log(`[${timestamp}]   Auto-renew: ${user.subscription.autoRenew}`);

    // Send cancellation confirmation email (optional)
    try {
      // You can add email notification here if needed
      console.log(`[${timestamp}] 📧 Cancellation confirmation would be sent to ${user.email}`);
    } catch (emailError) {
      console.error(`[${timestamp}] ⚠️  Failed to send cancellation email:`, emailError.message);
    }

    console.log(`[${timestamp}] === CANCELLATION SUCCESS ===`);
    console.log(`[${timestamp}]   Status: ${previousStatus} → cancelled`);
    console.log(`[${timestamp}]   Plan: ${previousPlan} (REMAINS ACTIVE until ${subscriptionEnd.toLocaleDateString()})`);
    console.log(`[${timestamp}]   Cancelled at:`, now.toISOString());
    console.log(`[${timestamp}]   Access until:`, subscriptionEnd.toISOString());
    console.log(`[${timestamp}]   Auto-renew: disabled`);
    console.log(`[${timestamp}] === NO REFUND - USER KEEPS ACCESS UNTIL PERIOD END ===`);

    res.json({
      message: 'Subscription cancelled successfully. You will retain access to your current plan until the end of your billing period.',
      subscription: {
        plan: user.subscription.plan, // Remains current plan
        status: user.subscription.status, // cancelled
        cancelledAt: user.subscription.cancelledAt,
        accessUntil: user.subscription.subscriptionEndDate,
        autoRenew: user.subscription.autoRenew, // false
        willDowngradeTo: 'free',
        downgradeDate: user.subscription.subscriptionEndDate
      },
      accessInfo: {
        keepsAccess: true,
        accessUntil: user.subscription.subscriptionEndDate,
        message: `You can continue using ${SUBSCRIPTION_PLANS[user.subscription.plan]?.name} plan features until ${subscriptionEnd.toLocaleDateString()}`
      },
      refundInfo: {
        refundIssued: false,
        reason: 'You will have access to your subscription until the end of the billing period'
      }
    });
  } catch (error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ Cancel subscription error:`, error);
    res.status(500).json({
      error: 'Failed to cancel subscription',
      details: error.message
    });
  }
};

// @desc    Handle Razorpay webhooks
// @route   POST /api/subscriptions/webhook
// @access  Public (but verified)
export const handleWebhook = async (req, res) => {
  const timestamp = new Date().toISOString();
  const signature = req.headers['x-razorpay-signature'];

  // 1. Verify Signature (must use raw body that Razorpay signs)
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error(`[${timestamp}] ❌ Invalid webhook signature`);
      return res.status(400).json({ error: 'Invalid signature' });
    }
  } catch (error) {
    console.error(`[${timestamp}] ❌ Signature verification failed:`, error);
    return res.status(400).json({ error: 'Signature verification failed' });
  }

  const { event, payload } = req.body;
  // Razorpay sends 'x-razorpay-event-id' header, or we can generate one from payload if missing
  const eventId = req.headers['x-razorpay-event-id'] || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  console.log(`[${timestamp}] 📨 WEBHOOK RECEIVED: ${event} (ID: ${eventId})`);

  // 2. Idempotency Check & Persistence
  try {
    // Check if event already exists
    const existingEvent = await import('../models/WebhookEvent.js').then(m => m.default.findOne({ eventId }));

    if (existingEvent) {
      console.log(`[${timestamp}] ⚠️  Duplicate event ${eventId} ignored. Status: ${existingEvent.status}`);
      return res.json({ status: 'ignored', message: 'Duplicate event' });
    }

    // Store raw event
    const WebhookEvent = await import('../models/WebhookEvent.js').then(m => m.default);
    await WebhookEvent.create({
      eventId,
      provider: 'razorpay',
      eventType: event,
      payload: req.body,
      status: 'pending'
    });

    console.log(`[${timestamp}] 💾 Event ${eventId} stored as pending`);
  } catch (dbError) {
    console.error(`[${timestamp}] ❌ Failed to store webhook event:`, dbError);
    // If we can't store it, we should probably still try to process it or return 500 to retry
    // For now, let's return 500 so Razorpay retries later
    return res.status(500).json({ error: 'Database error' });
  }

  // 3. Process Event
  try {
    switch (event) {
      case 'subscription.activated':
        await handleSubscriptionActivated(payload.subscription.entity, timestamp);
        break;

      case 'subscription.charged':
        await handleSubscriptionCharged(payload.subscription.entity, payload.payment.entity, timestamp);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(payload.subscription.entity, timestamp);
        break;

      case 'subscription.completed':
        await handleSubscriptionCompleted(payload.subscription.entity, timestamp);
        break;

      case 'subscription.paused':
      case 'subscription.halted':
        await handleSubscriptionPaused(payload.subscription.entity, timestamp);
        break;

      case 'payment.failed':
        await handlePaymentFailed(payload.payment.entity, timestamp);
        break;

      case 'refund.created':
      case 'refund.processed':
        await handleRefund(payload.refund.entity, timestamp);
        break;

      default:
        console.log(`[${timestamp}] ⚠️  Unhandled webhook event: ${event}`);
    }

    // 4. Update Event Status to Processed
    const WebhookEvent = await import('../models/WebhookEvent.js').then(m => m.default);
    await WebhookEvent.findOneAndUpdate(
      { eventId },
      { status: 'processed', processedAt: new Date() }
    );

    console.log(`[${timestamp}] ✅ Webhook processed successfully`);
    res.json({ status: 'ok', event, timestamp });

  } catch (processError) {
    console.error(`[${timestamp}] ❌ Webhook processing failed:`, processError);

    // Update Event Status to Failed
    const WebhookEvent = await import('../models/WebhookEvent.js').then(m => m.default);
    await WebhookEvent.findOneAndUpdate(
      { eventId },
      {
        status: 'failed',
        processingError: processError.message
      }
    );

    // Return 500 to trigger retry from Razorpay
    res.status(500).json({ error: 'Webhook processing failed', details: processError.message });
  }
};

// Helper functions for webhook events with enhanced logging
async function handleSubscriptionActivated(subscription, timestamp) {
  console.log(`[${timestamp}] 🔄 Processing subscription.activated...`);

  let user = await User.findOne({
    'subscription.razorpaySubscriptionId': subscription.id
  });

  // Fallback: Find by Customer ID if subscription ID not found (e.g. external upgrade)
  if (!user && subscription.customer_id) {
    console.log(`[${timestamp}] ⚠️  User not found by subscription ID, trying customer ID: ${subscription.customer_id}`);
    user = await User.findOne({
      'subscription.razorpayCustomerId': subscription.customer_id
    });

    if (user) {
      console.log(`[${timestamp}] ✓ Found user by customer ID. Updating subscription ID to: ${subscription.id}`);
      user.subscription.razorpaySubscriptionId = subscription.id;
      // Don't save yet, will save below
    }
  }

  if (user) {
    const previousStatus = user.subscription.status;
    const previousPlan = user.subscription.plan;

    try {
      const SubscriptionStateMachine = await import('../services/SubscriptionStateMachine.js').then(m => m.default);

      // Validate transition
      const newStatus = SubscriptionStateMachine.transition(previousStatus, 'active');

      user.subscription.status = newStatus;
      user.subscription.plan = subscription.notes?.plan || 'pro';
      user.subscription.subscriptionStartDate = new Date(subscription.start_at * 1000);
      user.subscription.subscriptionEndDate = new Date(subscription.end_at * 1000);
      user.subscription.nextBillingDate = subscription.current_end ? new Date(subscription.current_end * 1000) : null;
      user.subscription.lastStatusChange = new Date();

      await user.save();

      console.log(`[${timestamp}] ✅ Subscription activated`);
      console.log(`[${timestamp}]   User: ${user.email || user.clerkUserId}`);
      console.log(`[${timestamp}]   Status: ${previousStatus} → ${newStatus}`);
    } catch (error) {
      console.error(`[${timestamp}] ❌ State transition failed:`, error.message);
      throw error; // Re-throw to fail the webhook processing
    }
  } else {
    console.log(`[${timestamp}] ⚠️  User not found for subscription: ${subscription.id}`);
  }
}

async function handleSubscriptionCharged(subscription, payment, timestamp) {
  console.log(`[${timestamp}] 🔄 Processing subscription.charged...`);

  let user = await User.findOne({
    'subscription.razorpaySubscriptionId': subscription.id
  });

  // Fallback: Find by Customer ID if subscription ID not found
  if (!user && subscription.customer_id) {
    console.log(`[${timestamp}] ⚠️  User not found by subscription ID, trying customer ID: ${subscription.customer_id}`);
    user = await User.findOne({
      'subscription.razorpayCustomerId': subscription.customer_id
    });

    if (user) {
      console.log(`[${timestamp}] ✓ Found user by customer ID. Updating subscription ID to: ${subscription.id}`);
      user.subscription.razorpaySubscriptionId = subscription.id;
    }
  }

  if (user) {
    const previousStatus = user.subscription.status;

    try {
      const SubscriptionStateMachine = await import('../services/SubscriptionStateMachine.js').then(m => m.default);

      // Validate transition (e.g. past_due -> active)
      const newStatus = SubscriptionStateMachine.transition(previousStatus, 'active');

      user.subscription.razorpayPaymentId = payment.id;
      user.subscription.status = newStatus;
      user.subscription.lastStatusChange = new Date();

      // Update billing dates
      if (subscription.current_end) {
        user.subscription.subscriptionEndDate = new Date(subscription.current_end * 1000);
      }

      await user.save();

      console.log(`[${timestamp}] ✅ Subscription charged successfully`);
      console.log(`[${timestamp}]   Status: ${previousStatus} → ${newStatus}`);

      // Create Invoice
      const planId = user.subscription.plan;
      const planConfig = SUBSCRIPTION_PLANS[planId];

      if (planConfig) {
        try {
          const Invoice = await import('../models/Invoice.js').then(m => m.default);
          const invoice = await Invoice.create({
            userId: user.clerkUserId,
            subscriptionId: subscription.id,
            planId: planId,
            planName: planConfig.name,
            amount: planConfig.price, // Use plan price or payment.amount / 100
            currency: 'INR',
            type: 'renewal',
            status: 'paid',
            razorpayPaymentId: payment.id,
            billingPeriodStart: new Date(subscription.current_start * 1000),
            billingPeriodEnd: new Date(subscription.current_end * 1000),
            description: `${planConfig.name} plan subscription renewal`,
            metadata: {
              userEmail: user.email,
              userName: user.name
            }
          });
          console.log(`[${timestamp}] ✅ Invoice created: ${invoice.invoiceNumber}`);

          // Generate PDF asynchronously
          generateInvoiceWithPDF(invoice, user).catch(err => {
            console.error(`[${timestamp}] ⚠️  Background invoice PDF generation failed:`, err.message);
          });
        } catch (invError) {
          console.error(`[${timestamp}] ⚠️  Failed to create invoice:`, invError.message);
        }
      }

    } catch (error) {
      console.error(`[${timestamp}] ❌ State transition failed:`, error.message);
      throw error;
    }
  }
}

async function handleSubscriptionCancelled(subscription, timestamp) {
  console.log(`[${timestamp}] 🔄 Processing subscription.cancelled...`);

  const user = await User.findOne({
    'subscription.razorpaySubscriptionId': subscription.id
  });

  if (user) {
    const previousStatus = user.subscription.status;

    try {
      const SubscriptionStateMachine = await import('../services/SubscriptionStateMachine.js').then(m => m.default);
      const newStatus = SubscriptionStateMachine.transition(previousStatus, 'cancelled');

      user.subscription.status = newStatus;
      user.subscription.lastStatusChange = new Date();
      user.subscription.cancelledAt = new Date(subscription.ended_at * 1000 || Date.now());
      user.subscription.autoRenew = false;

      await user.save();

      console.log(`[${timestamp}] ✅ Subscription cancelled`);
      console.log(`[${timestamp}]   Status: ${previousStatus} → ${newStatus}`);
    } catch (error) {
      console.error(`[${timestamp}] ❌ State transition failed:`, error.message);
    }
  }
}

async function handleSubscriptionCompleted(subscription, timestamp) {
  console.log(`[${timestamp}] 🔄 Processing subscription.completed...`);
  const user = await User.findOne({
    'subscription.razorpaySubscriptionId': subscription.id
  });

  if (user) {
    const previousStatus = user.subscription.status;
    try {
      const SubscriptionStateMachine = await import('../services/SubscriptionStateMachine.js').then(m => m.default);
      const newStatus = SubscriptionStateMachine.transition(previousStatus, 'expired');

      user.subscription.status = newStatus;
      user.subscription.lastStatusChange = new Date();
      user.subscription.autoRenew = false;

      await user.save();
      console.log(`[${timestamp}] ✅ Subscription completed (expired)`);
    } catch (error) {
      console.error(`[${timestamp}] ❌ State transition failed:`, error.message);
    }
  }
}

async function handleSubscriptionPaused(subscription, timestamp) {
  console.log(`[${timestamp}] 🔄 Processing subscription.paused...`);

  const user = await User.findOne({
    'subscription.razorpaySubscriptionId': subscription.id
  });

  if (user) {
    const previousStatus = user.subscription.status;
    try {
      const SubscriptionStateMachine = await import('../services/SubscriptionStateMachine.js').then(m => m.default);
      const newStatus = SubscriptionStateMachine.transition(previousStatus, 'paused');

      user.subscription.status = newStatus;
      user.subscription.lastStatusChange = new Date();

      await user.save();
      console.log(`[${timestamp}] ✅ Subscription paused`);
    } catch (error) {
      console.error(`[${timestamp}] ❌ State transition failed:`, error.message);
    }
  }
}

async function handlePaymentFailed(payment, timestamp) {
  console.log(`[${timestamp}] 🔄 Processing payment.failed...`);

  let user;
  if (payment.notes && payment.notes.userId) {
    user = await User.findOne({ clerkUserId: payment.notes.userId });
  }

  if (!user && payment.email) {
    user = await User.findOne({ email: payment.email });
  }

  if (user) {
    const previousStatus = user.subscription.status;

    if (previousStatus === 'active') {
      try {
        const SubscriptionStateMachine = await import('../services/SubscriptionStateMachine.js').then(m => m.default);
        const newStatus = SubscriptionStateMachine.transition(previousStatus, 'past_due');

        user.subscription.status = newStatus;
        user.subscription.lastStatusChange = new Date();

        await user.save();
        console.log(`[${timestamp}] ⚠️  Payment failed - Subscription marked as past_due`);
      } catch (error) {
        console.error(`[${timestamp}] ❌ State transition failed:`, error.message);
      }
    }
  }
}

async function handleRefund(refund, timestamp) {
  console.log(`[${timestamp}] 🔄 Processing refund...`);

  if (refund.payment_id) {
    const Invoice = await import('../models/Invoice.js').then(m => m.default);
    await Invoice.findOneAndUpdate(
      { razorpayPaymentId: refund.payment_id },
      {
        status: 'refunded',
        razorpayRefundId: refund.id,
        'metadata.refundReason': refund.notes?.reason || 'Refund processed'
      }
    );
    console.log(`[${timestamp}] ✅ Invoice marked as refunded`);
  }
}

// @desc    Toggle auto-renew status
// @route   POST /api/subscriptions/auto-renew
// @access  Protected
export const toggleAutoRenew = async (req, res) => {
  try {
    const userId = req.userId;
    const { autoRenew } = req.body;

    console.log(`[${new Date().toISOString()}] === TOGGLE AUTO-RENEW REQUEST ===`);
    console.log(`User ID: ${userId}`);
    console.log(`New Status: ${autoRenew}`);

    const user = await User.findOne({ clerkUserId: userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.subscription.razorpaySubscriptionId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Update local status
    user.subscription.autoRenew = autoRenew;
    await user.save();

    console.log(`✓ Auto-renew updated to: ${autoRenew}`);

    // If turning OFF auto-renew, we might want to schedule cancellation at cycle end
    if (autoRenew === false) {
      try {
        console.log('ℹ️  Auto-renew disabled locally.');
      } catch (err) {
        console.error('Error updating gateway:', err);
      }
    }

    res.json({
      success: true,
      subscription: user.subscription,
      message: `Auto-renew ${autoRenew ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('Toggle auto-renew error:', error);
    res.status(500).json({ error: 'Failed to update auto-renew status' });
  }
};

// @desc    Upgrade subscription plan
// @route   POST /api/subscriptions/upgrade
// @access  Protected
export const upgradeSubscription = async (req, res) => {
  try {
    if (!ensureRazorpay(res, 'upgrade')) return;
    const userId = req.userId;
    const { targetPlan } = req.body; // 'pro' or 'studio'

    if (!['pro', 'studio'].includes(targetPlan)) {
      return res.status(400).json({ error: 'Invalid target plan' });
    }

    const user = await User.findOne({ clerkUserId: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentPlan = user.subscription.plan;

    // Check if it's actually an upgrade
    const planHierarchy = { free: 0, pro: 1, studio: 2 };
    if (planHierarchy[targetPlan] <= planHierarchy[currentPlan]) {
      return res.status(400).json({ error: 'Can only upgrade to a higher plan' });
    }

    // If user is on Free, create a new subscription
    if (currentPlan === 'free') {
      // Just create the subscription (payment will be handled by frontend)
      const planConfig = SUBSCRIPTION_PLANS[targetPlan];
      const customerId = await ensureRazorpayCustomer(user, user.email, user.name);
      const subscriptionData = {
        plan_id: planConfig.razorpayPlanId,
        customer_id: customerId,
        total_count: 12, // Annual
        customer_notify: 1
      };

      const subscription = await razorpay.subscriptions.create(subscriptionData);

      // SAVE THE SUBSCRIPTION ID!
      user.subscription.razorpaySubscriptionId = subscription.id;
      user.subscription.status = 'created'; // Pending payment
      await user.save();

      res.json({
        subscriptionId: subscription.id,
        amount: planConfig.price,
        currency: planConfig.currency
      });
      return;
    }

    // If upgrading from Pro to Studio, calculate prorated amount
    if (currentPlan === 'pro' && targetPlan === 'studio') {
      const currentPlanPrice = SUBSCRIPTION_PLANS.pro.price;
      const targetPlanPrice = SUBSCRIPTION_PLANS.studio.price;

      // Get current subscription details from Razorpay
      const currentSubscription = await razorpay.subscriptions.fetch(
        user.subscription.razorpaySubscriptionId
      );

      // Calculate days remaining in current billing cycle
      const currentPeriodEnd = new Date(currentSubscription.current_end * 1000);
      const now = new Date();
      const daysRemaining = Math.max(0, Math.ceil((currentPeriodEnd - now) / (1000 * 60 * 60 * 24)));
      const daysInMonth = 30;

      // Calculate prorated credit
      const proratedCredit = (currentPlanPrice / daysInMonth) * daysRemaining;
      const upgradeAmount = targetPlanPrice - proratedCredit;

      // Cancel current subscription
      await razorpay.subscriptions.cancel(user.subscription.razorpaySubscriptionId);

      // Create new subscription
      const customerId = await ensureRazorpayCustomer(user, user.email, user.name);
      const newSubscription = await razorpay.subscriptions.create({
        plan_id: SUBSCRIPTION_PLANS.studio.razorpayPlanId,
        customer_id: customerId,
        total_count: 12,
        customer_notify: 1
      });

      // SAVE THE NEW SUBSCRIPTION ID!
      user.subscription.razorpaySubscriptionId = newSubscription.id;
      user.subscription.status = 'created'; // Pending payment
      await user.save();

      res.json({
        subscriptionId: newSubscription.id,
        amount: Math.max(1, Math.round(upgradeAmount)), // Minimum ₹1
        currency: 'INR',
        prorated: true,
        proratedCredit: Math.round(proratedCredit),
        daysRemaining
      });
    }
  } catch (error) {
    console.error('Upgrade subscription error:', error);
    res.status(500).json({
      error: 'Failed to upgrade subscription',
      details: error.message
    });
  }
};

// @desc    Reactivate cancelled subscription
// @route   POST /api/subscriptions/reactivate
// @access  Protected
export const reactivateSubscription = async (req, res) => {
  try {
    const userId = req.userId;
    const { plan } = req.body; // 'pro' or 'studio'

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] === REACTIVATE SUBSCRIPTION REQUEST ===`);
    console.log(`[${timestamp}] User ID:`, userId);
    console.log(`[${timestamp}] Requested plan:`, plan);

    if (!['pro', 'studio'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const user = await User.findOne({ clerkUserId: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if subscription is cancelled/expired but user already paid for current period
    const now = new Date();
    const endDate = user.subscription.subscriptionEndDate ? new Date(user.subscription.subscriptionEndDate) : null;

    // CRITICAL: If user has paid and end date is in future, just reactivate - don't charge again!
    if (endDate && endDate > now && user.subscription.razorpayPaymentId) {
      const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

      console.log(`[${timestamp}] ✅ USER ALREADY PAID - ${daysRemaining} days remaining until ${endDate.toLocaleDateString()}`);
      console.log(`[${timestamp}] 🔄 Reactivating WITHOUT PAYMENT - just enabling auto-renew`);
      console.log(`[${timestamp}]   Current status: ${user.subscription.status}`);
      console.log(`[${timestamp}]   Last payment ID: ${user.subscription.razorpayPaymentId}`);

      // Update local subscription status - NO RAZORPAY CALL NEEDED
      try {
        const newStatus = SubscriptionStateMachine.transition(user.subscription.status, 'active');
        user.subscription.status = newStatus;
      } catch (error) {
        console.error(`[${timestamp}] ❌ State transition failed:`, error.message);
        return res.status(400).json({ error: error.message });
      }

      user.subscription.autoRenew = true;
      user.subscription.cancelledAt = null;
      user.subscription.cancelReason = null;
      user.subscription.lastStatusChange = now;

      await user.save();

      console.log(`[${timestamp}] === REACTIVATION SUCCESS (NO CHARGE) ===`);
      console.log(`[${timestamp}]   Plan: ${user.subscription.plan}`);
      console.log(`[${timestamp}]   Status: active`);
      console.log(`[${timestamp}]   Access until: ${endDate.toLocaleDateString()}`);
      console.log(`[${timestamp}]   Next billing: ${endDate.toLocaleDateString()}`);
      console.log(`[${timestamp}]   Auto-renew: enabled`);

      return res.json({
        success: true,
        message: `Subscription reactivated! Auto-renew enabled. Next billing: ${endDate.toLocaleDateString()}`,
        subscription: {
          plan: user.subscription.plan,
          status: user.subscription.status,
          nextBillingDate: user.subscription.subscriptionEndDate,
          subscriptionEndDate: user.subscription.subscriptionEndDate,
          amount: SUBSCRIPTION_PLANS[plan].price,
          autoRenew: true,
          daysRemaining: daysRemaining
        },
        noImmediateCharge: true,
        alreadyPaid: true
      });
    }

    // Check if has Razorpay subscription ID that can be resumed
    if (user.subscription.razorpaySubscriptionId &&
      ['cancelled', 'scheduled_downgrade'].includes(user.subscription.status)) {

      console.log(`[${timestamp}] ℹ️  User has existing cancelled/scheduled Razorpay subscription`);
      console.log(`[${timestamp}]   Razorpay ID: ${user.subscription.razorpaySubscriptionId}`);

      // Try to resume the subscription on Razorpay
      try {
        const razorpaySub = await razorpay.subscriptions.fetch(user.subscription.razorpaySubscriptionId);

        if (razorpaySub.status === 'active' || razorpaySub.status === 'authenticated') {
          console.log(`[${timestamp}] ✅ Razorpay subscription is still active - just updating local status`);

          try {
            const newStatus = SubscriptionStateMachine.transition(user.subscription.status, 'active');
            user.subscription.status = newStatus;
          } catch (error) {
            console.error(`[${timestamp}] ❌ State transition failed:`, error.message);
            return res.status(400).json({ error: error.message });
          }

          user.subscription.autoRenew = true;
          user.subscription.cancelledAt = null;
          user.subscription.cancelReason = null;
          user.subscription.lastStatusChange = now;

          await user.save();

          return res.json({
            success: true,
            message: 'Subscription reactivated! Auto-renew enabled.',
            subscription: {
              plan: user.subscription.plan,
              status: user.subscription.status,
              nextBillingDate: user.subscription.subscriptionEndDate,
              autoRenew: true
            },
            noImmediateCharge: true
          });
        }
      } catch (razorpayError) {
        console.error(`[${timestamp}] ⚠️  Could not check Razorpay subscription:`, razorpayError.message);
      }
    }

    // If no existing subscription or expired long ago, create new one
    console.log(`[${timestamp}] 💳 Creating new subscription (REQUIRES PAYMENT)`);

    const planConfig = SUBSCRIPTION_PLANS[plan];
    const subscriptionData = {
      plan_id: planConfig.razorpayPlanId,
      total_count: 12,
      customer_notify: 1,
      notes: {
        userId: userId,
        plan: plan,
        email: user.email
      }
    };

    const subscription = await razorpay.subscriptions.create(subscriptionData);

    console.log(`[${timestamp}] ✅ Razorpay subscription created:`, subscription.id);
    console.log(`[${timestamp}]   Requires immediate payment`);

    // SAVE THE SUBSCRIPTION ID!
    user.subscription.razorpaySubscriptionId = subscription.id;
    user.subscription.status = 'created'; // Pending payment
    await user.save();

    res.json({
      subscriptionId: subscription.id,
      amount: planConfig.price,
      currency: planConfig.currency,
      requiresPayment: true
    });
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
};

// @desc    Get user invoices
// @route   GET /api/subscriptions/invoices
// @access  Protected
export const getInvoices = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    console.log('📄 Fetching invoices for user:', userId);

    const invoices = await Invoice.find({ userId: { $eq: userId } })
      .sort({ createdAt: -1 })
      .limit(50);

    console.log('✓ Found', invoices.length, 'invoices');

    res.json({
      invoices: invoices.map(inv => ({
        invoiceNumber: inv.invoiceNumber,
        planName: inv.planName,
        amount: inv.amount,
        currency: inv.currency,
        type: inv.type,
        status: inv.status,
        billingPeriodStart: inv.billingPeriodStart,
        billingPeriodEnd: inv.billingPeriodEnd,
        description: inv.description,
        createdAt: inv.createdAt,
        metadata: inv.metadata
      }))
    });
  } catch (error) {
    console.error('❌ Get invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

// @desc    Get comprehensive billing history from Razorpay
// @route   GET /api/subscriptions/billing-history
// @access  Protected
export const getBillingHistory = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    console.log('📊 Fetching billing history for user:', userId);

    const user = await User.findOne({ clerkUserId: userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const gatewayAvailable = Boolean(razorpay);

    const billingHistory = {
      currentSubscription: null,
      nextPayment: null,
      paymentHistory: [],
      subscriptionCount: 0,
      totalSpent: 0,
      warnings: gatewayAvailable ? [] : ['Payment gateway not configured; showing local records only.']
    };

    // Use local subscription data as a fallback for display when gateway is unavailable
    const populateLocalSubscription = () => {
      const planConfig = SUBSCRIPTION_PLANS[user.subscription.plan] || SUBSCRIPTION_PLANS.free;
      billingHistory.currentSubscription = {
        id: user.subscription.razorpaySubscriptionId || 'local-only',
        plan: planConfig.name,
        amount: planConfig.price,
        status: user.subscription.status,
        startDate: user.subscription.subscriptionStartDate,
        currentPeriodStart: user.subscription.subscriptionStartDate,
        currentPeriodEnd: user.subscription.subscriptionEndDate,
        endDate: user.subscription.subscriptionEndDate,
        chargeAt: user.subscription.subscriptionEndDate,
        totalCount: null,
        paidCount: null,
        remainingCount: null
      };

      if (user.subscription.subscriptionEndDate) {
        billingHistory.nextPayment = {
          date: new Date(user.subscription.subscriptionEndDate),
          amount: planConfig.price,
          plan: planConfig.name
        };
      }
    };

    // If no gateway configured, skip remote calls but return local invoices + subscription snapshot
    if (!gatewayAvailable) {
      populateLocalSubscription();

      const localInvoices = await Invoice.find({ userId: { $eq: userId } })
        .sort({ createdAt: -1 })
        .limit(50);

      const successfulPayments = billingHistory.paymentHistory.filter(
        p => p.status === 'captured' || p.status === 'authorized'
      ).length;

      return res.json({
        ...billingHistory,
        successfulPayments,
        localInvoices: localInvoices.map(inv => ({
          invoiceNumber: inv.invoiceNumber,
          type: inv.type,
          amount: inv.amount,
          status: inv.status,
          createdAt: inv.createdAt,
          description: inv.description,
          razorpayPaymentId: inv.razorpayPaymentId
        }))
      });
    }

    // Get current subscription details
    if (user.subscription.razorpaySubscriptionId) {
      try {
        const subscription = await razorpay.subscriptions.fetch(
          user.subscription.razorpaySubscriptionId
        );

        const currentPlan = SUBSCRIPTION_PLANS[user.subscription.plan] || SUBSCRIPTION_PLANS.free;

        billingHistory.currentSubscription = {
          id: subscription.id,
          plan: currentPlan.name,
          amount: currentPlan.price,
          status: subscription.status,
          startDate: new Date(subscription.start_at * 1000),
          currentPeriodStart: subscription.current_start ? new Date(subscription.current_start * 1000) : null,
          currentPeriodEnd: subscription.current_end ? new Date(subscription.current_end * 1000) : null,
          endDate: subscription.end_at ? new Date(subscription.end_at * 1000) : null,
          chargeAt: subscription.charge_at ? new Date(subscription.charge_at * 1000) : null,
          totalCount: subscription.total_count,
          paidCount: subscription.paid_count,
          remainingCount: subscription.remaining_count
        };

        // Calculate subscription count (how many times renewed)
        billingHistory.subscriptionCount = subscription.paid_count || 0;

        // Next payment info
        if (subscription.status === 'active' && subscription.charge_at) {
          billingHistory.nextPayment = {
            date: new Date(subscription.charge_at * 1000),
            amount: currentPlan.price,
            plan: currentPlan.name
          };
        }
      } catch (subError) {
        console.error('⚠️  Failed to fetch subscription:', subError.message);
      }
    }

    // Fetch payment history from Razorpay
    // Prefer fetching by Customer ID to get full history across all subscriptions
    if (user.subscription.razorpayCustomerId || user.subscription.razorpaySubscriptionId) {
      try {
        let payments;

        if (user.subscription.razorpayCustomerId) {
          console.log(`🔍 Fetching payments for Customer ID: ${user.subscription.razorpayCustomerId}`);
          payments = await razorpay.payments.all({
            'customer_id': user.subscription.razorpayCustomerId,
            count: 100
          });
        } else {
          console.log(`🔍 Fetching payments for Subscription ID: ${user.subscription.razorpaySubscriptionId}`);
          payments = await razorpay.payments.all({
            subscription_id: user.subscription.razorpaySubscriptionId,
            count: 100
          });
        }

        if (payments.items && payments.items.length > 0) {
          console.log(`🔍 Raw payments from Razorpay: ${payments.items.length}`);
          payments.items.forEach(p => console.log(`  - ${p.id} (${p.status}) Sub: ${p.subscription_id} Cust: ${p.customer_id}`));

          // SAFETY FILTER: Ensure payments actually belong to this user
          const filteredPayments = payments.items.filter(p => {
            // 1. Match by Customer ID (Strongest link for full history)
            if (user.subscription.razorpayCustomerId && p.customer_id === user.subscription.razorpayCustomerId) {
              return true;
            }

            // 2. Match by Subscription ID (Current)
            if (p.subscription_id && p.subscription_id === user.subscription.razorpaySubscriptionId) {
              return true;
            }

            // 3. Match by User ID in notes (Secondary link)
            if (p.notes && p.notes.userId === userId) {
              return true;
            }

            // 4. Match by Email in notes (Fallback)
            if (p.notes && p.notes.email === user.email) {
              return true;
            }

            return false;
          });

          console.log(`🔍 Filtered payments: ${filteredPayments.length}`);

          if (filteredPayments.length !== payments.items.length) {
            console.warn(`⚠️  Razorpay returned ${payments.items.length} payments, but only ${filteredPayments.length} match subscription ${user.subscription.razorpaySubscriptionId}`);
          }

          billingHistory.paymentHistory = filteredPayments.map(payment => ({
            id: payment.id,
            amount: payment.amount / 100, // Convert paise to rupees
            currency: payment.currency,
            status: payment.status,
            method: payment.method,
            createdAt: new Date(payment.created_at * 1000),
            description: payment.description || `${billingHistory.currentSubscription?.plan || 'Subscription'} plan payment`,
            invoiceId: payment.invoice_id,
            refunded: payment.refund_status === 'full' || payment.refund_status === 'partial',
            refundStatus: payment.refund_status
          }));

          // Calculate total spent (only successful payments)
          billingHistory.totalSpent = filteredPayments
            .filter(p => p.status === 'captured' || p.status === 'authorized')
            .reduce((sum, p) => sum + (p.amount / 100), 0);
        }
      } catch (paymentError) {
        console.error('⚠️  Failed to fetch payments:', paymentError.message);
      }
    }

    // Get local invoices (for refunds and other records)
    const localInvoices = await Invoice.find({ userId: { $eq: userId } })
      .sort({ createdAt: -1 })
      .limit(50);

    // Calculate successful payments count
    const successfulPayments = billingHistory.paymentHistory.filter(
      p => p.status === 'captured' || p.status === 'authorized'
    ).length;

    console.log('✓ Billing history compiled');
    console.log('  Subscription count:', billingHistory.subscriptionCount);
    console.log('  Payment history items:', billingHistory.paymentHistory.length);
    console.log('  Successful payments:', successfulPayments);
    console.log('  Total spent: ₹', billingHistory.totalSpent);

    res.json({
      ...billingHistory,
      successfulPayments,
      localInvoices: localInvoices.map(inv => ({
        invoiceNumber: inv.invoiceNumber,
        type: inv.type,
        amount: inv.amount,
        status: inv.status,
        createdAt: inv.createdAt,
        description: inv.description,
        razorpayPaymentId: inv.razorpayPaymentId
      }))
    });
  } catch (error) {
    console.error('❌ Get billing history error:', error);
    res.status(500).json({
      error: 'Failed to fetch billing history',
      details: error.message
    });
  }
};

// @desc    Verify subscription status with Razorpay and sync DB
// @route   POST /api/subscriptions/verify-status
// @access  Protected (Admin or user themselves)
export const verifySubscriptionStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] 🔍 Manual subscription verification requested`);
    console.log(`[${timestamp}]   User ID:`, userId);

    const user = await User.findOne({ clerkUserId: userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.subscription.razorpaySubscriptionId) {
      return res.status(404).json({ error: 'No active subscription found to verify' });
    }

    console.log(`[${timestamp}]   DB status:`, user.subscription.status);

    // Fetch actual subscription from Razorpay
    let subscription;
    try {
      subscription = await razorpay.subscriptions.fetch(user.subscription.razorpaySubscriptionId);
    } catch (rzpError) {
      console.error(`[${timestamp}] ❌ Razorpay fetch failed:`, rzpError.message);
      return res.status(502).json({ error: 'Failed to fetch status from payment gateway' });
    }

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

    const razorpayStatus = subscription.status;
    const expectedStatus = statusMap[razorpayStatus] || user.subscription.status;
    const dbStatus = user.subscription.status;

    const changes = [];
    let updated = false;

    // Check and update status
    if (dbStatus !== expectedStatus) {
      user.subscription.status = expectedStatus;
      user.subscription.lastStatusChange = new Date();
      changes.push(`status: ${dbStatus} → ${expectedStatus}`);
      updated = true;
    }

    // Update dates if available
    if (subscription.current_end) {
      const newBillingDate = new Date(subscription.current_end * 1000);
      if (!user.subscription.nextBillingDate ||
        user.subscription.nextBillingDate.getTime() !== newBillingDate.getTime()) {
        user.subscription.nextBillingDate = newBillingDate;
        changes.push(`nextBillingDate updated to ${newBillingDate.toISOString()}`);
        updated = true;
      }
    }

    if (subscription.end_at && subscription.end_at > 0) {
      const newEndDate = new Date(subscription.end_at * 1000);
      if (!user.subscription.subscriptionEndDate ||
        user.subscription.subscriptionEndDate.getTime() !== newEndDate.getTime()) {
        user.subscription.subscriptionEndDate = newEndDate;
        changes.push(`subscriptionEndDate updated to ${newEndDate.toISOString()}`);
        updated = true;
      }
    }

    // Save if changes were made
    if (updated) {
      await user.save();
      console.log(`[${timestamp}] ✅ Database updated with ${changes.length} change(s)`);
      changes.forEach(change => console.log(`[${timestamp}]   - ${change}`));
    } else {
      console.log(`[${timestamp}] ✓ No changes needed - DB already in sync`);
    }

    res.json({
      message: updated ? 'Subscription synced successfully' : 'Already in sync',
      updated,
      changes,
      razorpayData: {
        id: subscription.id,
        status: subscription.status,
        plan_id: subscription.plan_id,
        customer_id: subscription.customer_id,
        start_at: subscription.start_at ? new Date(subscription.start_at * 1000) : null,
        end_at: subscription.end_at ? new Date(subscription.end_at * 1000) : null,
        current_end: subscription.current_end ? new Date(subscription.current_end * 1000) : null,
        total_count: subscription.total_count,
        paid_count: subscription.paid_count,
        remaining_count: subscription.remaining_count
      },
      currentDbData: {
        plan: user.subscription.plan,
        status: user.subscription.status,
        subscriptionStartDate: user.subscription.subscriptionStartDate,
        subscriptionEndDate: user.subscription.subscriptionEndDate,
        nextBillingDate: user.subscription.nextBillingDate,
        lastStatusChange: user.subscription.lastStatusChange
      }
    });
  } catch (error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ Verify subscription error:`, error);
    res.status(500).json({
      error: 'Failed to verify subscription',
      details: error.message
    });
  }
};



// @desc    Upgrade or downgrade subscription
// @route   POST /api/subscriptions/change-plan
// @access  Protected
export const changePlan = async (req, res) => {
  try {
    if (!ensureRazorpay(res, 'plan change')) return;

    const userId = req.userId;
    const { newPlan } = req.body; // 'pro' or 'studio'

    console.log(`🔄 Processing plan change to ${newPlan} for user: ${userId}`);

    if (!['pro', 'studio'].includes(newPlan)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const user = await User.findOne({ clerkUserId: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentPlan = SUBSCRIPTION_PLANS[user.subscription.plan] || SUBSCRIPTION_PLANS.free;
    const targetPlan = SUBSCRIPTION_PLANS[newPlan];

    // Check if user already has this plan
    if (user.subscription.plan === newPlan) {
      return res.status(400).json({ error: 'You are already on this plan' });
    }

    const isUpgrade = targetPlan.price > currentPlan.price;
    const isDowngrade = targetPlan.price < currentPlan.price;

    // Get Clerk user for invoice
    const clerkUser = await clerkClient.users.getUser(userId);
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress;
    const userName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User';

    // CASE 1: Upgrade from free (no active Razorpay subscription)
    if (currentPlan.id === 'free') {
      const customerId = await ensureRazorpayCustomer(user, userEmail, userName);

      const options = {
        plan_id: targetPlan.razorpayPlanId,
        customer_id: customerId,
        total_count: 12, // 12 monthly cycles
        customer_notify: 1,
        notes: {
          userId: user._id.toString(),
          clerkUserId: userId,
          email: userEmail,
          plan: newPlan
        }
      };

      const subscription = await razorpay.subscriptions.create(options);

      user.subscription.plan = newPlan;
      user.subscription.status = 'created';
      user.subscription.razorpaySubscriptionId = subscription.id;
      user.subscription.razorpayCustomerId = customerId;
      await user.save();

      return res.json({
        success: true,
        message: 'Please complete payment to activate your subscription',
        subscription: {
          id: subscription.id,
          shortUrl: subscription.short_url,
          status: subscription.status
        },
        redirectUrl: subscription.short_url
      });
    }

    // CASE 2: Upgrade/Downgrade with existing subscription
    if (!user.subscription.razorpaySubscriptionId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Fetch current subscription from Razorpay
    const currentSubscription = await razorpay.subscriptions.fetch(
      user.subscription.razorpaySubscriptionId
    );

    if (currentSubscription.status !== 'active') {
      return res.status(400).json({
        error: 'Can only change plans for active subscriptions'
      });
    }

    // Calculate proration
    const now = Date.now();
    const periodStart = currentSubscription.current_start * 1000;
    const periodEnd = currentSubscription.current_end * 1000;
    const totalDays = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24));
    const usedDays = Math.ceil((now - periodStart) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.max(0, totalDays - usedDays);

    const proratedRefund = (currentPlan.price / totalDays) * remainingDays;
    const proratedCharge = (targetPlan.price / totalDays) * remainingDays;
    const amountDifference = proratedCharge - proratedRefund;

    console.log(`💰 Proration calculation:`);
    console.log(`   Total days: ${totalDays}, Used: ${usedDays}, Remaining: ${remainingDays}`);
    console.log(`   Current plan refund: ₹${proratedRefund.toFixed(2)}`);
    console.log(`   New plan charge: ₹${proratedCharge.toFixed(2)}`);
    console.log(`   Amount difference: ₹${amountDifference.toFixed(2)}`);

    if (isUpgrade) {
      // UPGRADE: Charge prorated difference immediately, upgrade plan now
      // Calculate: (Studio price - Pro price) * (remaining days / total days)

      console.log(`⬆️ UPGRADE: ${currentPlan.name} → ${targetPlan.name}`);
      console.log(`   Prorated charge for ${remainingDays} remaining days: ₹${amountDifference.toFixed(2)}`);

      // Create payment order for the difference amount
      if (amountDifference > 0) {
        // Create Razorpay order for immediate payment
        const proratedAmount = Math.round(amountDifference * 100); // Convert to paise

        const order = await razorpay.orders.create({
          amount: proratedAmount,
          currency: targetPlan.currency,
          receipt: `upgrade_${userId}_${Date.now()}`,
          notes: {
            userId: user._id.toString(),
            clerkUserId: userId,
            email: userEmail,
            type: 'upgrade',
            fromPlan: currentPlan.id,
            toPlan: newPlan,
            remainingDays,
            totalDays
          }
        });

        console.log(`💳 Created payment order: ${order.id} for ₹${amountDifference.toFixed(2)}`);

        // Store pending upgrade info
        user.subscription.pendingUpgrade = {
          targetPlan: newPlan,
          orderId: order.id,
          amount: amountDifference,
          remainingDays,
          totalDays,
          createdAt: new Date()
        };
        await user.save();

        // Return order details for frontend to process payment
        return res.json({
          success: true,
          requiresPayment: true,
          orderId: order.id,
          amount: amountDifference,
          currency: targetPlan.currency,
          description: `Upgrade to ${targetPlan.name} - Prorated charge for ${remainingDays} days`,
          message: `Please complete payment of ₹${amountDifference.toFixed(2)} to upgrade immediately to ${targetPlan.name}`
        });
      }

      // If no charge needed (shouldn't happen in upgrade, but handle it)
      user.subscription.plan = newPlan;
      user.subscription.status = 'active';
      user.subscription.lastStatusChange = new Date();
      await user.save();

      return res.json({
        success: true,
        message: `Successfully upgraded to ${targetPlan.name}`,
        subscription: {
          plan: newPlan,
          status: 'active'
        }
      });

    } else if (isDowngrade) {
      // DOWNGRADE: Schedule for end of billing period, NO immediate charge
      // User keeps current plan until subscription ends, then charged lower price

      console.log(`⬇️ DOWNGRADE: ${currentPlan.name} → ${targetPlan.name}`);
      console.log(`   Will take effect at end of billing period: ${new Date(periodEnd).toLocaleDateString()}`);
      console.log(`   No immediate refund - user keeps access to ${currentPlan.name} until then`);
      console.log(`   Next billing: ₹${targetPlan.price} (${targetPlan.name} plan rate)`);

      // Mark subscription as scheduled for downgrade
      user.subscription.status = 'scheduled_downgrade';
      user.subscription.scheduledPlan = newPlan;
      user.subscription.scheduledChangeDate = new Date(periodEnd);
      user.subscription.lastStatusChange = new Date();

      await user.save();

      console.log(`✅ Downgrade scheduled for ${new Date(periodEnd).toLocaleDateString()}`);

      // Create invoice record for the scheduled downgrade
      const downgradeInvoice = new Invoice({
        invoiceNumber: `INV-${Date.now()}-DOWNGRADE`,
        userId: userId,
        userEmail,
        userName,
        type: 'downgrade_scheduled',
        amount: 0, // No charge now
        status: 'pending',
        description: `Scheduled downgrade from ${currentPlan.name} to ${targetPlan.name}`,
        metadata: {
          oldPlan: currentPlan.id,
          newPlan: newPlan,
          scheduledFor: new Date(periodEnd),
          remainingDays,
          totalDays,
          nextBillingAmount: targetPlan.price
        }
      });

      await downgradeInvoice.save();

      return res.json({
        success: true,
        message: `Downgrade scheduled successfully`,
        subscription: {
          currentPlan: currentPlan.id,
          scheduledPlan: newPlan,
          status: 'scheduled_downgrade',
          effectiveDate: new Date(periodEnd),
          daysRemaining: remainingDays
        },
        accessInfo: {
          message: `You will keep access to ${currentPlan.name} plan until ${new Date(periodEnd).toLocaleDateString()}`,
          nextBillingDate: new Date(periodEnd),
          nextBillingAmount: targetPlan.price,
          nextBillingPlan: targetPlan.name
        }
      });
    }

  } catch (error) {
    console.error('❌ Change plan error:', error);
    res.status(500).json({
      error: 'Failed to change plan',
      details: error.message
    });
  }
};

// @desc    Verify upgrade payment
// @route   POST /api/subscriptions/verify-upgrade
// @access  Protected
export const verifyUpgradePayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    const userId = req.userId;

    console.log(`✅ Verifying upgrade payment for user: ${userId}`);

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const user = await User.findOne({ clerkUserId: userId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Retrieve pending upgrade info
    const pendingUpgrade = user.subscription.pendingUpgrade;
    if (!pendingUpgrade || pendingUpgrade.orderId !== razorpay_order_id) {
      return res.status(400).json({ error: 'No matching pending upgrade found' });
    }

    const targetPlan = SUBSCRIPTION_PLANS[pendingUpgrade.targetPlan];

    // Update subscription on Razorpay to new plan
    // We do this AFTER payment is verified
    await razorpay.subscriptions.update(user.subscription.razorpaySubscriptionId, {
      plan_id: targetPlan.razorpayPlanId,
      schedule_change_at: 'now',
      customer_notify: 1
    });

    // Update local user state
    user.subscription.plan = pendingUpgrade.targetPlan;
    user.subscription.status = 'active';
    user.subscription.lastStatusChange = new Date();
    user.subscription.pendingUpgrade = undefined; // Clear pending upgrade
    await user.save();

    // Create Invoice for the upgrade payment
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    const Invoice = await import('../models/Invoice.js').then(m => m.default);
    await Invoice.create({
      userId: userId,
      invoiceNumber: `INV-UPG-${Date.now().toString().slice(-6)}`,
      subscriptionId: user.subscription.razorpaySubscriptionId,
      planId: targetPlan.id,
      planName: targetPlan.name,
      amount: payment.amount / 100,
      currency: payment.currency,
      type: 'upgrade',
      status: 'paid',
      razorpayPaymentId: razorpay_payment_id,
      description: `Upgrade to ${targetPlan.name} Plan`,
      pdfGenerated: false,
      metadata: {
        prorated: true,
        userEmail: user.email,
        userName: user.name
      }
    });

    res.json({
      success: true,
      message: `Successfully upgraded to ${targetPlan.name}!`
    });

  } catch (error) {
    console.error('Verify upgrade error:', error);
    res.status(500).json({ error: 'Failed to verify upgrade payment' });
  }
};

// @desc    Get invoice PDF URL from Razorpay
// @route   GET /api/subscriptions/invoices/:invoiceId/download
// @access  Protected
export const getInvoicePdf = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const user = await User.findOne({ clerkUserId: userId });
    if (!user || !user.subscription.razorpayCustomerId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch invoice from Razorpay
    const invoice = await razorpay.invoices.fetch(invoiceId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Security check: Ensure invoice belongs to the user
    // We check against customer_id. 
    // Note: If user changed accounts or something, this might mismatch, but for security it's best.
    if (invoice.customer_id !== user.subscription.razorpayCustomerId) {
      console.warn(`⚠️ Invoice ${invoiceId} customer ${invoice.customer_id} does not match user ${user.subscription.razorpayCustomerId}`);
      return res.status(403).json({ error: 'Access denied to this invoice' });
    }

    // Return the short_url (hosted invoice page)
    res.json({ url: invoice.short_url });

  } catch (error) {
    console.error('❌ Get invoice PDF error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
};

// Export plans for use in other controllers
export { SUBSCRIPTION_PLANS };
