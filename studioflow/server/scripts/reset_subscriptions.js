import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
// Try multiple paths to find .env
const envPaths = [
  path.resolve(__dirname, '../../.env'), // If running from server/scripts
  path.resolve(__dirname, '../../../.env'), // If running from root
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env')
];

let envLoaded = false;
for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`✓ Loaded .env from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('⚠️  Could not find .env file. Checking process.env...');
}

if (!process.env.MONGODB_URI && process.env.MONGO_URI) {
  process.env.MONGODB_URI = process.env.MONGO_URI;
}

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

const resetSubscriptions = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    console.log('🔄 Resetting all subscriptions to FREE plan...');

    const result = await User.updateMany(
      {}, // Match all users
      {
        $set: {
          'subscription.plan': 'free',
          'subscription.status': 'active',
          'subscription.razorpaySubscriptionId': null,
          'subscription.razorpayOrderId': null,
          'subscription.razorpayPaymentId': null,
          'subscription.subscriptionEndDate': null,
          'subscription.autoRenew': false
        }
      }
    );

    console.log(`✅ Reset complete. Modified ${result.modifiedCount} users.`);
    
    // Optional: Clear Razorpay Customer IDs if you want a truly fresh start
    // But keeping them is usually better to avoid "Customer already exists" errors later
    // await User.updateMany({}, { $unset: { 'subscription.razorpayCustomerId': 1 } });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  }
};

resetSubscriptions();
