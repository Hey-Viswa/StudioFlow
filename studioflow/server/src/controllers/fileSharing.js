import crypto from 'crypto';
import ProjectFile from '../models/ProjectFile.js';
import Project from '../models/Project.js';
import storageAdapter from '../utils/storageAdapter.js';
import ProjectInvoice from '../models/ProjectInvoice.js';
import { createNotificationWithIdempotency } from '../services/notificationServiceV2.js';

async function autoSendInvoiceForShare({ projectId, clientId, fileId, sharedBy }) {
  try {
    const invoice = await ProjectInvoice.findOne({
      projectId,
      'client.userId': clientId,
      status: 'draft'
    }).sort({ createdAt: -1 });

    if (!invoice) return;
    if (invoice.isImmutable) return;

    const idempotencyKey = `share:${fileId}:${clientId}`;
    if (invoice.lastTransitionId && invoice.lastTransitionId === idempotencyKey) return;

    const previousStatus = invoice.status;
    invoice.status = 'sent';
    invoice.lastTransitionId = idempotencyKey;
    invoice.sentAt = invoice.sentAt || new Date();
    invoice.autoSentAt = invoice.autoSentAt || new Date();
    invoice.immutableSnapshot = invoice.immutableSnapshot || invoice.toObject();

    invoice.statusHistory = invoice.statusHistory || [];
    invoice.auditLog = invoice.auditLog || [];
    invoice.statusHistory.push({
      from: previousStatus,
      to: 'sent',
      actorId: sharedBy,
      source: 'fileshare',
      idempotencyKey,
      at: new Date(),
      reason: 'File shared with client'
    });
    invoice.auditLog.push({
      eventType: 'auto_sent',
      actorId: sharedBy,
      fromStatus: previousStatus,
      toStatus: 'sent',
      source: 'fileshare',
      idempotencyKey,
      at: new Date(),
      payload: { fileId }
    });

    await invoice.save();

    // Notify client
    if (invoice.client?.userId) {
      await createNotificationWithIdempotency({
        projectId: projectId.toString(),
        recipients: [invoice.client.userId],
        type: 'invoice-sent',
        title: '📄 Invoice Sent',
        message: `Invoice ${invoice.invoiceNumber} was sent when a file was shared with you.`,
        link: `/dashboard/invoices`,
        priority: 'high',
        category: 'invoice',
        sendEmail: true,
        eventType: 'invoice-sent',
        metadata: {
          invoiceId: invoice._id.toString(),
          invoiceNumber: invoice.invoiceNumber,
          fileId
        }
      });
    }
  } catch (err) {
    console.error('[AutoSendInvoice] failed:', err.message);
  }
}

/**
 * Generate a secure share token for file access
 */
export function generateShareToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * File sharing for clients - preview only, no download until payment
 */

import bcrypt from 'bcrypt';

// ... (imports remain)

export const shareFileWithClient = async (req, res) => {
  try {
    console.log('[ShareFile] Request:', {
      params: req.params,
      body: { ...req.body, password: req.body.password ? '***' : undefined },
      userId: req.userId
    });

    const { id: projectId, fileId } = req.params;
    const { clientId, allowDownload = false, expiresInDays = 90, invoiceId, password } = req.body; // default 90 days access
    const userId = req.userId;

    if (!clientId) {
      return res.status(400).json({ error: 'Client ID is required' });
    }

    // Only project owner can share files
    const project = await Project.findById(projectId).select('ownerId members');

    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only project owner can share files' });
    }

    // Verify client is a member
    const projectMembers = Array.isArray(project.members) ? project.members : [];
    let isClient = projectMembers.some(
      m => m.userId === clientId && m.role === 'client'
    );

    if (!isClient) {
      // Check ProjectMember collection
      const member = await import('../models/ProjectMember.js').then(m => m.default.findOne({
        projectId,
        userId: clientId,
        role: 'client',
        status: 'active'
      }));
      isClient = !!member;
    }

    if (!isClient) return res.status(400).json({ error: 'User is not a client on this project' });

    const file = await ProjectFile.findOne({ fileId, projectId });
    if (!file) return res.status(404).json({ error: 'File not found' });

    // Generate share token
    const shareToken = generateShareToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Determine Invoice Gating
    let targetInvoiceId = invoiceId; // Explicit invoice ID

    // If explicit ID not provided or 'auto', try auto-detect
    if (!targetInvoiceId || targetInvoiceId === 'auto') {
      // 1. Try finding by Client User ID
      let invoice = await ProjectInvoice.findOne({
        projectId,
        'client.userId': clientId,
        status: { $in: ['draft', 'sent', 'pending', 'partially_paid', 'overdue'] }
      }).sort({ createdAt: -1 });

      // 2. Fallback: Try finding by Client Email
      if (!invoice) {
        try {
          const memberModel = (await import('../models/ProjectMember.js')).default;
          const member = await memberModel.findOne({ projectId, userId: clientId });

          if (member && member.email) {
            console.log('[ShareFile] Auto-detect: Falling back to email lookup', member.email);
            invoice = await ProjectInvoice.findOne({
              projectId,
              'client.email': member.email,
              status: { $in: ['draft', 'sent', 'pending', 'partially_paid', 'overdue'] }
            }).sort({ createdAt: -1 });
          }
        } catch (err) {
          console.warn('[ShareFile] Auto-detect email fallback failed:', err.message);
        }
      }

      if (invoice) {
        targetInvoiceId = invoice._id;
        console.log('[ShareFile] Auto-detected invoice:', invoice.invoiceNumber);
      } else {
        console.log('[ShareFile] No active invoice found for gating. Client:', clientId);
        // Debug: List all invoices for this project to see why we missed it
        const allInvoices = await ProjectInvoice.find({ projectId }).select('status client.userId').lean();
        console.log('[ShareFile] Debug - All Project Invoices:', allInvoices.map(i => `${i.status} (Client: ${i.client?.userId})`));
      }
    }

    // Verify invoice exists if explicit
    let invoice = null;
    if (targetInvoiceId && targetInvoiceId !== 'auto') {
      invoice = await ProjectInvoice.findOne({ _id: targetInvoiceId, projectId });
    }

    // Force allowDownload to false if invoice is missing (implicit logic -> changed: user controls download unless gated)
    // Actually, "Pay to Unlock" means allowDownload is ignored until paid.
    // If allowDownload=true AND invoice attached -> Gated.
    // If allowDownload=false -> Always locked.

    // Hash password if provided
    let passwordHash = null;
    if (password && password.trim().length > 0) {
      passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    // SAFETY: If user requested 'auto' (Gating) but we found NOTHING, force allowDownload=false
    // to prevent accidental free sharing.
    let finalAllowDownload = allowDownload;
    if (invoiceId === 'auto' && !invoice) {
      console.warn('[ShareFile] Safety: Requested auto-gating but no invoice found. Disabling download.');
      finalAllowDownload = false;
    }

    // Add/Update share entry
    if (!file.sharedWith) file.sharedWith = [];
    const existingIndex = file.sharedWith.findIndex(s => s.userId === clientId);

    const shareData = {
      userId: clientId,
      shareToken,
      allowDownload: finalAllowDownload,
      expiresAt,
      sharedBy: userId,
      sharedAt: new Date(),
      invoiceId: invoice?._id || null,
      password: passwordHash // New field
    };

    if (existingIndex !== -1) {
      // Retain existing password if not updated
      if (password === undefined) {
        shareData.password = file.sharedWith[existingIndex].password;
      }
      file.sharedWith[existingIndex] = { ...file.sharedWith[existingIndex], ...shareData };
    } else {
      file.sharedWith.push(shareData);
    }

    await file.save();

    // Auto-send related invoice if applicable (idempotent)
    if (invoice) {
      await autoSendInvoiceForShare({ projectId, clientId, fileId, sharedBy: userId });
    }

    const shareUrl = `${process.env.FRONTEND_URL}/shared/files/${shareToken}`;

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`project-${projectId}`).emit('file-updated', {
        fileId: file.fileId,
        sharedWith: file.sharedWith
      });
    }

    res.status(200).json({
      success: true,
      shareToken,
      shareUrl,
      expiresAt,
      allowDownload,
      invoiceAttached: !!invoice,
      message: invoice ? 'File shared successfully (Invoice Gated)' : 'File shared successfully',
    });
  } catch (error) {
    console.error('❌ Error sharing file:', error);
    res.status(500).json({ error: 'Failed to share file' });
  }
};

/**
 * Bulk share multiple files with a single client
 * Body: { clientId, fileIds: string[], allowDownload?: boolean, expiresInDays?: number }
 */
export const shareFilesWithClient = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { clientId, fileIds, allowDownload = false, expiresInDays = 90, password } = req.body; // default 90 days access
    const userId = req.userId;

    if (!clientId || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'clientId and fileIds[] are required' });
    }

    const project = await Project.findById(projectId).select('ownerId members');
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only project owner can share files' });
    }

    // Verify client membership
    const projectMembers = Array.isArray(project.members) ? project.members : [];
    let isClient = projectMembers.some(
      m => m.userId === clientId && m.role === 'client'
    );
    if (!isClient) {
      const memberModel = (await import('../models/ProjectMember.js')).default;
      const member = await memberModel.findOne({ projectId, userId: clientId, role: 'client', status: 'active' });
      isClient = !!member;
    }
    if (!isClient) {
      return res.status(400).json({ error: 'User is not a client on this project' });
    }

    // Hash password if provided
    let passwordHash = null;
    if (password && password.trim().length > 0) {
      passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    // Fetch all requested files
    const files = await ProjectFile.find({ projectId, fileId: { $in: fileIds } });
    const foundIds = new Set(files.map(f => f.fileId));
    const missing = fileIds.filter(id => !foundIds.has(id));

    const results = [];
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Find latest unpaid invoice for gating (draft/sent/unpaid/pending)
    // 1. Try finding by Client User ID
    const { invoiceId: requestedInvoiceId } = req.body;
    let invoice = null;

    if (requestedInvoiceId === 'none') {
      // Explicitly NO gating
    } else if (requestedInvoiceId && requestedInvoiceId !== 'auto') {
      // Explicit invoice ID (Bulk works if same client?)
      invoice = await ProjectInvoice.findOne({ _id: requestedInvoiceId, projectId });
    } else {
      // Auto-detect (default)
      invoice = await ProjectInvoice.findOne({
        projectId,
        'client.userId': clientId,
        status: { $in: ['draft', 'sent', 'pending', 'partially_paid', 'overdue'] }
      }).sort({ createdAt: -1 });

      // 2. Fallback: Try finding by Client Email
      if (!invoice) {
        try {
          const memberModel = (await import('../models/ProjectMember.js')).default;
          const member = await memberModel.findOne({ projectId, userId: clientId });

          if (member && member.email) {
            console.log('[BulkShare] Auto-detect: Falling back to email lookup', member.email);
            invoice = await ProjectInvoice.findOne({
              projectId,
              'client.email': member.email,
              status: { $in: ['draft', 'sent', 'pending', 'partially_paid', 'overdue'] }
            }).sort({ createdAt: -1 });
          }
        } catch (err) {
          console.warn('[BulkShare] Auto-detect email fallback failed:', err.message);
        }
      }
    }

    // Fix effectiveAllowDownload Logic:
    // If invoice found: allowDownload is conditional on invoice status (handled by getSharedFile).
    // If no invoice found:
    //   - If user requested 'auto' and failed: DISABLE download (Safety).
    //   - If user requested 'none': RESPECT allowDownload.
    let effectiveAllowDownload = allowDownload;

    if ((!requestedInvoiceId || requestedInvoiceId === 'auto') && !invoice) {
      // Intended gating but failed -> Disable download
      effectiveAllowDownload = false;
    }

    for (const file of files) {
      const shareToken = generateShareToken();
      if (!file.sharedWith) file.sharedWith = [];
      const existing = file.sharedWith.find(s => s.userId === clientId);

      const shareData = {
        userId: clientId,
        shareToken,
        allowDownload: effectiveAllowDownload,
        expiresAt,
        sharedBy: userId,
        sharedAt: now,
        invoiceId: invoice?._id,
        password: passwordHash
      };

      if (existing) {
        if (password !== undefined) {
          shareData.password = passwordHash;
        } else {
          shareData.password = existing.password;
        }
        Object.assign(existing, shareData);
      } else {
        file.sharedWith.push(shareData);
      }

      await file.save();
      await autoSendInvoiceForShare({ projectId, clientId, fileId: file.fileId, sharedBy: userId });

      results.push({
        fileId: file.fileId,
        shareToken,
        shareUrl: `${process.env.FRONTEND_URL}/shared/files/${shareToken}`,
        expiresAt,
        allowDownload: effectiveAllowDownload,
        invoiceAttached: !!invoice,
        message: invoice ? 'File shared successfully' : 'File shared, download locked until an invoice exists'
      });
    }

    return res.status(200).json({
      success: true,
      shared: results,
      missing,
      message: 'Files shared successfully'
    });
  } catch (error) {
    console.error('❌ Error bulk sharing files:', error);
    res.status(500).json({ error: 'Failed to bulk share files' });
  }
};

/**
 * Access shared file (client view)
 */
export const getSharedFile = async (req, res) => {
  try {
    const { shareToken } = req.params;
    // const { password } = req.body; // REMOVED: req.body is undefined on GET requests usually 
    // Actually, getting a file details usually necessitates a GET, but if we need to send a password, 
    // we might need a POST endpoint or send it in headers/query. 
    // But this is a GET route. 
    // Let's check query params first for basic access, but for password submission we might need to change to POST 
    // or use a custom header 'x-share-password'.
    // For simplicity, let's keep GET and assume password might come in query? No, that's insecure.
    // Better: If password required, return { passwordRequired: true }. 
    // Client then sends POST /api/projects/files/shared/:shareToken/unlock { password } -> returns temp token?
    // OR: Just send 'x-share-password' header.

    // Let's use a custom header 'x-share-password' for the password.
    const providedPassword = req.headers['x-share-password'];

    // Handle optional authentication (manual checks since verifyClerk is removed)
    let userId = null;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        // We can optionally verify token here if we want to give owner access
        // But for now, let's just proceed as guest if checking token fails or if token not present.
        // Ideally we should import verifyToken from @clerk/backend but that's heavy.
        // We can use the cached user if we want but verifyClerk puts it on req.userId.
        // Since we removed verifyClerk, req.userId is undefined.
        // Let's skip owner bypass for now for public links, OR re-add verifyClerk but make it non-blocking/optional.
        // For now: Treat as guest.
      }
    } catch (e) { }

    const file = await ProjectFile.findOne({
      'sharedWith.shareToken': shareToken,
    });

    if (!file) {
      return res.status(404).json({ error: 'Shared file not found or link expired' });
    }

    // Find the share entry
    const shareEntry = file.sharedWith.find(s => s.shareToken === shareToken);
    if (!shareEntry) {
      console.log('❌ Share link not found for token:', shareToken);
      return res.status(404).json({ error: 'Share link not found' });
    }

    console.log('🔍 [Debug] Share Entry Found:', {
      token: shareToken.substring(0, 10) + '...',
      userId: shareEntry.userId,
      invoiceId: shareEntry.invoiceId,
      allowDownload: shareEntry.allowDownload,
      expiresAt: shareEntry.expiresAt
    });

    // Owners/teammates can bypass recipient check for testing/preview
    let isOwnerOrTeam = false;
    try {
      const project = await Project.findById(file.projectId).select('ownerId');
      if (project && String(project.ownerId) === String(userId)) {
        isOwnerOrTeam = true;
      } else {
        const member = await (await import('../models/ProjectMember.js')).default.findOne({ projectId: file.projectId, userId, status: 'active', role: { $ne: 'client' } });
        isOwnerOrTeam = !!member;
      }
    } catch (projErr) {
      console.warn('Project lookup failed for shared file', projErr.message);
    }

    // Check expiration (defensive against invalid dates)
    const expiresAt = shareEntry.expiresAt ? new Date(shareEntry.expiresAt) : null;
    if (expiresAt && Date.now() > expiresAt.getTime()) {
      return res.status(403).json({ error: 'Share link has expired' });
    }

    // Verify user is the intended recipient (string-safe comparison)
    // Relaxed for public link access via token:
    // if (!isOwnerOrTeam && String(shareEntry.userId) !== String(userId)) {
    //   return res.status(403).json({ error: 'Access denied' });
    // }

    // Check Password Protection
    if (shareEntry.password) {
      if (!providedPassword) {
        return res.status(200).json({
          passwordRequired: true,
          file: { filename: file.filename } // limited info
        });
      }

      const isMatch = await bcrypt.compare(providedPassword, shareEntry.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid password', passwordRequired: true });
      }
    }

    // Check for Invoice Gating
    let isLocked = false;
    let invoiceDetails = null;

    if (shareEntry.invoiceId) {
      const ProjectInvoice = await import('../models/ProjectInvoice.js').then(m => m.default);
      const invoice = await ProjectInvoice.findById(shareEntry.invoiceId).select('status total currency invoiceNumber amountPaid dueDate tax subtotal discount');

      if (invoice) {
        const payable = Math.max((invoice.total || 0) - (invoice.amountPaid || 0), 0);
        const isNotPaid = invoice.status !== 'paid';

        if (isNotPaid) {
          isLocked = true;
        }

        invoiceDetails = {
          id: invoice._id,
          number: invoice.invoiceNumber,
          amount: invoice.total,
          currency: invoice.currency,
          status: invoice.status,
          amountPaid: invoice.amountPaid || 0,
          payable,
          dueDate: invoice.dueDate,
          subtotal: invoice.subtotal,
          taxAmount: invoice.tax?.amount || 0,
          discountAmount: invoice.discount?.amount || 0
        };
      }
    }

    // If locked, return limited info
    if (isLocked) {
      return res.status(200).json({
        file: {
          fileId: file.fileId,
          filename: file.filename,
          originalFilename: file.originalFilename,
          mimeType: file.mimeType,
          size: file.size,
          uploadedAt: file.createdAt,
          isPreviewable: false, // Force no preview
        },
        isLocked: true,
        invoice: invoiceDetails,
        allowDownload: false,
        expiresAt: shareEntry.expiresAt,
      });
    }

    // Generate preview URL (always preview, never download unless allowed)
    let previewUrl = null;
    try {
      previewUrl = await storageAdapter.getSignedDownloadUrl(file.storageKey, {
        filename: file.originalFilename,
        ttl: 600,
        forceDownload: false, // Preview only
        contentType: file.mimeType  // Ensure correct MIME type
      });
    } catch (urlErr) {
      console.warn('Failed to generate preview URL for shared file', urlErr.message);
      previewUrl = null;
    }

    let downloadUrl = null;
    if (shareEntry.allowDownload) {
      try {
        downloadUrl = await storageAdapter.getSignedDownloadUrl(file.storageKey, {
          filename: file.originalFilename,
          ttl: 600,
          forceDownload: true,
          contentType: file.mimeType
        });
      } catch (urlErr) {
        console.warn('Failed to generate download URL for shared file', urlErr.message);
        downloadUrl = null;
      }
    }

    res.status(200).json({
      file: {
        fileId: file.fileId,
        projectId: file.projectId, // Added for redirection
        filename: file.filename,
        originalFilename: file.originalFilename,
        mimeType: file.mimeType,
        size: file.size,
        uploadedAt: file.createdAt,
        isPreviewable: file.isPreviewable,
      },
      previewUrl,
      downloadUrl,
      allowDownload: shareEntry.allowDownload,
      expiresAt: shareEntry.expiresAt,
      invoice: invoiceDetails,
      isLocked: false,
      _debug: {
        shareEntryRaw: shareEntry,
        token: shareToken
      }
    });
  } catch (error) {
    console.error('❌ Error accessing shared file:', error);
    res.status(500).json({ error: 'Failed to access shared file' });
  }
};

/**
 * Revoke file sharing
 */
export const revokeFileShare = async (req, res) => {
  try {
    console.log('[RevokeShare] Request:', { params: req.params, body: req.body });
    const { id: projectId, fileId } = req.params;
    const { clientId } = req.body;
    const userId = req.userId;

    const project = await Project.findById(projectId).select('ownerId');
    if (!project || project.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only project owner can revoke access' });
    }

    const file = await ProjectFile.findOne({ fileId, projectId });
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Remove share entry
    file.sharedWith = file.sharedWith.filter(s => s.userId !== clientId);
    await file.save();

    res.status(200).json({
      success: true,
      message: 'File access revoked',
    });

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`project-${projectId}`).emit('file-updated', {
        fileId: file.fileId,
        sharedWith: file.sharedWith
      });
    }
  } catch (error) {
    console.error('❌ Error revoking file share:', error);
    res.status(500).json({ error: 'Failed to revoke access' });
  }
};

/**
 * Enable download for shared file (after payment)
 */
export const enableFileDownload = async (req, res) => {
  try {
    console.log('[EnableDownload] Request:', { params: req.params, body: req.body });
    const { id: projectId, fileId } = req.params;
    const { clientId } = req.body;
    const userId = req.userId;

    const project = await Project.findById(projectId).select('ownerId');
    if (!project || project.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only project owner can enable download' });
    }

    const file = await ProjectFile.findOne({ fileId, projectId });
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Find and update share entry
    const shareEntry = file.sharedWith.find(s => s.userId === clientId);
    if (!shareEntry) {
      return res.status(404).json({ error: 'File not shared with this client' });
    }

    shareEntry.allowDownload = true;
    await file.save();

    res.status(200).json({
      success: true,
      message: 'Download enabled for client',
    });

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`project-${projectId}`).emit('file-updated', {
        fileId: file.fileId,
        sharedWith: file.sharedWith
      });
    }
  } catch (error) {
    console.error('❌ Error enabling download:', error);
    res.status(500).json({ error: 'Failed to enable download' });
  }
};
