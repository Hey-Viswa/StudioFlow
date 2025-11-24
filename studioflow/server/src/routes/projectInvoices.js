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
  downloadProjectInvoicePDF,
  createInvoiceFromBody,
  updateProjectInvoice,
  deleteProjectInvoice,
  updateProjectInvoiceStatus,
  resendProjectInvoice
} from '../controllers/projectInvoiceController.js';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';

const router = express.Router();

// Get all invoices for current user
router.get('/invoices', verifyClerk, getAllUserInvoices);
router.post('/invoices', verifyClerk, createInvoiceFromBody);
router.get('/invoices/:invoiceId', verifyClerk, getProjectInvoiceDetails);
router.get('/invoices/:invoiceIdentifier/pdf', verifyClerk, downloadProjectInvoicePDF);
router.put('/invoices/:invoiceId', verifyClerk, updateProjectInvoice);
router.patch('/invoices/:invoiceId/status', verifyClerk, updateProjectInvoiceStatus);
router.delete('/invoices/:invoiceId', verifyClerk, deleteProjectInvoice);
router.post('/invoices/:invoiceId/resend', verifyClerk, resendProjectInvoice);

// Project-specific invoice routes (protected)
router.post('/projects/:projectId/invoices/generate', verifyClerk, generateProjectInvoice);
router.get('/projects/:projectId/invoices', verifyClerk, getProjectInvoices);

// Invoice-specific routes (protected)
router.get('/invoices/project/:invoiceId', verifyClerk, getProjectInvoiceDetails);
router.post('/invoices/project/:invoiceId/pay', verifyClerk, createPaymentOrder);
router.post('/invoices/project/:invoiceId/verify', verifyClerk, verifyProjectInvoicePayment);
router.post('/invoices/project/:invoiceId/cancel', verifyClerk, cancelProjectInvoice);

// PDF download route (protected)
router.get('/invoices/project/:invoiceIdentifier/download', verifyClerk, downloadProjectInvoicePDF);

// Webhook route (public, but signature verified)
router.post('/payments/project-webhook', 
  express.raw({ type: 'application/json' }), 
  handleProjectInvoiceWebhook
);

export default router;
