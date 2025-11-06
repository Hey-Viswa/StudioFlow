// server/src/middlewares/subscriptionLimits.js
import User from '../models/User.js';
import Project from '../models/Project.js';

/**
 * Middleware to check if user has reached their project creation limit
 * Free tier: 5 projects max
 * Pro tier: 50 projects max
 * Studio tier: 100 projects max
 */
export async function checkProjectLimit(req, res, next) {
  try {
    // Get user's subscription details - only select needed fields
    let user = await User.findOne({ clerkUserId: req.userId })
      .select('clerkUserId subscription')
      .lean();
    
    // If user doesn't exist, create them with default free plan
    if (!user) {
      console.log('Creating new user with free plan:', req.userId);
      user = await User.create({
        clerkUserId: req.userId,
        email: req.userEmail || '',
        name: req.userName || '',
        subscription: {
          plan: 'free',
          status: 'active'
        }
      });
    }

    // Count active projects (not deleted) - efficient countDocuments
    const projectCount = await Project.countDocuments({ 
      ownerId: req.userId,
      deletedAt: null 
    });

    // Define limits based on plan
    const limits = {
      free: 5,
      pro: 50,
      studio: 100
    };

    const userPlan = user.subscription.plan || 'free';
    const limit = limits[userPlan];

    // Check if user has reached their limit
    if (projectCount >= limit) {
      const upgradeMessages = {
        free: 'Free plan is limited to 5 projects. Upgrade to Pro (50 projects) or Studio (100 projects) for more.',
        pro: 'Pro plan is limited to 50 projects. Upgrade to Studio for 100 projects.',
        studio: 'Studio plan is limited to 100 projects. You have reached the maximum limit.'
      };

      return res.status(403).json({ 
        error: 'Project limit reached',
        message: upgradeMessages[userPlan],
        currentCount: projectCount,
        limit: limit,
        upgradeUrl: '/dashboard/subscription',
        plans: {
          pro: {
            name: 'Pro',
            price: '₹799/month',
            projects: '50 projects'
          },
          studio: {
            name: 'Studio',
            price: '₹1999/month',
            projects: '100 projects'
          }
        }
      });
    }
    
    // User is within their limit - allow through
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
    // Only select subscription field
    let user = await User.findOne({ clerkUserId: req.userId })
      .select('clerkUserId subscription')
      .lean();
    
    // If user doesn't exist, create them with default free plan
    if (!user) {
      user = await User.create({
        clerkUserId: req.userId,
        email: req.userEmail || '',
        name: req.userName || '',
        subscription: {
          plan: 'free',
          status: 'active'
        }
      });
    }

    // Efficient count query
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
