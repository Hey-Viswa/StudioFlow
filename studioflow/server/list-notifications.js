import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Notification from './src/models/Notification.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function listNotifications() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const notifications = await Notification.find({}).limit(20).lean();
    
    console.log(`📊 Total notifications: ${notifications.length}\n`);
    
    notifications.forEach((notif, index) => {
      console.log(`${index + 1}. [${notif.type}] ${notif.title}`);
      console.log(`   Message: ${notif.message}`);
      console.log(`   User: ${notif.userId}`);
      console.log(`   Read: ${notif.read ? 'Yes' : 'No'}`);
      console.log(`   Created: ${notif.createdAt}`);
      console.log(`   ID: ${notif._id}\n`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

listNotifications();
