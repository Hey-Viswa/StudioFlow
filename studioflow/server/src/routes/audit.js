import express from 'express';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
import { getProjectActivity } from '../controllers/auditController.js';

const router = express.Router();

// All routes require authentication
router.use(verifyClerk);
router.use(rateLimiter);

// Get project activity
router.get('/projects/:projectId', getProjectActivity);

export default router;
