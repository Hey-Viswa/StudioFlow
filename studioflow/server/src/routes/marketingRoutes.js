import express from 'express';
import { 
    subscribeLead, 
    verifyLead, 
    submitFeedback, 
    getPublicContent, 
    getContentBySlug,
    createPost,
    updatePost,
    deletePost,
    getMyContent
} from '../controllers/marketingController.js';
import { checkFeature } from '../middleware/checkFeature.js';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';

const router = express.Router();

// Master Switch
router.use(checkFeature('MARKETING_TOOLS'));

// Leads (Feature Flag: NEWSLETTER)
router.post('/leads/subscribe', checkFeature('NEWSLETTER'), subscribeLead);
router.get('/leads/verify/:token', checkFeature('NEWSLETTER'), verifyLead);

// Feedback (Feature Flag: FEEDBACK)
router.post('/feedback', checkFeature('FEEDBACK'), submitFeedback);

// Content (Feature Flag: BLOG)
// Public Read
// Auth Write (Protected)
router.get('/content/mine', verifyClerk, getMyContent);
router.post('/content', verifyClerk, createPost);
router.put('/content/:id', verifyClerk, updatePost);
router.delete('/content/:id', verifyClerk, deletePost);

// Content (Feature Flag: BLOG)
// Public Read
router.get('/content/:type', getPublicContent);
router.get('/content/:type/:slug', getContentBySlug);

export default router;
