import sharp from 'sharp';
import { previewQueue } from '../config/queue.js';
import storageAdapter from '../utils/storageAdapter.js';
import ProjectFile from '../models/ProjectFile.js';
import { getIO } from '../config/socket.js';

// Worker Processor
previewQueue.process(async (job) => {
    const { fileId, projectId, storageKey, mimeType } = job.data;
    console.log(`🖼️ Processing preview for file: ${fileId}`);

    try {
        // Update state to processing
        await ProjectFile.updateOne({ fileId }, { previewState: 'processing' });

        // 1. Fetch file from storage
        const inputBuffer = await storageAdapter.getFileBuffer(storageKey);

        // 2. Generate Preview (Thumbnail)
        // Resize to max 800px width/height, convert to WebP for efficiency
        const previewBuffer = await sharp(inputBuffer)
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

        // 3. Upload Preview
        const previewFilename = `previews/${fileId}_preview.webp`;
        const previewStorageKey = `projects/${projectId}/${previewFilename}`;

        await storageAdapter.uploadBuffer(previewStorageKey, previewBuffer, 'image/webp');

        // 4. Update DB
        const updatedFile = await ProjectFile.findOneAndUpdate(
            { fileId },
            {
                previewState: 'completed',
                previewStorageKey: previewStorageKey
            },
            { new: true }
        );

        // 5. Notify Client
        try {
            const io = getIO();
            const previewUrl = await storageAdapter.getSignedDownloadUrl(previewStorageKey, {
                filename: 'preview.webp',
                contentType: 'image/webp',
                forceDownload: false,
                ttl: 3600
            });

            io.to(`project:${projectId}:events`).emit('file.preview_generated', {
                fileId,
                previewUrl
            });
        } catch (err) {
            console.warn('Socket not initialized or failed to emit', err);
        }

        console.log(`✅ Preview generated for ${fileId}`);
        return { success: true };

    } catch (error) {
        console.error(`❌ Preview generation failed for ${fileId}:`, error);

        await ProjectFile.updateOne({ fileId }, { previewState: 'failed' });

        // Notify failure
        try {
            const io = getIO();
            io.to(`project:${projectId}:events`).emit('file.preview_failed', { fileId });
        } catch (e) { }

        throw error;
    }
});

export const startPreviewWorker = () => {
    console.log('🖼️ Preview Worker started');
};
