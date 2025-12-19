import express from 'express';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
import { requireStrictAdmin } from '../middlewares/checkRole.js';
import { linkOwnerRouteAccount } from '../controllers/adminRouteLinkController.js';

const router = express.Router();

// Admin-only: link or update Razorpay Route linked account metadata for an owner
router.post('/owners/:ownerId/route-link', verifyClerk, requireStrictAdmin, linkOwnerRouteAccount);

export default router;
