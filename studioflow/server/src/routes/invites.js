import express from 'express';
import { verifyClerkJWKS } from '../middlewares/verifyClerkJWKS.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
import { acceptInvite, verifyInvite } from '../controllers/inviteController.js';

const router = express.Router();

// Verify invite - public (no auth needed to check if link is valid)
router.post('/verify', rateLimiter, verifyInvite);

// Accept invite - requires authentication
router.post('/accept', verifyClerkJWKS, rateLimiter, acceptInvite);

export default router;
