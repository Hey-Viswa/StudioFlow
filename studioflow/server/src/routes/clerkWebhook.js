// server/src/routes/clerkWebhook.js
import express from 'express';
import { handleClerkWebhook } from '../controllers/clerkWebhookController.js';

const router = express.Router();

// Clerk webhook endpoint - No auth middleware, verified by Svix signature
// Must be configured in Clerk Dashboard: https://dashboard.clerk.com/
router.post(
  '/webhook',
  express.json({ verify: (req, res, buf) => { req.rawBody = buf.toString() } }),
  handleClerkWebhook
);

export default router;
