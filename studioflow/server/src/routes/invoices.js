import express from 'express';
import Invoice from '../models/Invoice.js';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
import { getInvoicePDFPath, invoicePDFExists, generateInvoicePDF } from '../utils/pdfGenerator.js';
import User from '../models/User.js';
import fs from 'fs';

const router = express.Router();

// Apply rate limiting
router.use(rateLimiter);

// @desc    Get all invoices for current user
// @route   GET /api/invoices
// @access  Protected
router.get('/', verifyClerk, async (req, res) => {
  try {
    const userId = req.userId;
    
    console.log(`📄 Fetching invoices for user: ${userId}`);
    
    const invoices = await Invoice.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100); // Limit to last 100 invoices
    
    console.log(`✓ Found ${invoices.length} invoices`);
    
    res.json({ invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// @desc    Get single invoice details
// @route   GET /api/invoices/:invoiceNumber
// @access  Protected
router.get('/:invoiceNumber', verifyClerk, async (req, res) => {
  try {
    const userId = req.userId;
    const { invoiceNumber } = req.params;
    
    const invoice = await Invoice.findOne({ 
      invoiceNumber, 
      userId 
    });
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.json({ invoice });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// @desc    Download invoice PDF
// @route   GET /api/invoices/:invoiceNumber/download
// @access  Protected
router.get('/:invoiceNumber/download', verifyClerk, async (req, res) => {
  try {
    const userId = req.userId;
    const { invoiceNumber } = req.params;
    
    console.log(`📥 Download request for invoice: ${invoiceNumber}`);
    
    // Verify invoice belongs to user
    const invoice = await Invoice.findOne({ 
      invoiceNumber, 
      userId 
    });
    
    if (!invoice) {
      console.error(`❌ Invoice not found: ${invoiceNumber}`);
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Check if PDF exists
    const pdfPath = getInvoicePDFPath(invoiceNumber);
    
    if (!invoicePDFExists(invoiceNumber)) {
      console.error(`❌ PDF not found for invoice: ${invoiceNumber}`);
      return res.status(404).json({ 
        error: 'PDF not yet generated',
        message: 'The invoice PDF is being generated. Please try again in a moment.'
      });
    }
    
    console.log(`✓ Sending PDF: ${pdfPath}`);
    
    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoiceNumber}.pdf"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming PDF:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download PDF' });
      }
    });
    
  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.status(500).json({ error: 'Failed to download invoice' });
  }
});

// @desc    Regenerate invoice PDF when missing/corrupted
// @route   POST /api/invoices/:invoiceNumber/regenerate
// @access  Protected
router.post('/:invoiceNumber/regenerate', verifyClerk, async (req, res) => {
  try {
    const userId = req.userId;
    const { invoiceNumber } = req.params;

    console.log(`♻️  Regenerating PDF for invoice: ${invoiceNumber}`);

    const invoice = await Invoice.findOne({ invoiceNumber, userId });
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const user = await User.findOne({ clerkUserId: userId });

    const pdfPath = await generateInvoicePDF(invoice, {
      email: invoice.metadata?.userEmail || user?.email,
      name: invoice.metadata?.userName || user?.name || 'User'
    });

    invoice.pdfGenerated = true;
    invoice.pdfUrl = pdfPath;
    await invoice.save();

    return res.json({
      success: true,
      message: 'Invoice regenerated successfully',
      pdfPath
    });
  } catch (error) {
    console.error('Error regenerating invoice:', error);
    res.status(500).json({ error: 'Failed to regenerate invoice' });
  }
});

// @desc    Get invoice statistics
// @route   GET /api/invoices/stats/summary
// @access  Protected
router.get('/stats/summary', verifyClerk, async (req, res) => {
  try {
    const userId = req.userId;
    
    const invoices = await Invoice.find({ userId });
    
    const stats = {
      totalInvoices: invoices.length,
      totalPaid: invoices.filter(inv => inv.status === 'paid').length,
      totalRefunded: invoices.filter(inv => inv.status === 'refunded').length,
      totalPending: invoices.filter(inv => inv.status === 'pending').length,
      totalAmount: invoices.reduce((sum, inv) => {
        if (inv.status === 'paid' && inv.type === 'payment') {
          return sum + inv.amount;
        }
        return sum;
      }, 0),
      totalRefundAmount: invoices.reduce((sum, inv) => {
        if (inv.status === 'refunded' && inv.type === 'refund') {
          return sum + Math.abs(inv.amount);
        }
        return sum;
      }, 0)
    };
    
    res.json({ stats });
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
