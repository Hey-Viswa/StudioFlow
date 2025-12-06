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

export const shareFileWithClient = async (req, res) => {
  try {
    console.log('[ShareFile] Request:', {
      params: req.params,
      body: req.body,
      userId: req.userId
    });

    const { id: projectId, fileId } = req.params;
    const { clientId, allowDownload = false, expiresInDays = 90 } = req.body; // default 90 days access
    const userId = req.userId;

    if (!clientId) {
      console.log('[ShareFile] Missing clientId');
      return res.status(400).json({ error: 'Client ID is required' });
    }

    console.log('[ShareFile] Finding project:', projectId);
    // Only project owner can share files
    const project = await Project.findById(projectId).select('ownerId members');

    if (!project) {
      console.log('[ShareFile] Project not found:', projectId);
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log('[ShareFile] Project found. Owner:', project.ownerId, 'UserId:', userId);

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

    console.log('[ShareFile] Is client member:', isClient);

    if (!isClient) {
      return res.status(400).json({ error: 'User is not a client on this project' });
    }

    console.log('[ShareFile] Finding file:', { fileId, projectId });
    const file = await ProjectFile.findOne({ fileId, projectId });

    if (!file) {
      console.log('[ShareFile] File not found');
      return res.status(404).json({ error: 'File not found' });
    }

    console.log('[ShareFile] File found:', file.filename);

    // Generate share token
    const shareToken = generateShareToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Find latest unpaid invoice for gating (draft/sent/unpaid/pending)
    const invoice = await ProjectInvoice.findOne({
      projectId,
      'client.userId': clientId,
      status: { $in: ['draft', 'sent', 'pending', 'unpaid'] }
    }).sort({ createdAt: -1 });

    // If no invoice, force allowDownload to false (prevent pay/download without an invoice)
    const effectiveAllowDownload = allowDownload && !!invoice;

    // Add to file's shared access
    if (!file.sharedWith) {
      file.sharedWith = [];
    }

    file.sharedWith.push({
      userId: clientId,
      shareToken,
      allowDownload: effectiveAllowDownload,
      expiresAt,
      sharedBy: userId,
      sharedAt: new Date(),
      invoiceId: invoice?._id
    });

    await file.save();

    // Auto-send related invoice if applicable (idempotent)
    await autoSendInvoiceForShare({ projectId, clientId, fileId, sharedBy: userId });

    const shareUrl = `${process.env.FRONTEND_URL}/shared/files/${shareToken}`;

    res.status(200).json({
      success: true,
      shareToken,
      shareUrl,
      expiresAt,
      allowDownload: effectiveAllowDownload,
      invoiceAttached: !!invoice,
      message: invoice ? 'File shared successfully' : 'File shared, download locked until an invoice exists',
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
    const { clientId, fileIds, allowDownload = false, expiresInDays = 90 } = req.body; // default 90 days access
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

    // Fetch all requested files
    const files = await ProjectFile.find({ projectId, fileId: { $in: fileIds } });
    const foundIds = new Set(files.map(f => f.fileId));
    const missing = fileIds.filter(id => !foundIds.has(id));

    const results = [];
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Find latest unpaid invoice for gating (draft/sent/unpaid/pending)
    const invoice = await ProjectInvoice.findOne({
      projectId,
      'client.userId': clientId,
      status: { $in: ['draft', 'sent', 'pending', 'unpaid'] }
    }).sort({ createdAt: -1 });

    const effectiveAllowDownload = allowDownload && !!invoice;

    for (const file of files) {
      const shareToken = generateShareToken();
      if (!file.sharedWith) file.sharedWith = [];
      const existing = file.sharedWith.find(s => s.userId === clientId);
      if (existing) {
        existing.shareToken = shareToken;
        existing.allowDownload = effectiveAllowDownload;
        existing.expiresAt = expiresAt;
        existing.sharedBy = userId;
        existing.sharedAt = now;
        existing.invoiceId = invoice?._id;
      } else {
        file.sharedWith.push({
          userId: clientId,
          shareToken,
          allowDownload: effectiveAllowDownload,
          expiresAt,
          sharedBy: userId,
          sharedAt: now,
          invoiceId: invoice?._id
        });
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
    const userId = req.userId; // Client user ID

    const file = await ProjectFile.findOne({
      'sharedWith.shareToken': shareToken,
    });

    if (!file) {
      return res.status(404).json({ error: 'Shared file not found or link expired' });
    }

    // Find the share entry
    const shareEntry = file.sharedWith.find(s => s.shareToken === shareToken);
    if (!shareEntry) {
      return res.status(404).json({ error: 'Share link not found' });
    }

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
    if (!isOwnerOrTeam && String(shareEntry.userId) !== String(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check for Invoice Gating
    let isLocked = false;
    let invoiceDetails = null;

    if (shareEntry.invoiceId) {
      const ProjectInvoice = await import('../models/ProjectInvoice.js').then(m => m.default);
      const invoice = await ProjectInvoice.findById(shareEntry.invoiceId).select('status total currency invoiceNumber amountPaid dueDate tax subtotal discount');

      if (invoice) {
        const payable = Math.max((invoice.total || 0) - (invoice.amountPaid || 0), 0);
        const lockedByStatus = invoice.status !== 'paid';
        if (lockedByStatus || payable > 0) {
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
  } catch (error) {
    console.error('❌ Error enabling download:', error);
    res.status(500).json({ error: 'Failed to enable download' });
  }
};
