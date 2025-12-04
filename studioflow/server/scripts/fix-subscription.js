import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) throw new Error('MONGO_URI not defined');
        await mongoose.connect(uri);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Connection Error:', err);
        process.exit(1);
    }
};

const fixSubscription = async () => {
    await connectDB();

    try {
        const targetClerkId = 'user_34ahC8n6ajkmZSIkEgnhz8PUh8k';
        const user = await User.findOne({ clerkUserId: targetClerkId });

        if (!user) {
            console.log('User not found!');
            return;
        }

        console.log(`Updating subscription for: ${user.name}`);

        // Set to PRO plan for 30 days
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        user.subscription = {
            plan: 'pro',
            status: 'active',
            subscriptionStartDate: startDate,
            subscriptionEndDate: endDate,
            nextBillingDate: endDate,
            autoRenew: false,
            previousPlan: 'free',
            trialStart: null,
            trialEnd: null,
            refundIssued: false,
            refundAmount: 0,
            refundDate: null,
            razorpayCustomerId: user.subscription?.razorpayCustomerId || null,
            razorpaySubscriptionId: null,
            razorpayOrderId: null,
            razorpayPaymentId: null,
            lastStatusChange: new Date(),
            cancelledAt: null,
            cancelReason: null,
            scheduledPlan: null,
            scheduledChangeDate: null,
            pendingUpgrade: {
                targetPlan: null,
                orderId: null,
                amount: 0,
                remainingDays: 0,
                totalDays: 0,
                createdAt: null
            }
        };

        await user.save();
        console.log('✅ Subscription restored to PRO plan until', endDate.toISOString());

    } catch (error) {
        console.error('Fix Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

fixSubscription();
