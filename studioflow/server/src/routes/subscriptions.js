import express from 'express';
import {
  getCurrentSubscription,
  createSubscription,
  verifyPayment,
  cancelSubscription,
  upgradeSubscription,
  reactivateSubscription,
  handleWebhook
} from '../controllers/subscriptionController.js';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
import User from '../models/User.js';

const router = express.Router();

// Debug endpoint to manually check subscription status
router.get('/debug/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ clerkUserId: req.params.userId });
    if (!user) {
      return res.json({ error: 'User not found' });
    }
    res.json({
      clerkUserId: user.clerkUserId,
      email: user.email,
      subscription: user.subscription,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual fix endpoint to restore subscription (temporary for debugging)
router.post('/fix/:userId', async (req, res) => {
  try {
    const { plan } = req.body; // 'pro' or 'studio'
    const user = await User.findOne({ clerkUserId: req.params.userId });
    
    if (!user) {
      return res.json({ error: 'User not found' });
    }

    // Set subscription end date to 30 days from now
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    user.subscription.plan = plan || 'pro';
    user.subscription.status = 'active';
    user.subscription.subscriptionStartDate = new Date();
    user.subscription.subscriptionEndDate = endDate;
    user.subscription.autoRenew = true;
    
    await user.save();
    
    res.json({
      message: 'Subscription fixed',
      subscription: user.subscription
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Protected routes
router.get('/current', verifyClerk, getCurrentSubscription);
router.post('/create', verifyClerk, createSubscription);
router.post('/verify', verifyClerk, verifyPayment);
router.post('/cancel', verifyClerk, cancelSubscription);
router.post('/upgrade', verifyClerk, upgradeSubscription);
router.post('/reactivate', verifyClerk, reactivateSubscription);

// Webhook route (no auth required, but signature verified)
router.post('/webhook', express.json({ verify: (req, res, buf) => { req.rawBody = buf } }), handleWebhook);

export default router;
