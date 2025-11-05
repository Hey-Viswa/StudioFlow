// server/src/middlewares/subscriptionLimits.js
import User from '../models/User.js';
import Project from '../models/Project.js';

/**
 * Middleware to check if user has reached their project creation limit
 * Free tier: 5 projects max
 * Pro/Studio tiers: Unlimited projects
 */
export async function checkProjectLimit(req, res, next) {
  try {
    // Get user's subscription details
    let user = await User.findOne({ clerkUserId: req.userId });
    
    // If user doesn't exist, create them with default free plan
    if (!user) {
      console.log('Creating new user with free plan:', req.userId);
      user = await User.create({
        clerkUserId: req.userId,
        email: req.email || '',
        name: req.name || '',
        subscription: {
          plan: 'free',
          status: 'active'
        }
      });
    }

    // Only check limits for free plan
    if (user.subscription.plan === 'free') {
      // Count active projects (not deleted)
      const projectCount = await Project.countDocuments({ 
        ownerId: req.userId,
        deletedAt: null 
      });
      
      // Free tier limit: 5 projects
      if (projectCount >= 5) {
        return res.status(403).json({ 
          error: 'Project limit reached',
          message: 'Free plan is limited to 5 projects. Upgrade to Pro or Studio for unlimited projects.',
          currentCount: projectCount,
          limit: 5,
          upgradeUrl: '/dashboard/subscription',
          plans: {
            pro: {
              name: 'Pro',
              price: '₹799/month',
              projects: 'Unlimited'
            },
            studio: {
              name: 'Studio',
              price: '₹1999/month',
              projects: 'Unlimited'
            }
          }
        });
      }
    }
    
    // Pro and Studio plans have unlimited projects - allow through
    next();
  } catch (error) {
    console.error('Error checking project limit:', error);
    return res.status(500).json({ 
      error: 'Failed to check project limit',
      message: error.message 
    });
  }
}

/**
 * Get current project usage and limits for a user
 */
export async function getProjectUsage(req, res) {
  try {
    let user = await User.findOne({ clerkUserId: req.userId });
    
    // If user doesn't exist, create them with default free plan
    if (!user) {
      user = await User.create({
        clerkUserId: req.userId,
        email: req.email || '',
        name: req.name || '',
        subscription: {
          plan: 'free',
          status: 'active'
        }
      });
    }

    const projectCount = await Project.countDocuments({ 
      ownerId: req.userId,
      deletedAt: null 
    });

    const planLimits = {
      free: { limit: 5, unlimited: false },
      pro: { limit: null, unlimited: true },
      studio: { limit: null, unlimited: true }
    };

  const currentPlan = user.subscription.plan || 'free';
    const limits = planLimits[currentPlan];

    return res.json({
      plan: currentPlan,
      currentProjects: projectCount,
      limit: limits.limit,
      unlimited: limits.unlimited,
      canCreateMore: limits.unlimited || projectCount < limits.limit,
      remaining: limits.unlimited ? null : Math.max(0, limits.limit - projectCount)
    });
  } catch (error) {
    console.error('Error getting project usage:', error);
    return res.status(500).json({ 
      error: 'Failed to get project usage',
      message: error.message 
    });
  }
}
