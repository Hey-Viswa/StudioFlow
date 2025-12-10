import express from 'express';
import multer from 'multer';
import path from 'path';
import storageAdapter from '../utils/storageAdapter.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Apply rate limiting
router.use(rateLimiter);

// Use memory storage for Cloud Run compatibility
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Upload endpoint
router.post('/', upload.array('files', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const files = await Promise.all(req.files.map(async (file) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const filename = uniqueSuffix + path.extname(file.originalname);
            // Use 'uploads' prefix to distinguish from project files
            const key = `uploads/${filename}`;

            // Upload to S3/R2 via StorageAdapter
            await storageAdapter.uploadBuffer(key, file.buffer, file.mimetype);

            // Get signed URL for immediate display (valid for 24 hours)
            // Note: For permanent access, the key should be stored and signed URLs generated on demand
            const url = await storageAdapter.getSignedDownloadUrl(key, {
                filename: file.originalname,
                contentType: file.mimetype,
                ttl: 86400 // 24 hours
            });

            return {
                name: file.originalname,
                filename: filename,
                url: url,
                type: file.mimetype,
                mimeType: file.mimetype,
                size: file.size
            };
        }));

        res.json({ files });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload files' });
    }
});

export default router;
