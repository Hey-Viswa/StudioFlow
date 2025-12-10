import express from 'express';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
import { cacheMiddleware } from '../middlewares/cache.js';
import { checkResourceLimit } from '../middlewares/entitlementMiddleware.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
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
  getProjectUsage,
  removeMember
} from '../controllers/projectController.js';
import {
  getProjectTasks,
  createTask,
  updateTask,
  deleteTask,
  requestReview,
  submitReview
} from '../controllers/taskController.js';
import {
  getComments,
  addComment,
  updateComment,
  deleteComment,
  reactToComment,
  resolveComment
} from '../controllers/commentController.js';
import {
  requestTransfer,
  acceptTransfer,
  getPendingRequest,
  cancelRequest
} from '../controllers/ownershipController.js';

const router = express.Router();

// All routes require authentication
router.use(verifyClerk);

// Apply rate limiting to all project routes
router.use(rateLimiter);

// Project CRUD with caching on GET requests
router.post('/', checkResourceLimit('project'), createProject);       // Create project (with limit check)
router.get('/', cacheMiddleware(2 * 60 * 1000), listProjects);  // List all user's projects (2 min cache)
router.get('/usage', getProjectUsage);                     // Get project usage/limits
router.get('/trash', cacheMiddleware(5 * 60 * 1000), listTrash); // Get trashed projects (5 min cache)
router.get('/:id/metrics', getProjectMetrics);
router.get('/:id/ownership/pending', getPendingRequest);
router.get('/:id', cacheMiddleware(1 * 60 * 1000), getProjectById); // Get single project (1 min cache)
router.put('/:id', updateProject);                        // Update project (owner only)
router.patch('/:id', updateProject);                      // Update project (owner only) - supports PATCH too
router.delete('/:id', deleteProject);                     // Soft delete project (move to trash - owner only)

// Trash management
router.post('/:id/restore', restoreProject);              // Restore from trash
router.delete('/:id/permanent', permanentlyDeleteProject); // Permanently delete

// Ownership Transfer
router.post('/:id/ownership/request', requestTransfer);
router.post('/:id/ownership/accept', acceptTransfer);
router.post('/:id/ownership/cancel', cancelRequest);

// Invite generation and Member Management
router.post('/:id/invite', checkResourceLimit('member'), generateInvite);               // Generate invite link (owner only)
router.delete('/:id/members/:userId', removeMember);                                    // Remove member (owner only)

// Task Management Routes
router.get('/:id/tasks', getProjectTasks);
router.post('/:id/tasks', createTask);
router.put('/:id/tasks/:taskId', updateTask);
router.delete('/:id/tasks/:taskId', deleteTask);

// Approval Workflow Routes
router.post('/:id/tasks/:taskId/review', requestReview);        // Request Review
router.post('/:id/tasks/:taskId/submit-review', submitReview);  // Approve or Request Changes

// Comment endpoints (enhanced with threading, reactions, mentions)
router.get('/:id/comments', getComments);                 // Get all comments for project
router.post('/:id/comments', addComment);                 // Add comment or reply
router.patch('/:id/comments/:commentId', updateComment);  // Edit comment
router.delete('/:id/comments/:commentId', deleteComment); // Delete comment
router.post('/:id/comments/:commentId/react', reactToComment); // Add/remove reaction
router.post('/:id/comments/:commentId/resolve', resolveComment); // Resolve comment

export default router;
