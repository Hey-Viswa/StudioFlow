import express from 'express';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
import { cacheMiddleware } from '../middlewares/cache.js';
import { checkResourceLimit } from '../middlewares/entitlementMiddleware.js';
import {
  createProject,
  listProjects,
  getProjectById,
  generateInvite,
  updateProject,
  deleteProject,
  listTrash,
  restoreProject,
  permanentlyDeleteProject,
  getProjectMetrics,
  getProjectUsage
} from '../controllers/projectController.js';
import {
  getComments,
  addComment,
  updateComment,
  deleteComment,
  reactToComment,
  resolveComment
} from '../controllers/commentController.js';

const router = express.Router();

// All routes require authentication
router.use(verifyClerk);

// Project CRUD with caching on GET requests
router.post('/', checkResourceLimit('project'), createProject);       // Create project (with limit check)
router.get('/', cacheMiddleware(2 * 60 * 1000), listProjects);  // List all user's projects (2 min cache)
router.get('/usage', getProjectUsage);                     // Get project usage/limits
router.get('/trash', cacheMiddleware(5 * 60 * 1000), listTrash); // Get trashed projects (5 min cache)
router.get('/:id/metrics', getProjectMetrics);
router.get('/:id', cacheMiddleware(1 * 60 * 1000), getProjectById); // Get single project (1 min cache)
router.put('/:id', updateProject);                        // Update project (owner only)
router.patch('/:id', updateProject);                      // Update project (owner only) - supports PATCH too
router.delete('/:id', deleteProject);                     // Soft delete project (move to trash - owner only)

// Trash management
router.post('/:id/restore', restoreProject);              // Restore from trash
router.delete('/:id/permanent', permanentlyDeleteProject); // Permanently delete

// Invite generation
router.post('/:id/invite', checkResourceLimit('member'), generateInvite);               // Generate invite link (owner only)

// Comment endpoints (enhanced with threading, reactions, mentions)
router.get('/:id/comments', getComments);                 // Get all comments for project
router.post('/:id/comments', addComment);                 // Add comment or reply
router.patch('/:id/comments/:commentId', updateComment);  // Edit comment
router.delete('/:id/comments/:commentId', deleteComment); // Delete comment
router.post('/:id/comments/:commentId/react', reactToComment); // Add/remove reaction
router.post('/:id/comments/:commentId/resolve', resolveComment); // Resolve comment

export default router;
