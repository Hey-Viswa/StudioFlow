// server/src/routes/protected.js
import express from 'express';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';

const router = express.Router();

router.get('/', verifyClerk, (req, res) => {
  res.json({ ok: true, userId: req.userId, claims: req.clerkToken });
});

export default router;
