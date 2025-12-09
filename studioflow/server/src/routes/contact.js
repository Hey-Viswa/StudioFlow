import express from 'express';
import { submitContactForm } from '../controllers/contactController.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public (no auth required, rate limited)
router.post('/', rateLimiter, submitContactForm);

export default router;
