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

const router = express.Router();

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
