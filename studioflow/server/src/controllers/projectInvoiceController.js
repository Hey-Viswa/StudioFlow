import ProjectInvoice from '../models/ProjectInvoice.js';
import Project from '../models/Project.js';
import { razorpay } from '../config/razorpay.js';
import crypto from 'crypto';

// @desc    Generate new invoice for a project
// @route   POST /api/projects/:projectId/invoices/generate
// @access  Protected (Project Owner Only)
export const generateProjectInvoice = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;
    const { items, dueDate, notes, tax, discount, clientUserId } = req.body;

    console.log('=== GENERATE PROJECT INVOICE ===');
    console.log('User:', userId);
    console.log('Project:', projectId);

    // Validate project exists and user is owner
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.isOwner(userId)) {
      return res.status(403).json({ error: 'Only project owner can generate invoices' });
    }

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invoice must have at least one item' });
    }

    // Calculate item amounts
    const processedItems = items.map(item => ({
      title: item.title,
      description: item.description || '',
      quantity: item.quantity || 1,
      rate: parseFloat(item.rate),
      amount: (item.quantity || 1) * parseFloat(item.rate)
    }));

    // Find client details
    let clientInfo = { userId: null, name: 'Client', email: '' };
    
    if (clientUserId) {
      const client = project.members.find(m => m.userId === clientUserId && m.role === 'client');
      if (client) {
        clientInfo = {
          userId: client.userId,
          name: client.name || 'Client',
          email: client.email || ''
        };
      }
    } else {
      // Auto-select first client
      const client = project.members.find(m => m.role === 'client');
      if (client) {
        clientInfo = {
          userId: client.userId,
          name: client.name || 'Client',
          email: client.email || ''
        };
      }
    }

    // Create invoice
    const invoice = await ProjectInvoice.create({
      userId,
      projectId,
      client: clientInfo,
      items: processedItems,
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: notes || '',
      tax: tax || { percentage: 0, amount: 0 },
      discount: discount || { percentage: 0, amount: 0 },
      status: 'draft',
      currency: 'INR'
    });

    console.log('✓ Invoice created:', invoice.invoiceNumber);
    console.log('  Total:', invoice.total);

    res.status(201).json({
      success: true,
      invoice: {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        currency: invoice.currency,
        status: invoice.status,
        dueDate: invoice.dueDate
      }
    });

  } catch (error) {
    console.error('❌ Generate invoice error:', error);
    res.status(500).json({ 
      error: 'Failed to generate invoice',
      details: error.message 
    });
  }
};

// @desc    Get all invoices for a project
// @route   GET /api/projects/:projectId/invoices
// @access  Protected (Project Members)
export const getProjectInvoices = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    // Validate project access
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.isOwner(userId) && !project.isMember(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch invoices
    const invoices = await ProjectInvoice.find({ projectId })
      .sort({ createdAt: -1 })
      .select('-items');

    res.json({
      success: true,
      count: invoices.length,
      invoices
    });

  } catch (error) {
    console.error('❌ Get invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

// @desc    Get single invoice details
// @route   GET /api/invoices/project/:invoiceId
// @access  Protected (Owner or Client)
export const getProjectInvoiceDetails = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userId = req.userId;

    const invoice = await ProjectInvoice.findById(invoiceId)
      .populate('projectId', 'title brief');

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check access: owner or client
    if (invoice.userId !== userId && invoice.client.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      invoice
    });

  } catch (error) {
    console.error('❌ Get invoice details error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
};

// @desc    Create Razorpay order for invoice payment
// @route   POST /api/invoices/project/:invoiceId/pay
// @access  Protected (Client)
export const createPaymentOrder = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userId = req.userId;

    console.log('=== CREATE PAYMENT ORDER ===');
    console.log('Invoice:', invoiceId);
    console.log('User:', userId);

    if (!razorpay) {
      return res.status(500).json({ error: 'Payment gateway not configured' });
    }

    const invoice = await ProjectInvoice.findById(invoiceId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Validate invoice status
    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Invoice already paid' });
    }

    if (invoice.status === 'cancelled') {
      return res.status(400).json({ error: 'Invoice cancelled' });
    }

    // Create Razorpay order
    const amountInPaise = Math.round(invoice.total * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: invoice.currency,
      receipt: invoice.invoiceNumber,
      notes: {
        invoiceId: invoice._id.toString(),
        invoiceNumber: invoice.invoiceNumber,
        projectId: invoice.projectId.toString(),
        userId: invoice.userId
      }
    });

    console.log('✓ Razorpay order created:', order.id);

    // Update invoice with order ID and status
    invoice.razorpayOrderId = order.id;
    invoice.status = 'pending';
    await invoice.save();

    res.json({
      success: true,
      orderId: order.id,
      amount: invoice.total,
      currency: invoice.currency,
      invoiceNumber: invoice.invoiceNumber
    });

  } catch (error) {
    console.error('❌ Create payment order error:', error);
    res.status(500).json({ 
      error: 'Failed to create payment order',
      details: error.message 
    });
  }
};

// @desc    Verify Razorpay payment
// @route   POST /api/invoices/project/:invoiceId/verify
// @access  Protected
export const verifyProjectInvoicePayment = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = req.body;

    console.log('=== VERIFY PAYMENT ===');
    console.log('Order ID:', razorpay_order_id);
    console.log('Payment ID:', razorpay_payment_id);

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.error('❌ Invalid signature');
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    console.log('✓ Signature verified');

    // Update invoice
    const invoice = await ProjectInvoice.findById(invoiceId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    invoice.status = 'paid';
    invoice.razorpayPaymentId = razorpay_payment_id;
    invoice.razorpaySignature = razorpay_signature;
    invoice.paidAt = new Date();
    await invoice.save();

    console.log('✓ Invoice marked as paid');

    res.json({
      success: true,
      message: 'Payment verified successfully',
      invoice: {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        paidAt: invoice.paidAt
      }
    });

  } catch (error) {
    console.error('❌ Verify payment error:', error);
    res.status(500).json({ 
      error: 'Payment verification failed',
      details: error.message 
    });
  }
};

// @desc    Cancel invoice
// @route   POST /api/invoices/project/:invoiceId/cancel
// @access  Protected (Owner only)
export const cancelProjectInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userId = req.userId;

    const invoice = await ProjectInvoice.findById(invoiceId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.userId !== userId) {
      return res.status(403).json({ error: 'Only invoice creator can cancel' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Cannot cancel paid invoice' });
    }

    invoice.status = 'cancelled';
    await invoice.save();

    res.json({
      success: true,
      message: 'Invoice cancelled successfully'
    });

  } catch (error) {
    console.error('❌ Cancel invoice error:', error);
    res.status(500).json({ error: 'Failed to cancel invoice' });
  }
};

// @desc    Handle Razorpay webhook for project invoices
// @route   POST /api/payments/project-webhook
// @access  Public (Signature Verified)
export const handleProjectInvoiceWebhook = async (req, res) => {
  const timestamp = new Date().toISOString();
  
  try {
    // Verify webhook signature
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn(`[${timestamp}] ⚠️  Webhook secret not configured`);
      return res.status(200).json({ status: 'ok' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error(`[${timestamp}] ❌ Invalid webhook signature`);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log(`[${timestamp}] 📨 WEBHOOK: ${event}`);

    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(payload.payment.entity, timestamp);
        break;

      case 'payment.failed':
        await handlePaymentFailed(payload.payment.entity, timestamp);
        break;

      default:
        console.log(`[${timestamp}] ⚠️  Unhandled event: ${event}`);
    }

    res.status(200).json({ status: 'ok', event, timestamp });

  } catch (error) {
    console.error(`[${timestamp}] ❌ Webhook error:`, error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// Helper: Handle successful payment
async function handlePaymentCaptured(payment, timestamp) {
  try {
    const invoiceId = payment.notes?.invoiceId;

    if (!invoiceId) {
      console.warn(`[${timestamp}] ⚠️  No invoiceId in payment notes`);
      return;
    }

    const invoice = await ProjectInvoice.findById(invoiceId);

    if (!invoice) {
      console.error(`[${timestamp}] ❌ Invoice not found: ${invoiceId}`);
      return;
    }

    if (invoice.status !== 'paid') {
      invoice.status = 'paid';
      invoice.razorpayPaymentId = payment.id;
      invoice.paidAt = new Date(payment.created_at * 1000);
      await invoice.save();

      console.log(`[${timestamp}] ✓ Invoice ${invoice.invoiceNumber} marked as paid`);
      
      // Generate PDF automatically after payment success
      try {
        console.log(`[${timestamp}] 📄 Generating PDF for invoice ${invoice.invoiceNumber}...`);
        
        const { generateInvoicePDF } = await import('../utils/pdfGenerator.js');
        const user = {
          email: invoice.client.email || 'client@example.com',
          name: invoice.client.name || 'Client'
        };
        
        const pdfPath = await generateInvoicePDF(invoice, user);
        
        // Update invoice with PDF URL
        invoice.pdfUrl = `/api/invoices/project/${invoice.invoiceNumber}/download`;
        invoice.pdfGenerated = true;
        await invoice.save();
        
        console.log(`[${timestamp}] ✅ PDF generated: ${pdfPath}`);
        
        // Send email with PDF if client has email
        if (invoice.client.email) {
          try {
            const { sendInvoiceEmail } = await import('../utils/emailService.js');
            await sendInvoiceEmail({
              to: invoice.client.email,
              userName: invoice.client.name || 'Client',
              invoice: invoice,
              pdfPath: pdfPath
            });
            
            invoice.emailSent = true;
            invoice.emailSentAt = new Date();
            await invoice.save();
            
            console.log(`[${timestamp}] ✅ Invoice email sent to ${invoice.client.email}`);
          } catch (emailError) {
            console.error(`[${timestamp}] ⚠️  Failed to send email:`, emailError.message);
          }
        }
      } catch (pdfError) {
        console.error(`[${timestamp}] ⚠️  PDF generation failed:`, pdfError.message);
        // Don't fail the webhook if PDF generation fails
      }
    }

  } catch (error) {
    console.error(`[${timestamp}] ❌ Error handling payment captured:`, error);
  }
}

// Helper: Handle failed payment
async function handlePaymentFailed(payment, timestamp) {
  try {
    const invoiceId = payment.notes?.invoiceId;

    if (!invoiceId) {
      console.warn(`[${timestamp}] ⚠️  No invoiceId in payment notes`);
      return;
    }

    const invoice = await ProjectInvoice.findById(invoiceId);

    if (!invoice) {
      console.error(`[${timestamp}] ❌ Invoice not found: ${invoiceId}`);
      return;
    }

    invoice.status = 'failed';
    await invoice.save();

    console.log(`[${timestamp}] ❌ Payment failed for invoice ${invoice.invoiceNumber}`);

  } catch (error) {
    console.error(`[${timestamp}] ❌ Error handling payment failed:`, error);
  }
}

// @desc    Download project invoice PDF
// @route   GET /api/invoices/project/:invoiceNumber/download
// @access  Protected (Owner or Client)
export const downloadProjectInvoicePDF = async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const userId = req.userId;

    console.log('=== DOWNLOAD PROJECT INVOICE PDF ===');
    console.log('Invoice Number:', invoiceNumber);
    console.log('User:', userId);

    // Find invoice by number
    const invoice = await ProjectInvoice.findOne({ invoiceNumber });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check access: owner or client
    if (invoice.userId !== userId && invoice.client.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if PDF exists or generate it
    const { getInvoicePDFPath, invoicePDFExists, generateInvoicePDF } = await import('../utils/pdfGenerator.js');
    
    let pdfPath = getInvoicePDFPath(invoiceNumber);

    if (!invoicePDFExists(invoiceNumber)) {
      console.log('PDF not found, generating...');
      
      // Generate PDF for project invoice
      const user = {
        email: invoice.client.email || 'client@example.com',
        name: invoice.client.name || 'Client'
      };
      
      try {
        pdfPath = await generateInvoicePDF(invoice, user);
        
        // Update invoice with PDF URL
        invoice.pdfUrl = `/api/invoices/project/${invoiceNumber}/download`;
        invoice.pdfGenerated = true;
        await invoice.save();
        
        console.log('✓ PDF generated:', pdfPath);
      } catch (pdfError) {
        console.error('❌ PDF generation failed:', pdfError);
        return res.status(500).json({ error: 'Failed to generate PDF' });
      }
    } else {
      console.log('✓ PDF exists:', pdfPath);
    }

    // Send PDF file
    const fs = await import('fs');
    
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ error: 'PDF file not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoiceNumber}.pdf"`);

    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);
    
    console.log('✓ PDF sent to client');

  } catch (error) {
    console.error('❌ PDF download error:', error);
    res.status(500).json({ error: 'Failed to download PDF' });
  }
};
