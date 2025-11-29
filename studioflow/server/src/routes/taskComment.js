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

const router = express.Router();

// Task routes
router.get('/:projectId/tasks', verifyClerk, getTasks);
router.post('/:projectId/tasks', verifyClerk, createTask);
router.put('/:projectId/tasks/:taskId', verifyClerk, updateTask);
router.delete('/:projectId/tasks/:taskId', verifyClerk, deleteTask);

// Comment routes
router.get('/:projectId/comments', verifyClerk, getComments);
router.post('/:projectId/comments', verifyClerk, createComment);
router.put('/:projectId/comments/:commentId', verifyClerk, updateComment);
router.delete('/:projectId/comments/:commentId', verifyClerk, deleteComment);

export default router;
