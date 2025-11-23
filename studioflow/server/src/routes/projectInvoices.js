import express from 'express';
import {
  getAllUserInvoices,
  generateProjectInvoice,
  getProjectInvoices,
  getProjectInvoiceDetails,
  createPaymentOrder,
  verifyProjectInvoicePayment,
  cancelProjectInvoice,
  handleProjectInvoiceWebhook,
  downloadProjectInvoicePDF
} from '../controllers/projectInvoiceController.js';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';

const router = express.Router();

// Get all invoices for current user
router.get('/invoices', verifyClerk, getAllUserInvoices);

// Project-specific invoice routes (protected)
router.post('/projects/:projectId/invoices/generate', verifyClerk, generateProjectInvoice);
router.get('/projects/:projectId/invoices', verifyClerk, getProjectInvoices);

// Invoice-specific routes (protected)
router.get('/invoices/project/:invoiceId', verifyClerk, getProjectInvoiceDetails);
router.post('/invoices/project/:invoiceId/pay', verifyClerk, createPaymentOrder);
router.post('/invoices/project/:invoiceId/verify', verifyClerk, verifyProjectInvoicePayment);
router.post('/invoices/project/:invoiceId/cancel', verifyClerk, cancelProjectInvoice);

// PDF download route (protected)
router.get('/invoices/project/:invoiceNumber/download', verifyClerk, downloadProjectInvoicePDF);

// Webhook route (public, but signature verified)
router.post('/payments/project-webhook', 
  express.raw({ type: 'application/json' }), 
  handleProjectInvoiceWebhook
);

export default router;
