// Invoice Status Auto-Update Job
// Automatically updates invoice statuses based on due dates and payment status

import ProjectInvoice from '../models/ProjectInvoice.js';
import { logAudit } from '../services/auditService.js';

/**
 * Auto-update invoice statuses based on business rules:
 * - Mark 'sent'/'pending' invoices as 'overdue' if past due date
 * - Send notifications for overdue invoices
 */
export const updateOverdueInvoices = async () => {
  try {
    console.log('🔄 Running invoice status updater job...');
    
    const now = new Date();
    
    // Find all sent/pending invoices that are past due date
    const overdueInvoices = await ProjectInvoice.find({
      status: { $in: ['sent', 'pending'] },
      dueDate: { $lt: now },
      sentAt: { $exists: true, $ne: null } // Only process invoices that were actually sent
    });

    if (overdueInvoices.length === 0) {
      console.log('✓ No overdue invoices found');
      return { updated: 0, total: 0 };
    }

    console.log(`📋 Found ${overdueInvoices.length} overdue invoices`);

    let updatedCount = 0;

    for (const invoice of overdueInvoices) {
      try {
        // Calculate how many days overdue
        const daysOverdue = Math.floor((now - invoice.dueDate) / (1000 * 60 * 60 * 24));
        
        console.log(`  ⏰ Invoice ${invoice.invoiceNumber} is ${daysOverdue} days overdue`);

        // Update status to overdue
        invoice.status = 'overdue';
        await invoice.save();

        // Log audit trail
        await logAudit({
          userId: invoice.userId,
          action: 'invoice_marked_overdue',
          resourceType: 'invoice',
          resourceId: invoice._id,
          details: {
            invoiceNumber: invoice.invoiceNumber,
            daysOverdue,
            amount: invoice.amount,
            currency: invoice.currency,
            dueDate: invoice.dueDate,
            client: invoice.client?.name || 'N/A'
          },
          status: 'success'
        });

        console.log(`  ✅ Updated invoice ${invoice.invoiceNumber} to OVERDUE status`);
        updatedCount++;

        // TODO: Send email notification to client about overdue invoice
        // This would integrate with your notification service
        
      } catch (error) {
        console.error(`  ❌ Failed to update invoice ${invoice.invoiceNumber}:`, error.message);
      }
    }

    console.log(`✓ Invoice status update complete: ${updatedCount}/${overdueInvoices.length} updated`);
    
    return {
      updated: updatedCount,
      total: overdueInvoices.length
    };

  } catch (error) {
    console.error('❌ Invoice status updater job failed:', error);
    throw error;
  }
};

/**
 * Check for invoices that should be cancelled (e.g., 90 days overdue)
 * This is a business rule that can be customized
 */
export const autoCancelOverdueInvoices = async (daysThreshold = 90) => {
  try {
    console.log(`🔄 Checking for invoices overdue by ${daysThreshold}+ days...`);
    
    const now = new Date();
    const thresholdDate = new Date(now);
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    const veryOverdueInvoices = await ProjectInvoice.find({
      status: 'overdue',
      dueDate: { $lt: thresholdDate }
    });

    if (veryOverdueInvoices.length === 0) {
      console.log('✓ No invoices eligible for auto-cancellation');
      return { cancelled: 0, total: 0 };
    }

    console.log(`📋 Found ${veryOverdueInvoices.length} invoices overdue by ${daysThreshold}+ days`);

    let cancelledCount = 0;

    for (const invoice of veryOverdueInvoices) {
      try {
        const daysOverdue = Math.floor((now - invoice.dueDate) / (1000 * 60 * 60 * 24));
        
        console.log(`  ⛔ Auto-cancelling invoice ${invoice.invoiceNumber} (${daysOverdue} days overdue)`);

        invoice.status = 'cancelled';
        await invoice.save();

        await logAudit({
          userId: invoice.userId,
          action: 'invoice_auto_cancelled',
          resourceType: 'invoice',
          resourceId: invoice._id,
          details: {
            invoiceNumber: invoice.invoiceNumber,
            daysOverdue,
            reason: `Auto-cancelled after ${daysThreshold} days overdue`,
            amount: invoice.amount,
            currency: invoice.currency
          },
          status: 'success'
        });

        console.log(`  ✅ Cancelled invoice ${invoice.invoiceNumber}`);
        cancelledCount++;

      } catch (error) {
        console.error(`  ❌ Failed to cancel invoice ${invoice.invoiceNumber}:`, error.message);
      }
    }

    console.log(`✓ Auto-cancellation complete: ${cancelledCount}/${veryOverdueInvoices.length} cancelled`);
    
    return {
      cancelled: cancelledCount,
      total: veryOverdueInvoices.length
    };

  } catch (error) {
    console.error('❌ Auto-cancel job failed:', error);
    throw error;
  }
};

// Export combined runner for cron job
export const runInvoiceStatusJobs = async () => {
  console.log('\n═══════════════════════════════════════');
  console.log('🔄 INVOICE STATUS UPDATE JOB STARTED');
  console.log('═══════════════════════════════════════\n');

  try {
    // Update overdue invoices
    const overdueResult = await updateOverdueInvoices();
    
    // Auto-cancel very overdue invoices (90 days)
    const cancelResult = await autoCancelOverdueInvoices(90);

    console.log('\n═══════════════════════════════════════');
    console.log('✅ INVOICE STATUS UPDATE JOB COMPLETED');
    console.log(`   Overdue: ${overdueResult.updated}/${overdueResult.total}`);
    console.log(`   Cancelled: ${cancelResult.cancelled}/${cancelResult.total}`);
    console.log('═══════════════════════════════════════\n');

    return {
      success: true,
      overdueResult,
      cancelResult
    };

  } catch (error) {
    console.error('\n❌ Invoice status job failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
