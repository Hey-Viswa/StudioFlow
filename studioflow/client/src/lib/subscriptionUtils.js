/**
 * Subscription utility functions for checking feature access
 */

/**
 * Check if subscription has active access to paid features
 * @param {Object} subscription - Subscription object from API
 * @returns {boolean} - True if user has active paid access
 */
export const hasActivePaidAccess = (subscription) => {
  if (!subscription) return false;
  
  const { plan, status } = subscription;
  
  // Free plan never has paid access
  if (plan === 'free') return false;
  
  // Check if status allows access
  // Active statuses: 'active', 'pending', 'created'
  // Cancelled still has access until end date expires
  const accessStatuses = ['active', 'pending', 'created', 'cancelled'];
  
  return accessStatuses.includes(status);
};

/**
 * Check if user can create new projects
 * @param {Object} subscription - Subscription object from API
 * @returns {boolean} - True if user can create projects
 */
export const canCreateProject = (subscription) => {
  if (!subscription || !subscription.usage) return true; // Allow if no subscription data
  
  const { projectCount, maxProjects } = subscription.usage;
  
  // Check if under limit
  if (projectCount >= maxProjects) {
    return false;
  }
  
  // If paid plan, also check if access is active
  if (subscription.plan !== 'free') {
    return hasActivePaidAccess(subscription);
  }
  
  return true;
};

/**
 * Get user-friendly status message
 * @param {Object} subscription - Subscription object from API
 * @returns {string} - Status message
 */
export const getSubscriptionStatusMessage = (subscription) => {
  if (!subscription) return 'Loading...';
  
  const { status, plan, subscriptionEndDate } = subscription;
  
  switch (status) {
    case 'active':
      return plan === 'free' ? 'Free Plan' : `${capitalize(plan)} Plan - Active`;
    
    case 'cancelled':
      if (subscriptionEndDate) {
        const endDate = new Date(subscriptionEndDate);
        const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
        
        if (daysLeft > 0) {
          return `${capitalize(plan)} Plan - Cancelled (${daysLeft} days remaining)`;
        }
      }
      return 'Subscription Cancelled';
    
    case 'expired':
      return 'Subscription Expired';
    
    case 'pending':
      return 'Payment Pending';
    
    case 'payment_failed':
      return 'Payment Failed - Please Update Payment Method';
    
    case 'paused':
      return 'Subscription Paused';
    
    case 'inactive':
      return 'Subscription Inactive';
    
    default:
      return capitalize(status);
  }
};

/**
 * Get status badge variant based on subscription status
 * @param {string} status - Subscription status
 * @returns {string} - Badge variant
 */
export const getStatusBadgeVariant = (status) => {
  switch (status) {
    case 'active':
      return 'default';
    case 'cancelled':
      return 'secondary';
    case 'expired':
    case 'payment_failed':
      return 'destructive';
    case 'pending':
    case 'created':
      return 'outline';
    case 'paused':
    case 'inactive':
      return 'secondary';
    default:
      return 'outline';
  }
};

/**
 * Check if user should see upgrade prompts
 * @param {Object} subscription - Subscription object from API
 * @returns {boolean} - True if should show upgrade prompts
 */
export const shouldShowUpgradePrompt = (subscription) => {
  if (!subscription) return false;
  
  const { plan, status } = subscription;
  
  // Show upgrade for free users
  if (plan === 'free') return true;
  
  // Show upgrade for expired/cancelled subscriptions
  if (status === 'expired' || status === 'cancelled') {
    // Check if access has actually expired
    if (subscription.subscriptionEndDate) {
      const endDate = new Date(subscription.subscriptionEndDate);
      return endDate < new Date();
    }
    return true;
  }
  
  // Show for payment failed
  if (status === 'payment_failed') return true;
  
  return false;
};

/**
 * Check if specific feature is accessible
 * @param {Object} subscription - Subscription object from API
 * @param {string} feature - Feature name to check
 * @returns {boolean} - True if feature is accessible
 */
export const hasFeatureAccess = (subscription, feature) => {
  if (!subscription || !subscription.features) return false;
  
  // If subscription is not active, check if it's cancelled but still has time
  if (!hasActivePaidAccess(subscription)) {
    return false;
  }
  
  return subscription.features[feature] === true;
};

/**
 * Get days remaining in subscription
 * @param {Object} subscription - Subscription object from API
 * @returns {number|null} - Days remaining or null
 */
export const getDaysRemaining = (subscription) => {
  if (!subscription || !subscription.subscriptionEndDate) return null;
  
  const endDate = new Date(subscription.subscriptionEndDate);
  const now = new Date();
  const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
  
  return daysLeft > 0 ? daysLeft : 0;
};

/**
 * Check if subscription needs attention (payment failed, expiring soon, etc.)
 * @param {Object} subscription - Subscription object from API
 * @returns {Object} - { needsAttention: boolean, reason: string }
 */
export const checkSubscriptionHealth = (subscription) => {
  if (!subscription) {
    return { needsAttention: false, reason: null };
  }
  
  const { status, plan } = subscription;
  
  // Payment failed
  if (status === 'payment_failed') {
    return { 
      needsAttention: true, 
      reason: 'Payment failed. Please update your payment method.',
      severity: 'error'
    };
  }
  
  // Expiring soon (cancelled but still has access)
  if (status === 'cancelled' && plan !== 'free') {
    const daysLeft = getDaysRemaining(subscription);
    if (daysLeft !== null && daysLeft <= 7 && daysLeft > 0) {
      return { 
        needsAttention: true, 
        reason: `Your ${plan} plan expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Reactivate to keep access.`,
        severity: 'warning'
      };
    }
  }
  
  // Expired
  if (status === 'expired') {
    return { 
      needsAttention: true, 
      reason: 'Your subscription has expired. Upgrade to regain access.',
      severity: 'error'
    };
  }
  
  return { needsAttention: false, reason: null };
};

// Helper function
const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};
