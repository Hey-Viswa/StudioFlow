import express from 'express';
import {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction
} from '../controllers/messageController.js';
import { verifyClerkJWKS } from '../middlewares/verifyClerkJWKS.js';

const router = express.Router();

// All routes require authentication
router.use(verifyClerkJWKS);

// Message CRUD
router.get('/:projectId/messages', getMessages);
router.post('/:projectId/messages', sendMessage);
router.patch('/:projectId/messages/:messageId', editMessage);
router.delete('/:projectId/messages/:messageId', deleteMessage);

// Reactions
router.post('/:projectId/messages/:messageId/reactions', addReaction);

export default router;
