import express from 'express';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
import {
  getDashboardMetrics,
  getRecentFiles,
  getRecentInvoices,
  getChartData,
  getKpiStats
} from '../controllers/dashboardController.js';

const router = express.Router();

// All routes require authentication
router.use(verifyClerk);
router.use(rateLimiter);

// Dashboard endpoints
router.get('/metrics', getDashboardMetrics);
router.get('/kpi', getKpiStats); // New KPI endpoint
router.get('/recent-files', getRecentFiles);
router.get('/recent-invoices', getRecentInvoices);
router.get('/charts', getChartData);

export default router;
