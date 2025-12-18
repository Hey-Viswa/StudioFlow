import express from 'express';
import { 
    getProfileByUsername, 
    getProfilePosts, 
    followUser, 
    getMyProfile, 
    updateMyProfile 
} from '../controllers/profileController.js';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';

const router = express.Router();

// Public Routes (Feature Flagged inside controller)
router.get('/u/:username', getProfileByUsername);
router.get('/u/:username/posts', getProfilePosts);

// Protected Routes
router.post('/u/:username/follow', verifyClerk, followUser);
router.get('/me/profile', verifyClerk, getMyProfile);
router.put('/me/profile', verifyClerk, updateMyProfile);

export default router;
