import express from 'express';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
import {
  signUpload,
  confirmUpload,
  getProjectFiles,
  getFileDetails,
  deleteFile,
  getFilePreviewUrl,
} from '../controllers/fileController.js';

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
router.delete('/:fileId', deleteFile);      // Delete file

export default router;
