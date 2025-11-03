import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../models/User.js';

// Initialize Razorpay instance only if keys are configured
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'your-razorpay-key-id') {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
} else {
    console.warn('⚠️  Razorpay keys not configured. Payment features will be disabled.');
}

// Plan prices in INR (paise - 1 INR = 100 paise)
const PLAN_PRICES = {
    pro: 1000, // ₹10/month
    studio: 2500, // ₹25/month
};

// Create Razorpay order
export const createOrder = async (req, res) => {
    try {
        const { plan } = req.body;
        const userId = req.user?.id || req.user?._id;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not authenticated' 
            });
        }

        if (!plan || !PLAN_PRICES[plan]) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid plan selected' 
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Create Razorpay order
        const options = {
            amount: PLAN_PRICES[plan] * 100, // Convert to paise
            currency: 'INR',
            receipt: `order_${userId}_${Date.now()}`,
            notes: {
                userId: userId.toString(),
                plan,
                email: user.email,
            },
        };

        const order = await razorpay.orders.create(options);

        // Update user's subscription status
        user.subscription.razorpayOrderId = order.id;
        user.subscription.plan = plan;
        user.subscription.status = 'created';
        await user.save();

        res.json({
            success: true,
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
            },
            key: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create order',
            error: error.message 
        });
    }
};

// Verify payment
export const verifyPayment = async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature 
        } = req.body;

        const userId = req.user?.id || req.user?._id;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not authenticated' 
            });
        }

        // Verify signature
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ 
                success: false, 
                message: 'Payment verification failed' 
            });
        }

        // Update user subscription
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Activate subscription for 30 days
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        user.subscription.status = 'active';
        user.subscription.razorpayPaymentId = razorpay_payment_id;
        user.subscription.subscriptionStartDate = startDate;
        user.subscription.subscriptionEndDate = endDate;
        await user.save();

        res.json({
            success: true,
            message: 'Payment verified successfully',
            subscription: {
                plan: user.subscription.plan,
                status: user.subscription.status,
                validUntil: endDate,
            },
        });
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Payment verification failed',
            error: error.message 
        });
    }
};

// Get subscription status
export const getSubscriptionStatus = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not authenticated' 
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Check if subscription is expired
        if (user.subscription.status === 'active' && user.subscription.subscriptionEndDate) {
            if (new Date() > new Date(user.subscription.subscriptionEndDate)) {
                user.subscription.status = 'expired';
                await user.save();
            }
        }

        res.json({
            success: true,
            subscription: {
                plan: user.subscription.plan,
                status: user.subscription.status,
                startDate: user.subscription.subscriptionStartDate,
                endDate: user.subscription.subscriptionEndDate,
            },
        });
    } catch (error) {
        console.error('Get subscription status error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get subscription status',
            error: error.message 
        });
    }
};

// Cancel subscription
export const cancelSubscription = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not authenticated' 
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        user.subscription.status = 'cancelled';
        await user.save();

        res.json({
            success: true,
            message: 'Subscription cancelled successfully',
        });
    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to cancel subscription',
            error: error.message 
        });
    }
};
