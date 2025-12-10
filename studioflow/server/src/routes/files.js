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
  updateFileApprovalStatus
} from '../controllers/fileController.js';
import {
  shareFileWithClient,
  shareFilesWithClient,
  revokeFileShare,
  enableFileDownload,
  getSharedFile,
} from '../controllers/fileSharing.js';

import { checkProjectEntitlement } from '../middlewares/entitlementMiddleware.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router({ mergeParams: true }); // mergeParams to access :id from parent

// All routes require authentication
router.use(verifyClerk);

router.use(rateLimiter);

// File upload flow
router.post('/sign', signUpload);           // Generate signed upload URL
router.post('/confirm', confirmUpload);     // Confirm upload completion

// File management
// Apply Entitlement Check for viewing/downloading files
// REMOVED checkProjectEntitlement('project_download') from list to allow clients to see empty list or shared files
router.get('/', getProjectFiles);           // List all project files
router.get('/:fileId', checkProjectEntitlement('project_download'), getFileDetails);     // Get file details + download URL
router.get('/:fileId/preview', checkProjectEntitlement('project_download'), getFilePreviewUrl); // Get preview URL
router.post('/:fileId/archive', archiveFile); // Archive file (soft delete)
router.post('/:fileId/restore', restoreFile); // Restore archived file
router.delete('/:fileId', deleteFile);      // Permanently delete file (owner only)

// Client sharing routes
router.post('/:fileId/share', shareFileWithClient);     // Share file with client
router.post('/bulk-share', shareFilesWithClient);       // Share multiple files with a client
router.post('/:fileId/revoke', revokeFileShare);        // Revoke file access
router.post('/:fileId/enable-download', enableFileDownload); // Enable download after payment
router.post('/:fileId/approval', updateFileApprovalStatus); // Approve / Request Changes

export default router;
