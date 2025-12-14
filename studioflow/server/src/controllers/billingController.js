import ProjectBillingConfig from '../models/ProjectBillingConfig.js';
import mongoose from 'mongoose';
import TimeEntry from '../models/TimeEntry.js';
import ProjectInvoice from '../models/ProjectInvoice.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';

// @desc    Get billing configuration for a project
// @route   GET /api/projects/:projectId/billing-config
// @access  Protected (Owner only)
export const getBillingConfig = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Feature Flag Check
        if (!(await isFeatureEnabled('ADVANCED_BILLING', { projectId }))) {
            return res.status(404).json({ error: 'Feature not enabled' });
        }

        let config = await ProjectBillingConfig.findOne({ projectId });
        console.log(`[Billing] Config found for ${projectId}:`, !!config);

        if (!config) {
            console.log('[Billing] Returning default empty config');
            // Return default config structure if not found (lazy init logic handled in update)
            // or just empty structure
            return res.json({
                success: true,
                config: {
                    projectId,
                    features: { hourlyBilling: false, hybridBilling: false, autoDiscounts: false },
                    hourlyRate: 0,
                    discounts: []
                }
            });
        }

        res.json({ success: true, config });
    } catch (error) {
        console.error('Error fetching billing config:', error);
        res.status(500).json({ error: 'Failed to fetch billing config' });
    }
};

// @desc    Update billing configuration
// @route   PUT /api/projects/:projectId/billing-config
// @access  Protected (Owner only)
export const updateBillingConfig = async (req, res) => {
    try {
        const { projectId } = req.params;
        const updates = req.body;

        // Feature Flag Check
        if (!(await isFeatureEnabled('ADVANCED_BILLING', { projectId }))) {
            return res.status(404).json({ error: 'Feature not enabled' });
        }

        console.log(`[Billing] Updating config for project: ${projectId}`);

        // Prepare Dot Notation Update to prevent overwriting nested objects
        const updateOperation = { $set: {} };
        
        // Handle Top Level Fields
        if (updates.hourlyRate !== undefined) updateOperation.$set.hourlyRate = updates.hourlyRate;
        if (updates.discounts !== undefined) updateOperation.$set.discounts = updates.discounts;

        // Handle Features (Nested)
        if (updates.features) {
            if (updates.features.hourlyBilling !== undefined) {
                updateOperation.$set['features.hourlyBilling'] = updates.features.hourlyBilling;
            }
            if (updates.features.hybridBilling !== undefined) {
                updateOperation.$set['features.hybridBilling'] = updates.features.hybridBilling;
            }
            if (updates.features.autoDiscounts !== undefined) {
                updateOperation.$set['features.autoDiscounts'] = updates.features.autoDiscounts;
            }
        }

        console.log(`[Billing] Update Operation:`, JSON.stringify(updateOperation, null, 2));

        const config = await ProjectBillingConfig.findOneAndUpdate(
            { projectId: new mongoose.Types.ObjectId(projectId) },
            updateOperation,
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        console.log(`[Billing] DB update result:`, config ? 'Success' : 'Null');
        console.log(`[Billing] Saved Config Features:`, JSON.stringify(config?.features, null, 2));

        res.json({ success: true, config });
    } catch (error) {
        console.error('Error updating billing config:', error);
        res.status(500).json({ error: error.message });
    }
};

// @desc    Create a time entry
// @route   POST /api/projects/:projectId/time-entries
// @access  Protected (Owner/Member)
export const createTimeEntry = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { description, startTime, endTime, billable } = req.body;
        const userId = req.userId;

        if (!(await isFeatureEnabled('ADVANCED_BILLING', { projectId }))) {
            return res.status(404).json({ error: 'Feature not enabled' });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: 'Invalid dates' });
        }

        if (end <= start) {
            return res.status(400).json({ error: 'End time must be after start time' });
        }

        // Calculate duration
        const diffMs = end - start;
        const durationMinutes = Math.max(0, Math.floor(diffMs / 60000));

        const timeEntry = await TimeEntry.create({
            projectId,
            userId,
            description,
            startTime: start,
            endTime: end,
            durationMinutes,
            billable: billable !== false
        });

        console.log(`[Billing] Created TimeEntry: ${timeEntry._id} for Project: ${projectId}`);
        res.status(201).json({ success: true, timeEntry });
    } catch (error) {
        console.error('Error creating time entry:', error);
        res.status(500).json({ error: 'Failed to create time entry' });
    }
};

// @desc    Get time entries for a project
// @route   GET /api/projects/:projectId/time-entries
// @access  Protected
export const getTimeEntries = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { status } = req.query; // pending, invoiced, archived

        // Feature Flag Check (relaxed logic)
        if (!(await isFeatureEnabled('ADVANCED_BILLING', { projectId }))) {
            return res.status(404).json({ error: 'Feature not enabled' });
        }

        const query = { projectId };
        if (status) query.status = status;

        console.log(`[Billing] Fetching TimeEntries for Project: ${projectId}`);
        const timeEntries = await TimeEntry.find(query).sort({ startTime: -1 });
        console.log(`[Billing] Found ${timeEntries.length} entries`);

        res.json({ success: true, count: timeEntries.length, timeEntries });
    } catch (error) {
        console.error('Error fetching time entries:', error);
        res.status(500).json({ error: 'Failed to fetch time entries' });
    }
};

// @desc    Delete a time entry
// @route   DELETE /api/projects/:projectId/time-entries/:entryId
// @access  Protected (Owner only or creator)
export const deleteTimeEntry = async (req, res) => {
    try {
        const { projectId, entryId } = req.params;

        if (!(await isFeatureEnabled('ADVANCED_BILLING', { projectId }))) {
            return res.status(404).json({ error: 'Feature not enabled' });
        }

        const entry = await TimeEntry.findOne({ _id: entryId, projectId });

        if (!entry) {
            return res.status(404).json({ error: 'Time entry not found' });
        }

        if (entry.status === 'invoiced') {
            return res.status(400).json({ error: 'Cannot delete invoiced time entry' });
        }

        await entry.deleteOne();

        res.json({ success: true, message: 'Time entry deleted' });
    } catch (error) {
        console.error('Error deleting time entry:', error);
        res.status(500).json({ error: 'Failed to delete time entry' });
    }
};

// @desc    Get project earnings dashboard
// @route   GET /api/projects/:projectId/earnings
// @access  Protected (Owner only)
export const getProjectEarnings = async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!(await isFeatureEnabled('ADVANCED_BILLING', { projectId }))) {
            return res.status(404).json({ error: 'Feature not enabled' });
        }

        // 1. Get Invoices Stats
        const invoiceStats = await ProjectInvoice.aggregate([
            { $match: { projectId: new mongoose.Types.ObjectId(projectId) } },
            {
                $group: {
                    _id: '$status',
                    totalAmount: { $sum: '$total' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // 2. Get Unbilled Hours Stats
        const unbilledStats = await TimeEntry.aggregate([
            {
                $match: {
                    projectId: new mongoose.Types.ObjectId(projectId),
                    status: 'pending',
                    billable: true
                }
            },
            {
                $group: {
                    _id: null,
                    totalMinutes: { $sum: '$durationMinutes' }
                }
            }
        ]);

        const billingConfig = await ProjectBillingConfig.findOne({ projectId });
        const hourlyRate = billingConfig?.hourlyRate || 0;
        const unbilledMinutes = unbilledStats[0]?.totalMinutes || 0;
        const unbilledAmount = (unbilledMinutes / 60) * hourlyRate;

        // Calculate total billed from paid/partially paid invoices
        // Assuming 'paid' is the status for billed earnings. Adjust if 'sent' counts.
        const totalBilled = invoiceStats
            .filter(stat => ['paid', 'partially_paid'].includes(stat._id))
            .reduce((sum, stat) => sum + stat.totalAmount, 0);

        // Also return simplified structure for frontend
        res.json({
            success: true,
            totalBilled,
            unbilledAmount: parseFloat(unbilledAmount.toFixed(2)),
            unbilledMinutes,
            hourlyRate,
            stats: {
                invoices: invoiceStats,
                unbilled: {
                    minutes: unbilledMinutes,
                    amount: parseFloat(unbilledAmount.toFixed(2))
                }
            }
        });

    } catch (error) {
        console.error('Error fetching earnings:', error);
        res.status(500).json({ error: 'Failed to fetch earnings' });
    }
};
