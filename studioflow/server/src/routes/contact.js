import express from 'express';
import { submitContactForm } from '../controllers/contactController.js';

const router = express.Router();

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public (no auth required)
router.post('/', submitContactForm);

export default router;
