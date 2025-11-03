import express from 'express';
import { 
    createOrder, 
    verifyPayment, 
    getSubscriptionStatus,
    cancelSubscription 
} from '../controllers/paymentController.js';
import { verifyClerkToken } from '../middlewares/verifyClerkJWKS.js';

const router = express.Router();

// All payment routes require authentication
router.post('/create-order', verifyClerkToken, createOrder);
router.post('/verify-payment', verifyClerkToken, verifyPayment);
router.get('/subscription-status', verifyClerkToken, getSubscriptionStatus);
router.post('/cancel-subscription', verifyClerkToken, cancelSubscription);

export default router;
