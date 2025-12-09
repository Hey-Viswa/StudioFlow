import express from 'express';
import { 
    createOrder, 
    verifyPayment, 
    getSubscriptionStatus,
    cancelSubscription,
    handleRazorpayWebhook
} from '../controllers/paymentController.js';
import { verifyClerkToken } from '../middlewares/verifyClerkJWKS.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Razorpay webhook - no auth required (verified via signature)
router.post('/razorpay-webhook', express.raw({ type: 'application/json' }), handleRazorpayWebhook);

router.use(rateLimiter);

// All other payment routes require authentication
router.post('/create-order', verifyClerkToken, createOrder);
router.post('/verify-payment', verifyClerkToken, verifyPayment);
router.get('/subscription-status', verifyClerkToken, getSubscriptionStatus);
router.post('/cancel-subscription', verifyClerkToken, cancelSubscription);

export default router;
