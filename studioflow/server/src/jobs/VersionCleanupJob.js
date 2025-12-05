import cron from 'node-cron';
import ProjectFile from '../models/ProjectFile.js';
import storageAdapter from '../utils/storageAdapter.js';
import AuditLog from '../models/AuditLog.js';

// Configuration
const VERSION_RETENTION_DAYS = 30; // Cleanup non-final versions older than 30 days
const DELETED_RETENTION_DAYS = 90; // Hard delete soft-deleted files after 90 days

export const runVersionCleanup = async () => {
    console.log('🧹 Starting Version Cleanup Job...');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - VERSION_RETENTION_DAYS);

    try {
        // 1. Find non-final versions older than cutoff
        // We must ensure we don't delete the *latest* version if it's not marked final for some reason,
        // but the query specifically looks for `isFinal: false`.
        // Also need to skip if it IS the baseFileId (the first version) - usually version 1 is base.
        // Actually, logic is: all intermediate versions that are not active/final.

        const oldVersions = await ProjectFile.find({
            status: 'active',
            isFinal: false,
            createdAt: { $lt: cutoffDate },
            version: { $gt: 1 } // Keep version 1 as baseline usually? Or just keep finals.
        }).limit(100); // Batch size

        console.log(`Found ${oldVersions.length} old versions to cleanup.`);

        for (const file of oldVersions) {
            // Soft delete or Archive?
            // Requirement: "Auto-delete file versions... except final-tagged"
            // Let's archive them first or delete? 
            // "physical deletion after 90 days" applies to deleted files.
            // "Auto-delete file versions" implies removing them.

            // We'll mark as 'deleted' (soft delete) so the hard delete job picks them up later?
            // Or delete immediately?
            // Let's soft delete for safety.

            await ProjectFile.updateOne(
                { _id: file._id },
                {
                    status: 'deleted',
                    deletedAt: new Date()
                }
            );

            // Create Audit Log
            await AuditLog.create({
                action: 'file.version_cleanup',
                projectId: file.projectId,
                details: {
                    fileId: file.fileId,
                    filename: file.filename,
                    version: file.version,
                    reason: 'Retention Policy'
                },
                severity: 'info'
            });
        }

        // 2. Hard Delete "Deleted" files older than 90 days
        const hardDeleteCutoff = new Date();
        hardDeleteCutoff.setDate(hardDeleteCutoff.getDate() - DELETED_RETENTION_DAYS);

        const filesToDelete = await ProjectFile.find({
            status: 'deleted',
            deletedAt: { $lt: hardDeleteCutoff }
        }).limit(50);

        console.log(`Found ${filesToDelete.length} files to permanently delete.`);

        for (const file of filesToDelete) {
            try {
                // Delete from S3
                if (file.storageKey) {
                    await storageAdapter.deleteFile(file.storageKey);
                }
                // Delete Preview if exists
                if (file.previewStorageKey) {
                    await storageAdapter.deleteFile(file.previewStorageKey);
                }

                // Delete from DB
                await ProjectFile.deleteOne({ _id: file._id });

                console.log(`Permanently deleted file ${file.fileId}`);
            } catch (err) {
                console.error(`Failed to delete file ${file.fileId}`, err);
            }
        }

    } catch (error) {
        console.error('❌ Version Cleanup Job Failed:', error);
    }
};

// Schedule: Daily at 3 AM
export const startVersionCleanupJob = () => {
    cron.schedule('0 3 * * *', runVersionCleanup);
    console.log('⏰ Version Cleanup Job scheduled (Daily 03:00)');
};
