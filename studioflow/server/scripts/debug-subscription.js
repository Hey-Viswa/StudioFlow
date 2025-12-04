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

const debugSubscription = async () => {
    await connectDB();

    try {
        // Find the user we identified earlier
        const targetClerkId = 'user_34ahC8n6ajkmZSIkEgnhz8PUh8k';
        const user = await User.findOne({ clerkUserId: targetClerkId });

        if (!user) {
            console.log('User not found!');
            return;
        }

        console.log('\n--- User Subscription Data ---');
        console.log(`User: ${user.name} (${user.clerkUserId})`);
        console.log('Subscription:', JSON.stringify(user.subscription, null, 2));

    } catch (error) {
        console.error('Debug Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

debugSubscription();
