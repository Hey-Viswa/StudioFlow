import express from 'express';
import {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction
} from '../controllers/messageController.js';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// All routes require authentication
router.use(verifyClerk);

// Apply rate limiting
router.use(rateLimiter);

// Message CRUD
router.get('/:projectId/messages', getMessages);
router.post('/:projectId/messages', sendMessage);
router.patch('/:projectId/messages/:messageId', editMessage);
router.delete('/:projectId/messages/:messageId', deleteMessage);

// Reactions
router.post('/:projectId/messages/:messageId/reactions', addReaction);

export default router;
