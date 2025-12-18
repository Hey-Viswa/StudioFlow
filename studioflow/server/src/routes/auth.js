import express from 'express';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
import { register, login, getUserProfile, updatePublicProfile } from '../controllers/authController.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Apply rate limiting to auth routes
router.use(rateLimiter);

router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyClerk, getUserProfile);
router.patch('/profile', verifyClerk, updatePublicProfile);

export default router;
