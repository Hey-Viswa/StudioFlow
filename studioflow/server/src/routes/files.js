import express from 'express';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
import {
  signUpload,
  confirmUpload,
  getProjectFiles,
  getFileDetails,
  deleteFile,
  getFilePreviewUrl,
  archiveFile,
  restoreFile,
} from '../controllers/fileController.js';
import {
  shareFileWithClient,
  revokeFileShare,
  enableFileDownload,
  getSharedFile,
} from '../controllers/fileSharing.js';

const router = express.Router({ mergeParams: true }); // mergeParams to access :id from parent

// All routes require authentication
router.use(verifyClerk);

// File upload flow
router.post('/sign', signUpload);           // Generate signed upload URL
router.post('/confirm', confirmUpload);     // Confirm upload completion

// File management
router.get('/', getProjectFiles);           // List all project files
router.get('/:fileId', getFileDetails);     // Get file details + download URL
router.get('/:fileId/preview', getFilePreviewUrl); // Get preview URL
router.post('/:fileId/archive', archiveFile); // Archive file (soft delete)
router.post('/:fileId/restore', restoreFile); // Restore archived file
router.delete('/:fileId', deleteFile);      // Permanently delete file (owner only)

// Client sharing routes
router.post('/:fileId/share', shareFileWithClient);     // Share file with client
router.post('/:fileId/revoke', revokeFileShare);        // Revoke file access
router.post('/:fileId/enable-download', enableFileDownload); // Enable download after payment

export default router;
