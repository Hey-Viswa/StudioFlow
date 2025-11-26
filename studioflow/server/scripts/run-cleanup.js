import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDB } from '../src/config/db.js';
import { runCleanupJob } from '../src/jobs/fileCleanup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function runManualCleanup() {
  try {
    console.log('🧹 Starting manual file cleanup...\n');
    
    // Connect to database
    await connectDB();
    
    // Run cleanup job
    await runCleanupJob();
    
    console.log('\n✅ Manual cleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during manual cleanup:', error);
    process.exit(1);
  }
}

runManualCleanup();
