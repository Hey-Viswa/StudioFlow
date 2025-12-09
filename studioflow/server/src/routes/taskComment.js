import express from 'express';
import { 
  getTasks, 
  createTask, 
  updateTask, 
  deleteTask,
  getComments,
  createComment,
  updateComment,
  deleteComment
} from '../controllers/taskCommentController.js';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Apply authentication and rate limiting to all routes
router.use(verifyClerk);
router.use(rateLimiter);

// Task routes
router.get('/:projectId/tasks', getTasks);
router.post('/:projectId/tasks', createTask);
router.put('/:projectId/tasks/:taskId', updateTask);
router.delete('/:projectId/tasks/:taskId', deleteTask);

// Comment routes
router.get('/:projectId/comments', getComments);
router.post('/:projectId/comments', createComment);
router.put('/:projectId/comments/:commentId', updateComment);
router.delete('/:projectId/comments/:commentId', deleteComment);

export default router;
