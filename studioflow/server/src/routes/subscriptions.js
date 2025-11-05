import express from 'express';
import {
  getCurrentSubscription,
  createSubscription,
  verifyPayment,
  cancelSubscription,
  handleWebhook
} from '../controllers/subscriptionController.js';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';

const router = express.Router();

// Protected routes
router.get('/current', verifyClerk, getCurrentSubscription);
router.post('/create', verifyClerk, createSubscription);
router.post('/verify', verifyClerk, verifyPayment);
router.post('/cancel', verifyClerk, cancelSubscription);

// Webhook route (no auth required, but signature verified)
router.post('/webhook', express.json({ verify: (req, res, buf) => { req.rawBody = buf } }), handleWebhook);

export default router;
