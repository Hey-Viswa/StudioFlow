import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import Content from '../models/Content.js';
import Clap from '../models/Clap.js';
import BlogComment from '../models/BlogComment.js';

dotenv.config();

const run = async () => {
  try {
    await connectDB();

    const posts = await Content.find({}, '_id clapCount commentCount').lean();
    const ops = [];

    for (const post of posts) {
      const [claps, comments] = await Promise.all([
        Clap.countDocuments({ postId: post._id }),
        BlogComment.countDocuments({ postId: post._id })
      ]);

      if (claps !== (post.clapCount || 0) || comments !== (post.commentCount || 0)) {
        ops.push({
          updateOne: {
            filter: { _id: post._id },
            update: { $set: { clapCount: claps, commentCount: comments } }
          }
        });
      }
    }

    if (ops.length) {
      const { modifiedCount } = await Content.bulkWrite(ops, { ordered: false });
      console.log(`✅ Backfill complete. Updated ${modifiedCount} posts.`);
    } else {
      console.log('✅ Backfill complete. No changes required.');
    }
  } catch (error) {
    console.error('❌ Backfill failed:', error.message);
  } finally {
    await disconnectDB().catch(() => {});
    await mongoose.disconnect().catch(() => {});
    process.exit(0);
  }
};

if (process.argv[1]?.includes('backfillBlogCounters.js')) {
  run();
}

export default run;
