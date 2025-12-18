import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Content from '../src/models/Content.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '../../../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  dotenv.config(); // Fallback to default
}

const cleanupBlogs = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (!mongoUri) {
      console.error('❌ MONGODB_URI or MONGO_URI is missing in environment variables');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected.');

    console.log('🔍 Finding dummy blogs by "StudioFlow Team"...');

    // Filter for dummy blogs
    const query = {
      type: 'blog',
      $or: [
        { author: 'StudioFlow Team' },
        { title: { $in: ['Movie', 'Hello brother', 'hello world'] } }
      ]
    };

    const count = await Content.countDocuments(query);
    console.log(`found ${count} posts to delete.`);

    if (count > 0) {
      const result = await Content.deleteMany(query);
      console.log(`✅ Deleted ${result.deletedCount} posts.`);
    } else {
      console.log('ℹ️ No dummy posts found.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning up blogs:', error);
    process.exit(1);
  }
};

cleanupBlogs();
