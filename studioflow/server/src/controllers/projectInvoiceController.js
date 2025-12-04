import ProjectInvoice from '../models/ProjectInvoice.js';
import Entitlement from '../models/Entitlement.js';
import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import { ROLES } from '../utils/permissions.js';
import DeletedInvoice from '../models/DeletedInvoice.js';
import { razorpay } from '../config/razorpay.js';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { createClerkClient } from '@clerk/backend';
import { createNotificationWithIdempotency } from '../services/notificationServiceV2.js';
import PaymentThread from '../models/PaymentThread.js';
import { logAudit } from '../services/auditService.js';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});

async function ensureInvoiceProject(invoice) {
  if (!invoice || !invoice.projectId) {
    return invoice;
  }

  const alreadyPopulated = typeof invoice.projectId === 'object' && invoice.projectId !== null && invoice.projectId.title;

  if (!alreadyPopulated) {
    if (typeof invoice.populate === 'function') {
      try {
        await invoice.populate('projectId', 'title status');
      } catch (err) {
        console.warn('⚠️  Failed to populate project for invoice:', err.message);
      }
    }

    if (!(typeof invoice.projectId === 'object' && invoice.projectId?.title)) {
      try {
        const projectIdValue = typeof invoice.projectId === 'object' && invoice.projectId !== null
          ? invoice.projectId._id
          : invoice.projectId;
        if (projectIdValue) {
          const project = await Project.findById(projectIdValue).select('title status');
          if (project) {
            invoice.projectId = project;
          }
        }
      } catch (err) {
        console.warn('⚠️  Failed to fetch project for invoice:', err.message);
      }
    }
  }

  if (!invoice.projectTitle && invoice.projectId?.title) {
    invoice.projectTitle = invoice.projectId.title;
  }

  return invoice;
}

// @desc    Get all invoices for current user
// @route   GET /api/invoices
// @access  Protected
export const getAllUserInvoices = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20, status, search } = req.query;

    console.log('=== GET ALL USER INVOICES ===');
    console.log('User:', userId);
    console.log('Status filter:', status);

    // RBAC Fix: Segregate invoices based on role
    // 1. Find projects where user is Owner
    const ownedProjects = await Project.find({ ownerId: userId, deletedAt: null }).select('_id');
    const ownedProjectIds = ownedProjects.map(p => p._id);

    // 2. Find projects where user is Team Member (privileged)
    const teamMemberships = await ProjectMember.find({
      userId,
      role: { $in: ['owner', 'team_member', 'admin'] },
      status: 'active'
    }).select('projectId');
    const teamProjectIds = teamMemberships.map(m => m.projectId);

    // Combine privileged projects (can see ALL invoices)
    const privilegedProjectIds = [...new Set([...ownedProjectIds, ...teamProjectIds])];

    // Build query
    const query = {
      $or: [
        { projectId: { $in: privilegedProjectIds } }, // Can see ALL invoices for these projects
        { 'client.userId': userId } // Can see invoices where I am explicitly the client
      ]
    };

    if (status && status !== 'all') {
      if (status === 'sent') {
        query.status = { $in: ['pending', 'sent'] };
      } else if (status === 'overdue') {
        const now = new Date();
        const overdueClause = {
          $or: [
            { status: 'overdue' },
            { status: 'pending', dueDate: { $lt: now } }
          ]
        };

        if (query.$and) {
          query.$and.push(overdueClause);
        } else {
          query.$and = [overdueClause];
        }
      } else {
        query.status = status;
      }
    }

    // Add search functionality
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      // Ensure $and exists or create it
      if (!query.$and) {
        query.$and = [];
      }
      query.$and.push(
        {
          $or: [
            { invoiceNumber: searchRegex }, // Search by invoice number
            { 'client.name': searchRegex }, // Search by client name
            { 'client.email': searchRegex }, // Search by client email
            { notes: searchRegex } // Search in notes
          ]
        }
      );
    }

    // Auto-update overdue status for visible projects
    // We can't easily scope this to "all projects user can see" efficiently in one go without a complex query,
    // but we can update based on the same criteria or just update all relevant ones if we are confident.
    // For safety, let's just update the ones we are about to fetch or just run a safe update on the specific project IDs.
    await ProjectInvoice.updateMany(
      {
        projectId: { $in: privilegedProjectIds },
        status: 'pending',
        dueDate: { $lt: new Date() }
      },
      {
        $set: { status: 'overdue' }
      }
    );

    // Fetch invoices with pagination
    const skip = (page - 1) * limit;
    const invoices = await ProjectInvoice.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('projectId', 'title status')
      .lean();

    const total = await ProjectInvoice.countDocuments(query);

    const now = new Date();
    const invoicesWithDerivedStatus = invoices.map(inv => {
      const invoice = { ...inv };

      if (!invoice.projectTitle && invoice.projectId?.title) {
        invoice.projectTitle = invoice.projectId.title;
      }

      // Calculate overdue status but DO NOT override the actual status
      // This allows 'pending' (Sent) invoices to be shown as Sent even if overdue
      if (invoice.status === 'pending' && invoice.dueDate) {
        const dueDate = new Date(invoice.dueDate);
        const now = new Date();
        // Check if due date is strictly in the past (yesterday or before)
        // We can be more lenient and say it's overdue only if the DATE is past, not just time
        // But for now, let's just flag it
        if (dueDate < now) {
          invoice.isOverdue = true;
        }
      }

      return invoice;
    });

    // Debug: Show invoice statuses and due dates for overdue filter
    if (status === 'overdue') {
      console.log('📋 Overdue invoices details:');
      invoicesWithDerivedStatus.forEach(inv => {
        console.log(`  - ${inv.invoiceNumber}: status=${inv.status}, dueDate=${inv.dueDate}, isPast=${new Date(inv.dueDate) < new Date()}`);
      });
    }

    res.json({
      success: true,
      invoices: invoicesWithDerivedStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ Get all invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

// @desc    Generate new invoice for a project
// @route   POST /api/projects/:projectId/invoices/generate
// @access  Protected (Project Owner Only)
export const generateProjectInvoice = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;
    const { items, dueDate, notes, tax, discount, clientUserId, linkedFileIds, accessType } = req.body;

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
      projectTitle: project.title,
      client: clientInfo,
      items: processedItems,
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: notes || '',
      tax: tax || { percentage: 0, amount: 0 },
      discount: discount || { percentage: 0, amount: 0 },
      status: 'draft',
      currency: 'INR',
      linkedFileIds: linkedFileIds || [],
      accessType: accessType || 'all'
    });

    console.log('✓ Invoice created:', invoice.invoiceNumber);
    console.log('  Total:', invoice.total);

    // Notify client about new invoice
    if (clientInfo.userId) {
      try {
        await createNotificationWithIdempotency({
          projectId: project._id.toString(),
          recipients: [clientInfo.userId],
          type: 'invoice-generated',
          title: '📄 New Invoice',
          message: `Invoice ${invoice.invoiceNumber} for ₹${invoice.total.toFixed(2)} has been generated for ${project.title}`,
          link: `/dashboard/invoices`,
          priority: 'high',
          category: 'invoice',
          sendEmail: true,
          eventType: 'invoice-generated',
          metadata: {
            invoiceId: invoice._id.toString(),
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.total,
            projectId: project._id.toString(),
            projectTitle: project.title
          }
        });
      } catch (notifError) {
        console.error('Error sending invoice notification:', notifError);
      }
    }

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

    // Check ownership
    const isOwner = String(project.ownerId) === String(userId);

    // Check membership
    const membership = await ProjectMember.findOne({
      projectId,
      userId,
      status: { $ne: 'inactive' }
    });

    if (!isOwner && !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Determine role
    const role = isOwner ? 'owner' : membership.role;

    // Build query
    const query = { projectId };

    // RBAC: Clients can only see their own invoices
    if (role === 'client') {
      query['client.userId'] = userId;
    }

    // Auto-update overdue status
    await ProjectInvoice.updateMany(
      {
        projectId,
        status: 'pending',
        dueDate: { $lt: new Date() }
      },
      {
        $set: { status: 'overdue' }
      }
    );

    // Fetch invoices
    const invoices = await ProjectInvoice.find(query)
      .sort({ createdAt: -1 })
      .select('-items');

    // Calculate overdue status
    const invoicesWithStatus = invoices.map(inv => {
      const invoice = inv.toObject();
      if (invoice.status === 'pending' && invoice.dueDate) {
        const dueDate = new Date(invoice.dueDate);
        const now = new Date();
        if (dueDate < now) {
          invoice.isOverdue = true;
        }
      }
      return invoice;
    });

    res.json({
      success: true,
      count: invoices.length,
      invoices: invoicesWithStatus
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

    // Add isOverdue flag
    const invoiceObj = invoice.toObject();
    if (invoiceObj.status === 'pending' && invoiceObj.dueDate) {
      const dueDate = new Date(invoiceObj.dueDate);
      const now = new Date();
      if (dueDate < now) {
        invoiceObj.isOverdue = true;
      }
    }

    res.json({
      success: true,
      invoice: invoiceObj
    });

  } catch (error) {
    console.error('❌ Get invoice details error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
};

// @desc    Create invoice using request body (REST style)
// @route   POST /api/invoices
// @access  Protected
export const createInvoiceFromBody = async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    req.params.projectId = projectId;
    return generateProjectInvoice(req, res);
  } catch (error) {
    console.error('❌ Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
};

// @desc    Update invoice
// @route   PUT /api/invoices/:invoiceId
// @access  Protected (Owner only)
export const updateProjectInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const updates = req.body;
    const userId = req.userId;

    console.log('📥 Update Invoice Request:', { invoiceId, updates, userId });

    const invoice = await ProjectInvoice.findById(invoiceId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.userId !== userId) {
      return res.status(403).json({ error: 'Only invoice creator can update' });
    }

    // Enforce Immutability: Allow edits for draft, overdue, and cancelled
    // Sent/Paid invoices should generally remain immutable to preserve history, 
    // but if the user really needs to edit an overdue one (e.g. to extend date), we allow it.
    const editableStatuses = ['draft', 'overdue', 'cancelled'];

    if (!editableStatuses.includes(invoice.status)) {
      return res.status(403).json({
        error: `Cannot edit ${invoice.status} invoice. Only draft, overdue, or cancelled invoices can be edited.`
      });
    }

    // Track changes for revision history
    const previousVersion = invoice.toObject();
    let hasChanges = false;

    if (updates.projectId && String(updates.projectId) !== String(invoice.projectId)) {
      if (!mongoose.Types.ObjectId.isValid(updates.projectId)) {
        return res.status(400).json({ error: 'Invalid project selection' });
      }

      const project = await Project.findById(updates.projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (!project.isOwner(userId)) {
        return res.status(403).json({ error: 'Only project owner can link invoice' });
      }

      invoice.projectId = updates.projectId;
      invoice.projectTitle = project.title;
      hasChanges = true;
    }

    if (updates.items && (!Array.isArray(updates.items) || updates.items.length === 0)) {
      return res.status(400).json({ error: 'Invoice must include at least one item' });
    }

    if (updates.items) {
      invoice.items = updates.items.map(item => ({
        title: item.title,
        description: item.description || '',
        quantity: Math.max(1, parseFloat(item.quantity) || 1),
        rate: Math.max(0, parseFloat(item.rate) || 0),
        amount: Math.max(0, (parseFloat(item.quantity) || 1) * (parseFloat(item.rate) || 0))
      }));
      hasChanges = true;
    }

    if (updates.client) {
      invoice.client = {
        ...invoice.client,
        ...updates.client
      };
      hasChanges = true;
    }

    if (updates.notes !== undefined && updates.notes !== invoice.notes) {
      invoice.notes = updates.notes;
      hasChanges = true;
    }

    if (updates.issueDate) {
      const issueDate = new Date(updates.issueDate);
      if (isNaN(issueDate.getTime())) {
        return res.status(400).json({ error: 'Invalid issue date' });
      }
      invoice.issueDate = issueDate;
      hasChanges = true;
    }

    if (updates.dueDate) {
      const dueDate = new Date(updates.dueDate);
      if (isNaN(dueDate.getTime())) {
        return res.status(400).json({ error: 'Invalid due date' });
      }
      invoice.dueDate = dueDate;

      // If invoice was overdue and new due date is in the future, reset to pending (sent)
      if (invoice.status === 'overdue' && dueDate >= new Date()) {
        invoice.status = 'pending';
      }

      hasChanges = true;
    }

    if (invoice.issueDate && invoice.dueDate && invoice.dueDate < invoice.issueDate) {
      return res.status(400).json({ error: 'Due date cannot be earlier than invoice date' });
    }

    if (updates.tax) {
      const percentage = updates.tax.percentage !== undefined
        ? parseFloat(updates.tax.percentage) || 0
        : invoice.tax.percentage;

      const subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
      invoice.tax = {
        percentage,
        amount: (subtotal * (percentage || 0)) / 100
      };
      hasChanges = true;
    }

    if (updates.discount) {
      const percentage = updates.discount.percentage !== undefined
        ? parseFloat(updates.discount.percentage) || 0
        : invoice.discount.percentage;

      const subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
      invoice.discount = {
        percentage,
        amount: (subtotal * (percentage || 0)) / 100
      };
      hasChanges = true;
    }

    // Status updates should go through updateProjectInvoiceStatus, but if passed here:
    if (updates.status && updates.status !== invoice.status) {
      // Allow manual status corrections to pending, overdue, or cancelled
      // Block transitions to 'paid' or 'sent' if they require specific side effects (though 'sent' is 'pending' here)
      // We'll allow 'pending' (Sent), 'overdue', 'cancelled', 'draft'
      const allowedStatusUpdates = ['draft', 'pending', 'overdue', 'cancelled'];

      if (!allowedStatusUpdates.includes(updates.status)) {
        return res.status(400).json({ error: 'Invalid status update. Use dedicated endpoints for payments.' });
      }

      invoice.status = updates.status;
      hasChanges = true;
    }

    if (updates.linkedFileIds) {
      invoice.linkedFileIds = updates.linkedFileIds;
      hasChanges = true;
    }

    if (updates.accessType) {
      invoice.accessType = updates.accessType;
      hasChanges = true;
    }

    if (hasChanges) {
      // Increment version and add to history
      invoice.version = (invoice.version || 1) + 1;
      invoice.revisionHistory.push({
        version: previousVersion.version || 1,
        changedBy: userId,
        changedAt: new Date(),
        changes: updates // Store the raw updates object for simplicity, or diff it
      });
    }

    await invoice.save();
    await invoice.populate('projectId', 'title status');

    res.json({ success: true, invoice });
  } catch (error) {
    console.error('❌ Update invoice error:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
};

// @desc    Delete invoice (move to trash)
// @route   DELETE /api/invoices/:invoiceId
// @access  Protected (Owner only)
export const deleteProjectInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userId = req.userId;
    const reason = req.body?.reason || ''; // Optional delete reason (safely access)

    console.log('🗑️ Delete invoice request:', { invoiceId, userId, hasBody: !!req.body });

    const invoice = await ProjectInvoice.findById(invoiceId).populate('projectId', 'title');

    if (!invoice) {
      console.log('❌ Invoice not found:', invoiceId);
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await ensureInvoiceProject(invoice);

    console.log('✓ Invoice found:', invoice.invoiceNumber);

    if (invoice.userId !== userId) {
      console.log('❌ Unauthorized deletion attempt:', { invoiceUserId: invoice.userId, requestUserId: userId });
      return res.status(403).json({ error: 'Only invoice creator can delete' });
    }

    if (invoice.status === 'paid') {
      console.log('❌ Cannot delete paid invoice');
      return res.status(400).json({ error: 'Cannot delete paid invoice' });
    }

    // Get user details for deletion record
    let userName = '';
    try {
      const user = await clerkClient.users.getUser(userId);
      userName = user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.username || user.firstName || user.emailAddresses?.[0]?.emailAddress || '';
      console.log('✓ User details fetched:', userName);
    } catch (err) {
      console.error('⚠️ Error fetching user from Clerk:', err.message);
      userName = 'Unknown User';
    }

    console.log('📝 Creating DeletedInvoice entry...');

    // Create deleted invoice entry
    const deletedEntry = new DeletedInvoice({
      originalInvoiceId: invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      userId: invoice.userId,
      projectId: invoice.projectId?._id,
      projectTitle: invoice.projectId?.title || invoice.projectTitle || 'Unknown Project',
      client: invoice.client,
      items: invoice.items,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      discount: invoice.discount,
      total: invoice.total,
      currency: invoice.currency,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      notes: invoice.notes,
      deletedBy: userId,
      deletedByName: userName,
      deleteReason: reason,
      fullInvoiceData: invoice.toObject()
    });

    await deletedEntry.save();
    console.log('✓ DeletedInvoice saved:', deletedEntry._id);

    // Delete from main collection
    await ProjectInvoice.findByIdAndDelete(invoiceId);
    console.log('✓ Invoice removed from main collection');

    console.log('✅ Invoice successfully moved to trash:', invoice.invoiceNumber);

    res.json({
      success: true,
      message: 'Invoice deleted successfully',
      trashId: deletedEntry._id,
      expiresIn: '30 days'
    });
  } catch (error) {
    console.error('❌ Delete invoice error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to delete invoice',
      message: error.message
    });
  }
};

// @desc    Update invoice status inline
// @route   PATCH /api/invoices/:invoiceId/status
// @access  Protected (Owner only)
export const updateProjectInvoiceStatus = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { status } = req.body;
    const userId = req.userId;

    const allowedStatuses = ['draft', 'pending', 'sent', 'paid', 'overdue', 'failed', 'cancelled', 'refunded'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const invoice = await ProjectInvoice.findById(invoiceId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.userId !== userId) {
      return res.status(403).json({ error: 'Only invoice creator can update status' });
    }

    // Handle transitions
    if (status === 'sent' || status === 'pending') {
      // If moving from draft to sent, create snapshot
      if (invoice.status === 'draft') {
        invoice.immutableSnapshot = invoice.toObject();
        invoice.sentAt = new Date();
        invoice.status = 'sent'; // Normalize to 'sent'

        // TODO: Create Razorpay Order here if desired, or let the client trigger it via createPaymentOrder
        // For now, we just mark it as sent and immutable.

        console.log(`🔒 Invoice ${invoice.invoiceNumber} finalized and snapshot created.`);
      } else {
        // Already sent/paid, just updating status?
        // If it's already paid, don't allow going back to sent/pending easily without refund logic
        if (invoice.status === 'paid') {
          return res.status(400).json({ error: 'Cannot change status of paid invoice directly. Use refund.' });
        }
        invoice.status = status;
      }
    } else if (status === 'cancelled') {
      // Allow cancelling sent invoices
      invoice.status = 'cancelled';
    } else {
      invoice.status = status;
    }

    if (status === 'paid' && !invoice.paidAt) {
      invoice.paidAt = new Date();
    }
    if (status !== 'paid' && status !== 'refunded') {
      invoice.paidAt = null;
    }

    await invoice.save();

    res.json({ success: true, invoice });
  } catch (error) {
    console.error('❌ Status update error:', error);
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
};

// @desc    Resend invoice via email
// @route   POST /api/invoices/:invoiceId/resend
// @access  Protected (Owner only)
export const resendProjectInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userId = req.userId;

    const invoice = await ProjectInvoice.findById(invoiceId).populate('projectId', 'title');

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await ensureInvoiceProject(invoice);

    if (invoice.userId !== userId) {
      return res.status(403).json({ error: 'Only invoice creator can resend' });
    }

    if (!invoice.client?.email) {
      return res.status(400).json({ error: 'Client email not available' });
    }

    // STRICT ACCESS: Do NOT attach PDF for unpaid invoices
    // Only send the email with the link to the payment page
    const { sendInvoiceEmail } = await import('../utils/emailService.js');
    await sendInvoiceEmail({
      to: invoice.client.email,
      userName: invoice.client.name || 'Client',
      invoice,
      pdfPath: null // Explicitly no PDF
    });

    invoice.emailSent = true;
    invoice.emailSentAt = new Date();
    invoice.resendCount = (invoice.resendCount || 0) + 1;
    invoice.lastResentAt = new Date();
    await invoice.save();

    res.json({ success: true, message: 'Invoice resent successfully', invoice });
  } catch (error) {
    console.error('❌ Resend invoice error:', error);
    res.status(500).json({ error: 'Failed to resend invoice' });
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

    // Create or Update PaymentThread
    // This is CRITICAL for the webhook to know which project/invoice this payment belongs to
    let paymentThread = await PaymentThread.findOne({ invoiceId: invoice._id });

    if (!paymentThread) {
      paymentThread = new PaymentThread({
        projectId: invoice.projectId,
        title: `Payment for Invoice ${invoice.invoiceNumber}`,
        amount: invoice.total,
        currency: invoice.currency,
        type: 'fixed', // Default to fixed for invoices
        status: 'pending',
        invoiceId: invoice._id
      });
    }

    paymentThread.razorpayOrderId = order.id;
    paymentThread.amount = invoice.total; // Ensure amount matches
    await paymentThread.save();

    console.log('✓ PaymentThread created/updated:', paymentThread._id);

    // Log Audit
    await logAudit({
      userId,
      action: 'payment_initiated',
      resourceType: 'invoice',
      resourceId: invoice._id,
      details: {
        amount: invoice.total,
        currency: invoice.currency,
        razorpayOrderId: order.id,
        paymentThreadId: paymentThread._id
      },
      status: 'success'
    });

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

    // Create Entitlement for Client
    if (invoice.client.userId) {
      await Entitlement.create({
        userId: invoice.client.userId,
        projectId: invoice.projectId,
        scope: 'project_download',
        grantedAt: new Date(),
        expiresAt: null // Permanent access
      });
      console.log('✓ Entitlement granted to client');
    }

    console.log('✓ Invoice marked as paid');

    // Notify invoice creator about payment
    try {
      await createNotificationWithIdempotency({
        projectId: invoice.projectId?.toString() || 'general',
        recipients: [invoice.userId],
        type: 'payment-received',
        title: '💰 Payment Received',
        message: `Payment of ₹${invoice.total.toFixed(2)} received for Invoice ${invoice.invoiceNumber}`,
        link: `/dashboard/invoices`,
        priority: 'high',
        category: 'payment',
        sendEmail: true,
        eventType: 'payment-received',
        metadata: {
          invoiceId: invoice._id.toString(),
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.total,
          paidBy: invoice.client.name
        }
      });
    } catch (notifError) {
      console.error('Error sending payment notification:', notifError);
    }

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

    await ensureInvoiceProject(invoice);

    if (invoice.status !== 'paid') {
      invoice.status = 'paid';
      invoice.razorpayPaymentId = payment.id;
      invoice.paidAt = new Date(payment.created_at * 1000);
      await invoice.save();

      // Create Entitlement for Client
      if (invoice.client.userId) {
        await Entitlement.create({
          userId: invoice.client.userId,
          projectId: invoice.projectId,
          scope: 'project_download',
          grantedAt: new Date(),
          expiresAt: null // Permanent access
        });
        console.log(`[${timestamp}] ✓ Entitlement granted to client`);
      }

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
    const { invoiceIdentifier } = req.params;
    const userId = req.userId;

    console.log('=== DOWNLOAD PROJECT INVOICE PDF ===');
    console.log('Invoice Identifier:', invoiceIdentifier);
    console.log('User:', userId);

    // Find invoice by number or ObjectId
    let invoice = await ProjectInvoice.findOne({ invoiceNumber: invoiceIdentifier });

    if (!invoice) {
      // Try by ID
      if (mongoose.Types.ObjectId.isValid(invoiceIdentifier)) {
        invoice = await ProjectInvoice.findById(invoiceIdentifier);
      }
    }

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check access: owner or client
    if (invoice.userId !== userId && invoice.client.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // STRICT ACCESS: Only PAID invoices can be downloaded
    if (invoice.status !== 'paid') {
      return res.status(403).json({
        error: 'Invoice is locked. Only paid invoices can be downloaded.',
        status: invoice.status
      });
    }

    await ensureInvoiceProject(invoice);

    // Check if PDF exists or generate it
    const { getInvoicePDFPath, invoicePDFExists, generateInvoicePDF } = await import('../utils/pdfGenerator.js');

    let pdfPath = getInvoicePDFPath(invoice.invoiceNumber);

    if (!invoicePDFExists(invoice.invoiceNumber)) {
      console.log('PDF not found, generating...');

      // Generate PDF for project invoice
      const user = {
        email: invoice.client.email || 'client@example.com',
        name: invoice.client.name || 'Client'
      };

      try {
        pdfPath = await generateInvoicePDF(invoice, user);

        // Update invoice with PDF URL
        invoice.pdfUrl = `/api/invoices/project/${invoice.invoiceNumber}/download`;
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
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);

    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

    console.log('✓ PDF sent to client');

  } catch (error) {
    console.error('❌ PDF download error:', error);
    res.status(500).json({ error: 'Failed to download PDF' });
  }
};

