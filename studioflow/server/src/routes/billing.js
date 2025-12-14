import express from 'express';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
import {
    getBillingConfig,
    updateBillingConfig,
    createTimeEntry,
    getTimeEntries,
    deleteTimeEntry,
    getProjectEarnings
} from '../controllers/billingController.js';

const router = express.Router();

// Middleware to ensure authentication
router.use(verifyClerk);

// Note: Ensure these routes are mounted AFTER standard project routes or don't collision
// Mounted at /api/projects in index.js, so paths are /:projectId/...

// Billing Config (Owner Only)
router.get('/:projectId/billing-config', getBillingConfig);
router.put('/:projectId/billing-config', updateBillingConfig);

// Time Tracking
router.post('/:projectId/time-entries', createTimeEntry);
router.get('/:projectId/time-entries', getTimeEntries);
router.delete('/:projectId/time-entries/:entryId', deleteTimeEntry);

// Earnings Dashboard
router.get('/:projectId/earnings', getProjectEarnings);

export default router;
