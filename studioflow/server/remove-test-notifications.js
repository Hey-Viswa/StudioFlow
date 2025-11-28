import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Notification from './src/models/Notification.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function removeTestNotifications() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Delete specific test notification IDs
    const testIds = [
      '6928607581366d6af856d626', // Task Assigned
      '6928607581366d6af856d628', // Comment
      '6928607581366d6af856d62a', // Payment
      '6928607581366d6af856d62e'  // Subscription warning
    ];

    const result = await Notification.deleteMany({
      _id: { $in: testIds }
    });

    console.log(`✅ Deleted ${result.deletedCount} test notifications\n`);

    const remaining = await Notification.countDocuments();
    console.log(`📊 Remaining notifications: ${remaining}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

removeTestNotifications();
