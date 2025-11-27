import express from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { submitContactForm } from '../controllers/contactController.js';

const router = express.Router();

// Rate limiter: 10 requests per 10 minutes per IP
const rateLimiter = new RateLimiterMemory({
  points: 10, // Number of requests
  duration: 600, // Per 10 minutes (600 seconds)
  blockDuration: 3600, // Block for 1 hour if exceeded (3600 seconds)
});

// Rate limiting middleware
const rateLimitMiddleware = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    await rateLimiter.consume(ip);
    next();
  } catch (rateLimiterRes) {
    const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({
      error: 'Too many contact form submissions. Please try again later.',
      retryAfter
    });
  }
};

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public (no auth required, rate limited)
router.post('/', rateLimitMiddleware, submitContactForm);

export default router;
