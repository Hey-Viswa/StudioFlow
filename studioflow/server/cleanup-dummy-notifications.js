import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Notification from './src/models/Notification.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Remove all dummy/test notifications from the database
 * This script cleans up test data created during development
 */
async function cleanupDummyNotifications() {
  try {
    console.log('🧹 Starting dummy notification cleanup...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all notifications
    const allNotifications = await Notification.find({});
    console.log(`📊 Total notifications in database: ${allNotifications.length}`);

    // Identify test/dummy notifications
    const testNotifications = allNotifications.filter(notif => {
      // Test notification patterns
      const isTestMessage = 
        notif.message?.includes('test') ||
        notif.message?.includes('Test') ||
        notif.message?.includes('sample') ||
        notif.message?.includes('dummy') ||
        notif.title?.includes('Test') ||
        notif.title?.includes('Welcome to Notifications') ||
        notif.title?.includes('Sample') ||
        notif.title?.includes('File Upload') && notif.message?.includes('design-mockup.png');
      
      return isTestMessage;
    });

    console.log(`🔍 Found ${testNotifications.length} test/dummy notifications\n`);

    if (testNotifications.length === 0) {
      console.log('✨ No dummy notifications found. Database is clean!');
      process.exit(0);
    }

    // Show what will be deleted
    console.log('📋 Dummy notifications to be removed:');
    testNotifications.forEach((notif, index) => {
      console.log(`  ${index + 1}. [${notif.type}] ${notif.title}`);
      console.log(`     ${notif.message.substring(0, 60)}...`);
      console.log(`     ID: ${notif._id}\n`);
    });

    // Ask for confirmation (auto-confirm in this script)
    console.log('🗑️  Deleting dummy notifications...\n');

    // Delete test notifications
    const result = await Notification.deleteMany({
      _id: { $in: testNotifications.map(n => n._id) }
    });

    console.log(`✅ Successfully deleted ${result.deletedCount} dummy notifications\n`);

    // Show remaining notifications count
    const remainingCount = await Notification.countDocuments({});
    console.log(`📊 Remaining notifications in database: ${remainingCount}`);

    console.log('\n✨ Cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupDummyNotifications();
