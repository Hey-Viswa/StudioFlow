import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Content from '../src/models/Content.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root .env file
// Assuming script is in studioflow/server/scripts/
// Root .env is in D:/School/StudioFlow/.env => ../../../.env
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const cleanupBlogs = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI is missing in .env');
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
