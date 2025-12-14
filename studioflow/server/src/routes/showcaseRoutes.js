
import express from 'express';
import { publishShowcaseItem, getShowcaseItem, getShowcasePreview } from '../controllers/showcaseController.js';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';

const router = express.Router();

// Public Routes (No Auth Required)
router.get('/:slug', getShowcaseItem);
router.get('/preview/:slug', getShowcasePreview);

// Protected Routes (Owner Only)
router.post('/publish', verifyClerk, publishShowcaseItem);

// TODO: Unpublish route
// router.post('/unpublish', verifyClerk, unpublishShowcaseItem);

export default router;
