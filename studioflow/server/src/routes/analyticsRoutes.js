
import express from 'express';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
import { getOverview } from '../controllers/analyticsController.js';

const router = express.Router();

// Protected Routes
router.use(verifyClerk);

router.get('/overview', getOverview);

export default router;
