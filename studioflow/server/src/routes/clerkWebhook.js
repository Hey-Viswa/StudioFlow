// server/src/routes/clerkWebhook.js
import express from 'express';
import { handleClerkWebhook } from '../controllers/clerkWebhookController.js';

const router = express.Router();

// Clerk webhook endpoint - No auth middleware, verified by Svix signature
// Must be configured in Clerk Dashboard: https://dashboard.clerk.com/
'/webhook',
  handleClerkWebhook
);

export default router;
