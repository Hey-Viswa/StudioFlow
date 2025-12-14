import Contact from '../models/Contact.js';
import { sendEmail, isMessagingAvailable } from '../config/appwriteMessaging.js';
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

    // Send notification email to admin
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'viswaranjan.dev@gmail.com';
      const emailBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 20px; margin-top: 20px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #4F46E5; }
            .value { margin-top: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📧 New Contact Form Submission</h1>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">From:</div>
                <div class="value">${contact.name} &lt;${contact.email}&gt;</div>
              </div>
              <div class="field">
                <div class="label">Subject:</div>
                <div class="value">${contact.subject}</div>
              </div>
              <div class="field">
                <div class="label">Message:</div>
                <div class="value">${contact.message}</div>
              </div>
              <div class="field">
                <div class="label">Contact ID:</div>
                <div class="value">${contact._id}</div>
              </div>
            </div>
            <div class="footer">
              <p>StudioFlow Contact System</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Try to send email directly (SMTP or Appwrite)
      const emailSent = await sendEmail({
        to: [adminEmail],
        subject: `New Contact: ${contact.subject}`,
        body: emailBody,
        isHtml: true
      });

      if (emailSent) {
        console.log('✅ Contact notification sent successfully');
      } else {
        // Fallback to BullMQ + SendGrid if direct send failed
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
        console.log('📧 Contact notification email queued (fallback)');
      }
    } catch (emailError) {
      console.warn('⚠️  Could not send admin notification:', emailError.message);
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

// @desc    Get all contact submissions (Admin)
// @route   GET /api/contact
// @access  Private (Owner/Admin)
export const getContacts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { status, search } = req.query;

    let query = {};

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Search by name, email, or subject
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }

    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Contact.countDocuments(query);

    res.json({
      contacts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalContacts: total
    });
  } catch (error) {
    console.error('❌ Get contacts error:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
};

// @desc    Update contact status/notes (Admin)
// @route   PATCH /api/contact/:id
// @access  Private (Owner/Admin)
export const updateContact = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const contactId = req.params.id;

    const contact = await Contact.findById(contactId);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    if (status) {
      contact.status = status;
      if (status === 'resolved' || status === 'in-progress') {
        contact.handled = true;
        contact.handledBy = req.auth.userId; // Clerk User ID
        contact.handledAt = new Date();
      }
    }

    if (notes !== undefined) {
      contact.notes = notes;
    }

    await contact.save();

    res.json({ success: true, contact });
  } catch (error) {
    console.error('❌ Update contact error:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
};
