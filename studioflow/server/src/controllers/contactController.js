import { sendInvoiceEmail } from '../utils/emailService.js';

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
export const submitContactForm = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

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

    // TODO: In production, integrate with your email service (SendGrid, Resend, etc.)
    // For now, we'll log it and send a confirmation email if email service is configured

    console.log('📬 Contact Form Details:');
    console.log(`   Name: ${name}`);
    console.log(`   Email: ${email}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Message: ${message}`);

    // If email service is configured, send confirmation
    try {
      // You can use the existing emailService or create a dedicated contact email function
      // For now, we'll just acknowledge receipt
      console.log('✓ Contact form logged successfully');
    } catch (emailError) {
      console.warn('⚠️  Could not send confirmation email:', emailError.message);
    }

    res.json({
      success: true,
      message: 'Thank you for contacting us! We\'ll get back to you soon.'
    });
  } catch (error) {
    console.error('❌ Contact form error:', error);
    res.status(500).json({ 
      error: 'Failed to submit contact form', 
      details: error.message 
    });
  }
};
