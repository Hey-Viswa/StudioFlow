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
  resendProjectInvoice,
  sendProjectInvoice,
  checkOverdueInvoices
} from '../controllers/projectInvoiceController.js';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';

import { requireAdmin, requireOwner } from '../middlewares/checkRole.js';

const router = express.Router();

// Get all invoices for current user
router.get('/invoices', verifyClerk, getAllUserInvoices);
// Allow project owners (controller enforces ownership) to create invoices
router.post('/invoices', verifyClerk, createInvoiceFromBody);
router.get('/invoices/:invoiceId', verifyClerk, getProjectInvoiceDetails);
router.get('/invoices/:invoiceIdentifier/pdf', verifyClerk, downloadProjectInvoicePDF);
router.put('/invoices/:invoiceId', verifyClerk, requireAdmin, updateProjectInvoice);
router.patch('/invoices/:invoiceId/status', verifyClerk, requireAdmin, updateProjectInvoiceStatus);
router.delete('/invoices/:invoiceId', verifyClerk, requireOwner, deleteProjectInvoice);
router.post('/invoices/:invoiceId/resend', verifyClerk, requireAdmin, resendProjectInvoice);
router.post('/invoices/:invoiceId/send', verifyClerk, requireAdmin, sendProjectInvoice);
router.post('/invoices/check-overdue', verifyClerk, checkOverdueInvoices);

// Project-specific invoice routes (protected)
// Allow project owners (controller enforces ownership) to generate invoices
router.post('/projects/:projectId/invoices/generate', verifyClerk, generateProjectInvoice);
router.get('/projects/:projectId/invoices', verifyClerk, getProjectInvoices);

// Invoice-specific routes (protected)
router.get('/invoices/project/:invoiceId', verifyClerk, getProjectInvoiceDetails);
router.post('/invoices/project/:invoiceId/pay', verifyClerk, createPaymentOrder);
router.post('/invoices/project/:invoiceId/verify', verifyClerk, verifyProjectInvoicePayment);
router.post('/invoices/project/:invoiceId/cancel', verifyClerk, cancelProjectInvoice);
router.post('/invoices/project/:invoiceId/resend', verifyClerk, requireAdmin, resendProjectInvoice);

// PDF download route (protected)
router.get('/invoices/project/:invoiceIdentifier/download', verifyClerk, downloadProjectInvoicePDF);

// Webhook route (public, but signature verified)
router.post('/payments/project-webhook',
  express.raw({ type: 'application/json' }),
  handleProjectInvoiceWebhook
);

export default router;
