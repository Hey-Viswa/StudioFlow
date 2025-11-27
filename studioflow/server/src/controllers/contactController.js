import Contact from '../models/Contact.js';
import { emailQueue } from '../config/queue.js';

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
export const submitContactForm = async (req, res) => {
  try {
    const { name, email, subject, message, honeypot } = req.body;

    // Honeypot spam protection
    if (honeypot) {
      console.log('🚫 Spam detected via honeypot');
      return res.json({ success: true, message: 'Thank you for contacting us!' });
    }

    console.log('📧 Contact form submission:', { name, email, subject });

    // Validate input
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Length validation
    if (name.length > 100 || subject.length > 200 || message.length > 2000) {
      return res.status(400).json({ error: 'Input exceeds maximum length' });
    }

    // Save to database
    const contact = await Contact.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.userId || null,
      status: 'new'
    });

    console.log(`✓ Contact saved: ${contact._id}`);

    // Send notification email to admin (non-blocking)
    try {
      await emailQueue.add('send-contact-notification', {
        contactId: contact._id.toString(),
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        message: contact.message
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      });
      console.log('📧 Contact notification email queued');
    } catch (emailError) {
      console.warn('⚠️  Could not queue admin notification:', emailError.message);
    }

    res.json({
      success: true,
      message: 'Thank you for contacting us! We\'ll get back to you soon.',
      contactId: contact._id
    });
  } catch (error) {
    console.error('❌ Contact form error:', error);
    res.status(500).json({ 
      error: 'Failed to submit contact form', 
      details: error.message 
    });
  }
};
