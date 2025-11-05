import express from 'express';
import { verifyClerkJWKS } from '../middlewares/verifyClerkJWKS.js';
import {
  getTrashedProjects,
  restoreProject,
  permanentlyDeleteProject,
  emptyTrash
} from '../controllers/trashController.js';

const router = express.Router();

// All routes require authentication
router.use(verifyClerkJWKS);

// Get all trashed projects
router.get('/', getTrashedProjects);

// Restore a project from trash
router.post('/:id/restore', restoreProject);

// Permanently delete a single project
router.delete('/:id', permanentlyDeleteProject);

// Empty entire trash
router.delete('/', emptyTrash);

export default router;
