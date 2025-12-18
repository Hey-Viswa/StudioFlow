import express from 'express';
import { createResponse, getResponses, deleteResponse, likeResponse } from '../controllers/responseController.js';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';

const router = express.Router();

// Public Read
router.get('/:contentId/responses', getResponses);

// Protected Write
router.post('/responses', verifyClerk, createResponse);
router.delete('/responses/:id', verifyClerk, deleteResponse);
router.post('/responses/:id/like', verifyClerk, likeResponse);

export default router;
