import express from 'express';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
import { register, login, getUserProfile } from '../controllers/authController.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Apply rate limiting to auth routes
router.use(rateLimiter);

router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyClerk, getUserProfile);

export default router;
