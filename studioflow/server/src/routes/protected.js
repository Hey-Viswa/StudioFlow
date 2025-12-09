// server/src/routes/protected.js
import express from 'express';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

router.get('/', verifyClerk, rateLimiter, (req, res) => {
  res.json({ ok: true, userId: req.userId, claims: req.clerkToken });
});

export default router;
