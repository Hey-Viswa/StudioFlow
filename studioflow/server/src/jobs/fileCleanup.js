import cron from 'node-cron';
import ProjectFile from '../models/ProjectFile.js';
import storageAdapter from '../utils/storageAdapter.js';

/**
 * Automatic File Cleanup Job
 * Runs daily to:
 * 1. Delete old archived files (>90 days)
 * 2. Clean up failed uploads (>7 days in "uploading" state)
 * 3. Remove database records for deleted S3 files
 */

const FILE_RETENTION_DAYS = 90; // Keep files for 90 days
const FAILED_UPLOAD_CLEANUP_DAYS = 7; // Clean failed uploads after 7 days

/**
 * Delete files that have been archived for more than retention period
 */
async function cleanupOldArchivedFiles() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - FILE_RETENTION_DAYS);

    const oldFiles = await ProjectFile.find({
      status: 'archived',
      updatedAt: { $lt: cutoffDate },
    });

    console.log(`[Cleanup] Found ${oldFiles.length} old archived files to delete`);

    for (const file of oldFiles) {
      try {
        // Delete from S3
        await storageAdapter.deleteFile(file.storageKey);
        
        // Update status to deleted
        file.status = 'deleted';
        await file.save();
        
        console.log(`[Cleanup] ✅ Deleted old file: ${file.filename} (${file.fileId})`);
      } catch (error) {
        console.error(`[Cleanup] ❌ Failed to delete ${file.fileId}:`, error.message);
      }
    }

    return oldFiles.length;
  } catch (error) {
    console.error('[Cleanup] Error in cleanupOldArchivedFiles:', error);
    return 0;
  }
}

/**
 * Clean up failed uploads (stuck in "uploading" state)
 */
async function cleanupFailedUploads() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - FAILED_UPLOAD_CLEANUP_DAYS);

    const failedUploads = await ProjectFile.find({
      status: 'uploading',
      createdAt: { $lt: cutoffDate },
    });

    console.log(`[Cleanup] Found ${failedUploads.length} failed uploads to clean`);

    for (const file of failedUploads) {
      try {
        // Try to delete from S3 (may not exist)
        try {
          await storageAdapter.deleteFile(file.storageKey);
        } catch (s3Error) {
          // File might not exist in S3, that's okay
        }
        
        // Delete database record
        await ProjectFile.deleteOne({ _id: file._id });
        
        console.log(`[Cleanup] ✅ Cleaned failed upload: ${file.filename} (${file.fileId})`);
      } catch (error) {
        console.error(`[Cleanup] ❌ Failed to clean ${file.fileId}:`, error.message);
      }
    }

    return failedUploads.length;
  } catch (error) {
    console.error('[Cleanup] Error in cleanupFailedUploads:', error);
    return 0;
  }
}

/**
 * Clean up orphaned database records (files deleted from S3 but still in DB)
 */
async function cleanupOrphanedRecords() {
  try {
    const deletedFiles = await ProjectFile.find({
      status: 'deleted',
      updatedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 days old
    });

    console.log(`[Cleanup] Found ${deletedFiles.length} old deleted records to remove`);

    for (const file of deletedFiles) {
      await ProjectFile.deleteOne({ _id: file._id });
    }

    return deletedFiles.length;
  } catch (error) {
    console.error('[Cleanup] Error in cleanupOrphanedRecords:', error);
    return 0;
  }
}

/**
 * Main cleanup job that runs all cleanup tasks
 */
async function runCleanupJob() {
  console.log('[Cleanup] 🧹 Starting automatic file cleanup job...');
  console.log('[Cleanup] Timestamp:', new Date().toISOString());
  
  const startTime = Date.now();
  
  const [archivedCount, failedCount, orphanedCount] = await Promise.all([
    cleanupOldArchivedFiles(),
    cleanupFailedUploads(),
    cleanupOrphanedRecords(),
  ]);
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('[Cleanup] ✅ Cleanup job completed');
  console.log(`[Cleanup] Summary:`);
  console.log(`[Cleanup]   - Old archived files deleted: ${archivedCount}`);
  console.log(`[Cleanup]   - Failed uploads cleaned: ${failedCount}`);
  console.log(`[Cleanup]   - Orphaned records removed: ${orphanedCount}`);
  console.log(`[Cleanup]   - Duration: ${duration}s`);
  console.log('[Cleanup] ━'.repeat(30));
}

/**
 * Initialize cleanup scheduler
 */
export function initializeCleanupScheduler() {
  console.log('🧹 Initializing file cleanup scheduler...');
  
  // Run cleanup daily at 2 AM
  cron.schedule('0 2 * * *', () => {
    runCleanupJob();
  }, {
    timezone: 'UTC'
  });
  
  console.log('✅ File cleanup scheduler started (runs daily at 2 AM UTC)');
  
  // Optionally run cleanup on startup (commented out to avoid delays)
  // setTimeout(() => {
  //   console.log('[Cleanup] Running initial cleanup on startup...');
  //   runCleanupJob();
  // }, 5000);
}

// Export for manual execution
export { runCleanupJob };
