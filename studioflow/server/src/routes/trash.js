import express from 'express';
import { verifyClerkJWKS } from '../middlewares/verifyClerkJWKS.js';
import {
  getTrashedProjects,
  restoreProject,
  permanentlyDeleteProject,
  emptyTrash,
  getDeletedInvoices,
  restoreInvoice,
  permanentlyDeleteInvoice,
  getAllTrashItems,
  restoreFile,
  permanentlyDeleteFile
} from '../controllers/trashController.js';

const router = express.Router();

// All routes require authentication
router.use(verifyClerkJWKS);

// Get all trash items (projects + invoices combined)
router.get('/all', getAllTrashItems);

// Get all trashed projects
router.get('/projects', getTrashedProjects);
router.get('/', getTrashedProjects); // Legacy support

// Get all deleted invoices
router.get('/invoices', getDeletedInvoices);

// Restore a project from trash
router.post('/projects/:id/restore', restoreProject);
router.post('/:id/restore', restoreProject); // Legacy support

// Restore an invoice from trash
router.post('/invoices/:id/restore', restoreInvoice);

// Permanently delete a single project
router.delete('/projects/:id', permanentlyDeleteProject);

// Permanently delete a single invoice
router.delete('/invoices/:id', permanentlyDeleteInvoice);

// Empty entire trash
router.delete('/', emptyTrash);

// Restore a file from trash
router.post('/files/:id/restore', restoreFile);

// Permanently delete a single file
router.delete('/files/:id', permanentlyDeleteFile);

export default router;
