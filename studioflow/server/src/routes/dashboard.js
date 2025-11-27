import express from 'express';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
import { 
  getDashboardMetrics, 
  getRecentFiles, 
  getRecentInvoices, 
  getChartData 
} from '../controllers/dashboardController.js';

const router = express.Router();

// All routes require authentication
router.use(verifyClerk);

// Dashboard endpoints
router.get('/metrics', getDashboardMetrics);
router.get('/recent-files', getRecentFiles);
router.get('/recent-invoices', getRecentInvoices);
router.get('/charts', getChartData);

export default router;
