
import express from 'express';
import { 
    publishShowcaseItem, 
    getShowcaseItem, 
    getShowcasePreview, 
    getPortfolio, 
    unpublishShowcaseItem,
    getShowcaseStatus 
} from '../controllers/showcaseController.js';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
const router = express.Router();

// Public Routes (No Auth Required)
router.get('/:slug', getShowcaseItem);
router.get('/preview/:slug', getShowcasePreview);
router.get('/p/:username', getPortfolio);

// Protected Routes (Owner Only)
router.get('/status/:fileId', verifyClerk, getShowcaseStatus);
router.post('/publish', verifyClerk, publishShowcaseItem);
router.post('/unpublish', verifyClerk, unpublishShowcaseItem);

export default router;
