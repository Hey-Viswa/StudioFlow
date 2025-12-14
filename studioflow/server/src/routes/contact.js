import express from 'express';
import { submitContactForm, getContacts, updateContact } from '../controllers/contactController.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
import { requireOwner } from '../middlewares/checkRole.js';

const router = express.Router();

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public (no auth required, rate limited)
router.post('/', rateLimiter, submitContactForm);

// @desc    Get all contact submissions
// @route   GET /api/contact
// @access  Private (Owner only)
router.get('/', verifyClerk, requireOwner, getContacts);

// @desc    Update contact status
// @route   PATCH /api/contact/:id
// @access  Private (Owner only)
router.patch('/:id', verifyClerk, requireOwner, updateContact);

export default router;
