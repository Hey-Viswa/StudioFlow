// Subscription Helper Functions
import User from '../models/User.js';
import Invoice from '../models/Invoice.js';

/**
 * Check if user is currently in trial period
 * @param {Object} user - User document from database
 * @returns {boolean} - True if trial is active
 */
export function isTrialActive(user) {
  if (!user.subscription.trialStart || !user.subscription.trialEnd) {
    return false;
  }
  
  const now = new Date();
  return now >= user.subscription.trialStart && now <= user.subscription.trialEnd;
}

/**
 * Calculate refund amount for downgrade
 * @param {string} oldPlan - Current plan (e.g., 'studio')
 * @param {string} newPlan - Target plan (e.g., 'pro', 'free')
 * @returns {number} - Refund amount in INR
 */
export function calculateRefund(oldPlan, newPlan) {
  const PLANS = {
    free: 0,
    pro: 100,
    studio: 499
  };
  
  const oldPrice = PLANS[oldPlan] || 0;
  const newPrice = PLANS[newPlan] || 0;
  
  // Special case: Downgrade to free = full refund
  if (newPlan === 'free' && oldPrice > 0) {
    return oldPrice;
  }
  
  // Regular downgrade: refund the difference
  // Studio (499) → Pro (100) = 399 refund
  if (oldPrice > newPrice) {
    return oldPrice - newPrice;
  }
  
  return 0;
}

/**
 * Process downgrade with refund logic
 * @param {Object} user - User document
 * @param {string} newPlan - Target plan to downgrade to
 * @param {Object} razorpay - Razorpay instance
 * @returns {Object} - Result with refund details
 */
export async function processDowngrade(user, newPlan, razorpay) {
  const oldPlan = user.subscription.plan;
  const refundAmount = calculateRefund(oldPlan, newPlan);
  
  // Check if refund already issued in current billing cycle
  if (user.subscription.refundIssued) {
    return {
      success: false,
      error: 'Refund already issued for this billing cycle',
      refundAmount: 0
    };
  }
  
  let refundResult = null;
  
  // Issue refund if amount > 0
  if (refundAmount > 0) {
    refundResult = await issueRefund(user, refundAmount, razorpay, {
      reason: `Downgrade from ${oldPlan} to ${newPlan}`,
      oldPlan,
      newPlan
    });
  }
  
  // Update user subscription
  user.subscription.previousPlan = oldPlan;
  user.subscription.plan = newPlan;
  user.subscription.status = 'active';
  user.subscription.refundIssued = refundAmount > 0;
  user.subscription.lastStatusChange = new Date();
  
  await user.save();
  
  return {
    success: true,
    refundAmount,
    refundResult,
    oldPlan,
    newPlan
  };
}

/**
 * Issue refund via Razorpay
 * @param {Object} user - User document
 * @param {number} amount - Refund amount
 * @param {Object} razorpay - Razorpay instance
 * @param {Object} metadata - Additional metadata
 * @returns {Object} - Refund result
 */
export async function issueRefund(user, amount, razorpay, metadata = {}) {
  try {
    if (!razorpay) {
      throw new Error('Razorpay not initialized');
    }
    
    const paymentId = user.subscription.razorpayPaymentId;
    if (!paymentId) {
      throw new Error('No payment ID found for refund');
    }
    
    // Create refund via Razorpay
    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount * 100, // Convert to paise
      notes: {
        userId: user.clerkUserId,
        reason: metadata.reason || 'Plan downgrade',
        oldPlan: metadata.oldPlan,
        newPlan: metadata.newPlan
      }
    });
    
    // Update user refund tracking
    user.subscription.refundAmount = amount;
    user.subscription.refundDate = new Date();
    await user.save();
    
    // Create refund invoice
    await Invoice.create({
      userId: user.clerkUserId,
      invoiceNumber: `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase(),
      type: 'refund',
      amount: -amount, // Negative for refund
      currency: 'INR',
      status: 'paid',
      description: `Refund: ${metadata.reason || 'Plan downgrade'}`,
      razorpayPaymentId: paymentId,
      razorpayRefundId: refund.id,
      metadata: {
        oldPlan: metadata.oldPlan,
        newPlan: metadata.newPlan,
        refundReason: metadata.reason
      }
    });
    
    console.log(`✅ Refund processed: ₹${amount} for user ${user.clerkUserId}`);
    
    return {
      success: true,
      refundId: refund.id,
      amount,
      status: refund.status
    };
  } catch (error) {
    console.error('❌ Refund error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Start trial period for user
 * @param {Object} user - User document
 * @param {string} plan - Plan with trial (e.g., 'pro', 'studio')
 * @returns {Object} - Updated user with trial dates
 */
export async function startTrial(user, plan) {
  const now = new Date();
  const trialDays = 7; // 7-day trial
  const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
  
  user.subscription.plan = plan;
  user.subscription.status = 'trial';
  user.subscription.trialStart = now;
  user.subscription.trialEnd = trialEnd;
  user.subscription.previousPlan = 'free';
  
  await user.save();
  
  console.log(`✅ Trial started for user ${user.clerkUserId}: ${plan} plan until ${trialEnd.toLocaleDateString()}`);
  
  return {
    success: true,
    trialStart: now,
    trialEnd,
    plan
  };
}

/**
 * End trial and convert to paid or downgrade to free
 * @param {Object} user - User document
 * @param {boolean} convertToPaid - Whether to convert to paid plan
 * @param {Object} razorpay - Razorpay instance
 * @returns {Object} - Result
 */
export async function endTrial(user, convertToPaid = false, razorpay = null) {
  const trialPlan = user.subscription.plan;
  
  if (!convertToPaid) {
    // User cancelled during trial - full refund (no charge)
    user.subscription.plan = 'free';
    user.subscription.status = 'active';
    user.subscription.previousPlan = trialPlan;
    user.subscription.trialStart = null;
    user.subscription.trialEnd = null;
    
    await user.save();
    
    console.log(`✅ Trial ended (cancelled): User ${user.clerkUserId} downgraded to free`);
    
    return {
      success: true,
      refund: 0, // No charge during trial
      plan: 'free'
    };
  }
  
  // Convert to paid subscription
  user.subscription.status = 'active';
  user.subscription.trialStart = null;
  user.subscription.trialEnd = null;
  user.subscription.subscriptionStartDate = new Date();
  
  await user.save();
  
  console.log(`✅ Trial converted to paid: User ${user.clerkUserId} on ${trialPlan} plan`);
  
  return {
    success: true,
    plan: trialPlan,
    status: 'active'
  };
}

/**
 * Apply rate limit based on user's plan
 * @param {Object} user - User document
 * @returns {Object} - Rate limit config
 */
export function applyRateLimit(user) {
  const RATE_LIMITS = {
    free: { maxRequests: 100, burst: 20 },
    pro: { maxRequests: 500, burst: 100 },
    studio: { maxRequests: 2000, burst: 400 }
  };
  
  const plan = user?.subscription?.plan || 'free';
  return RATE_LIMITS[plan] || RATE_LIMITS.free;
}
