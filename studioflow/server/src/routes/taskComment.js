import express from 'express';
import { 
  getTasks, 
  createTask, 
  updateTask, 
  deleteTask,
  getComments,
  createComment,
  deleteComment
} from '../controllers/taskCommentController.js';
import { verifyClerkJWKS } from '../middlewares/verifyClerkJWKS.js';

const router = express.Router();

// Task routes
router.get('/:projectId/tasks', verifyClerkJWKS, getTasks);
router.post('/:projectId/tasks', verifyClerkJWKS, createTask);
router.put('/:projectId/tasks/:taskId', verifyClerkJWKS, updateTask);
router.delete('/:projectId/tasks/:taskId', verifyClerkJWKS, deleteTask);

// Comment routes
router.get('/:projectId/comments', verifyClerkJWKS, getComments);
router.post('/:projectId/comments', verifyClerkJWKS, createComment);
router.delete('/:projectId/comments/:commentId', verifyClerkJWKS, deleteComment);

export default router;
