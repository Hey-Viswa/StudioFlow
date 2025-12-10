import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connected');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    }
};

const run = async () => {
    await connectDB();

    console.log('🔍 Searching for users to restore...');

    const now = new Date();

    // Query: Users who are on 'free' plan BUT have a future 'subscriptionEndDate'
    const query = {
        'subscription.plan': 'free',
        'subscription.subscriptionEndDate': { $gt: now }
    };

    const candidates = await User.find(query);
    console.log(`📋 Found ${candidates.length} candidates for restoration.`);

    if (candidates.length === 0) {
        console.log('✅ No users need restoration.');
        process.exit(0);
    }

    let restoredCount = 0;

    for (const user of candidates) {
        try {
            console.log(`🔧 Restoring User: ${user.email} (ID: ${user._id})`);
            console.log(`   - Current Plan: ${user.subscription.plan}`);
            console.log(`   - End Date: ${user.subscription.subscriptionEndDate}`);

            // Update to PRO
            user.subscription.plan = 'pro';
            user.subscription.status = 'active';

            // Optional: You could log this action to 'recentActivity' or 'auditLog' if the schema supported it on User, 
            // but for now we just save.

            await user.save();
            console.log(`   ✅ Restored to PRO and set to ACTIVE`);
            restoredCount++;
        } catch (err) {
            console.error(`   ❌ Failed to restore user ${user.email}:`, err);
        }
    }

    console.log(`🎉 Restoration Complete. Restored ${restoredCount} users.`);
    process.exit();
};

run();
