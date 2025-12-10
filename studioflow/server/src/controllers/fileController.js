import ProjectFile from '../models/ProjectFile.js';
import Project from '../models/Project.js';
import ProjectInvoice from '../models/ProjectInvoice.js';
import User from '../models/User.js';
import storageAdapter from '../utils/storageAdapter.js';
import mongoose from 'mongoose';
import {
  getMaxFileSize,
  getMaxTotalStorage,
  getMaxFilesPerProject,
  isFileTypeAllowed,
  formatBytes
} from '../config/fileLimits.js';
import { previewQueue } from '../config/queue.js';

import ProjectMember from '../models/ProjectMember.js';
import { checkPermission, PERMISSIONS, ROLES } from '../utils/permissions.js';
import { verifyEntitlement } from '../utils/entitlement.js';
import { logAudit } from '../services/auditService.js';

/**
 * Helper: Check if user is a project collaborator
 */
/**
 * Helper: Get user's role in the project
 */
async function getProjectRole(projectId, userId) {
  const project = await Project.findById(projectId).select('ownerId settings').lean();
  if (!project) return { role: null, project: null };

  if (String(project.ownerId) === String(userId)) {
    return { role: ROLES.OWNER, project };
  }

  const membership = await ProjectMember.findOne({
    projectId,
    userId,
    status: { $ne: 'inactive' }
  });

  return { role: membership?.role || null, project };
}

/**
 * @desc    Generate signed upload URL
 * @route   POST /api/projects/:id/files/sign
 * @access  Protected (Project Collaborators Only)
 */
export const signUpload = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { filename, contentType, size, isNewVersion, baseFileId } = req.body;
    const userId = req.userId;

    // Validation
    if (!filename || !contentType || !size) {
      return res.status(400).json({ error: 'Missing required fields: filename, contentType, size' });
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    // RBAC: Check project access and upload permission
    const { role, project } = await getProjectRole(projectId, userId);

    if (!role) {
      console.warn(`Access denied for upload: User ${userId} is not owner/member of Project ${projectId}`);
      return res.status(403).json({ error: 'You are not the owner or team member, so you can\'t upload here.' });
    }

    const context = { allowClientUploads: project.settings?.allowClientUploads };
    if (!checkPermission(role, PERMISSIONS.FILE_UPLOAD, context)) {
      return res.status(403).json({ error: 'You do not have permission to upload files to this project.' });
    }

    // Get user's subscription plan
    const user = await User.findOne({ clerkUserId: userId }).select('subscription').lean();
    const userPlan = user?.subscription?.plan || 'free';
    const maxFileSize = getMaxFileSize(userPlan);
    const maxTotalStorage = getMaxTotalStorage(userPlan);
    const maxFiles = getMaxFilesPerProject(userPlan);

    // File size validation based on subscription
    if (size > maxFileSize) {
      return res.status(400).json({
        error: 'File too large',
        message: `Your ${userPlan} plan allows files up to ${formatBytes(maxFileSize)}. This file is ${formatBytes(size)}.`,
        maxSize: maxFileSize,
        currentPlan: userPlan,
        upgradeRequired: userPlan === 'free',
      });
    }

    // File type validation
    if (!isFileTypeAllowed(contentType, userPlan)) {
      return res.status(400).json({
        error: 'File type not allowed',
        message: `Your ${userPlan} plan does not support this file type.`,
        currentPlan: userPlan,
        upgradeRequired: true,
      });
    }

    // Check total storage limit
    const userFiles = await ProjectFile.aggregate([
      {
        $match: {
          uploaderId: userId,
          status: { $in: ['uploading', 'active', 'archived'] }
        }
      },
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$size' }
        }
      }
    ]);

    const currentUsage = userFiles[0]?.totalSize || 0;
    if (currentUsage + size > maxTotalStorage) {
      return res.status(400).json({
        error: 'Storage limit exceeded',
        message: `Your ${userPlan} plan allows ${formatBytes(maxTotalStorage)} total storage. Current usage: ${formatBytes(currentUsage)}. This file would exceed your limit.`,
        currentUsage,
        maxStorage: maxTotalStorage,
        currentPlan: userPlan,
        upgradeRequired: true,
      });
    }

    // Check files per project limit
    const projectFileCount = await ProjectFile.countDocuments({
      projectId,
      status: { $in: ['uploading', 'active'] }
    });

    if (projectFileCount >= maxFiles) {
      return res.status(400).json({
        error: 'Project file limit exceeded',
        message: `Your ${userPlan} plan allows ${maxFiles} files per project. This project has ${projectFileCount} files.`,
        currentCount: projectFileCount,
        maxFiles,
        currentPlan: userPlan,
        upgradeRequired: true,
      });
    }

    // Determine version number
    let version = 1;
    let baseFileIdRef = baseFileId;

    // Auto-detect if file with same name exists (Implicit Versioning)
    if (!isNewVersion && !baseFileId) {
      const existingFile = await ProjectFile.findOne({
        projectId,
        originalFilename: filename,
        status: { $in: ['active'] },
        isFinal: { $ne: false } // Find the current head
      }).sort({ version: -1 });

      if (existingFile) {
        baseFileIdRef = existingFile.baseFileId || existingFile._id;
        version = await ProjectFile.getNextVersion(projectId, baseFileIdRef);
        console.log(`♻️ Auto-detected duplicate filename. Creating Version ${version} of ${baseFileIdRef}`);
      }
    } else if (isNewVersion && baseFileId) {
      version = await ProjectFile.getNextVersion(projectId, baseFileId);
    }

    // Generate storage key
    const storageKey = storageAdapter.generateStorageKey(projectId, filename, version);

    // Get signed upload URL
    const { uploadUrl, key, provider, bucket } = await storageAdapter.getSignedUploadUrl(
      storageKey,
      contentType,
      900 // 15 minutes TTL
    );

    // Create file record in "uploading" state
    const fileRecord = await ProjectFile.create({
      projectId,
      uploaderId: userId,
      filename,
      originalFilename: filename,
      mimeType: contentType,
      size,
      version,
      version,
      baseFileId: baseFileIdRef || null,
      storageProvider: provider,
      storageKey: key,
      bucket,
      status: 'uploading',
    });

    res.status(200).json({
      uploadUrl,
      fileId: fileRecord.fileId,
      storageKey: key,
      version,
      expiresIn: 900,
    });
  } catch (error) {
    console.error('❌ Error signing upload:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Failed to generate signed upload URL', details: error.message });
  }
};

/**
 * @desc    Confirm upload and save file metadata
 * @route   POST /api/projects/:id/files/confirm
 * @access  Protected (Project Collaborators Only)
 */
export const confirmUpload = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { fileId, storageKey, description, tags } = req.body;
    const userId = req.userId;

    // Validation
    if (!fileId || !storageKey) {
      return res.status(400).json({ error: 'Missing required fields: fileId, storageKey' });
    }

    // RBAC: Check project access
    const { role } = await getProjectRole(projectId, userId);
    if (!role) {
      return res.status(403).json({ error: 'You are not the owner or team member, so you can\'t upload here.' });
    }

    // Find file record
    const fileRecord = await ProjectFile.findOne({ fileId, projectId });
    if (!fileRecord) {
      return res.status(404).json({ error: 'File record not found' });
    }

    // Verify uploader (or Owner can confirm? Usually only uploader confirms their own upload flow)
    if (fileRecord.uploaderId !== userId) {
      return res.status(403).json({ error: 'Only the uploader can confirm this file' });
    }

    // Verify file exists in storage
    const verification = await storageAdapter.verifyUpload(storageKey);
    if (!verification.exists) {
      return res.status(400).json({ error: 'Upload verification failed. File not found in storage.' });
    }

    // Update file record with atomic operation to avoid race conditions
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Mark as completed
      fileRecord.status = 'active';
      fileRecord.uploadCompletedAt = new Date();
      if (description) fileRecord.description = description;
      if (tags) fileRecord.tags = tags;

      // Update actual size from storage (in case client lied)
      if (verification.size) {
        fileRecord.size = verification.size;
      }

      await fileRecord.save({ session });

      // If this is a new version, mark previous version as not final
      if (fileRecord.baseFileId && fileRecord.version > 1) {
        await ProjectFile.updateMany(
          {
            projectId,
            baseFileId: fileRecord.baseFileId,
            version: { $lt: fileRecord.version },
            status: 'active',
          },
          { isFinal: false },
          { session }
        );
      }

      await session.commitTransaction();
      session.endSession();

      // Trigger Preview Generation for Images
      if (fileRecord.mimeType.startsWith('image/')) {
        previewQueue.add({
          fileId: fileRecord.fileId,
          projectId: fileRecord.projectId,
          storageKey: fileRecord.storageKey,
          mimeType: fileRecord.mimeType
        });
        // Update status to pending immediately to satisfy UI
        await ProjectFile.updateOne({ _id: fileRecord._id }, { previewState: 'pending' });
      }

      // Populate uploader info for response
      const populatedFile = await ProjectFile.findById(fileRecord._id).lean();

      // Generate preview URL if applicable
      if (populatedFile.storageKey && populatedFile.mimeType && (populatedFile.mimeType.startsWith('image/') || populatedFile.mimeType.startsWith('video/'))) {
        try {
          populatedFile.previewUrl = await storageAdapter.getSignedDownloadUrl(
            populatedFile.storageKey,
            populatedFile.filename,
            false,
            populatedFile.mimeType,
            3600
          );
        } catch (err) {
          console.warn(`Failed to generate preview URL for new file ${populatedFile._id}:`, err.message);
        }
      }

      // Emit Socket.IO event for real-time updates
      const io = req.app?.get('io');
      if (io) {
        io.to(`project-${projectId}`).emit('project:files:added', { file: populatedFile });
      }

      // Trigger Notification
      try {
        const { triggerNotification } = await import('../services/notificationService.js');
        const project = await Project.findById(projectId).select('title').lean();

        await triggerNotification(
          'file.uploaded',
          {
            projectId,
            fileId: fileRecord.fileId,
            fileName: fileRecord.filename,
            projectTitle: project?.title || 'Project',
            uploadedBy: userId,
            link: `/dashboard/projects/${projectId}?tab=files`,
            category: 'file'
          },
          userId
        );
      } catch (notifError) {
        console.error('⚠️ Failed to trigger file upload notification:', notifError);
      }

      res.status(200).json({
        success: true,
        file: populatedFile,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error confirming upload:', error);
    res.status(500).json({ error: 'Failed to confirm upload', details: error.message });
  }
};

/**
 * @desc    Get all files for a project
 * @route   GET /api/projects/:id/files
 * @access  Protected (Project Collaborators Only)
 */
export const getProjectFiles = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const userId = req.userId;
    const { status = 'active', includeArchived = false } = req.query;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    // RBAC: Check project access and view permission
    const { role } = await getProjectRole(projectId, userId);
    if (!role) {
      return res.status(403).json({ error: 'Access denied. You are not a collaborator on this project.' });
    }

    if (!checkPermission(role, PERMISSIONS.FILE_VIEW)) {
      return res.status(403).json({ error: 'You do not have permission to view files.' });
    }

    // Build query
    const query = { projectId };
    if (status) {
      query.status = includeArchived === 'true' ? { $in: ['active', 'archived'] } : status;
    }

    // For clients, only return files shared with them
    if (role === ROLES.CLIENT) {
      query['sharedWith.userId'] = userId;
    }

    const files = await ProjectFile.find(query).sort({ createdAt: -1 }).lean();

    // Process files to add permission flags and signed URLs for previews
    const processedFiles = await Promise.all(files.map(async (file) => {
      let canDownload = role === ROLES.OWNER || role === ROLES.TEAM_MEMBER;
      let canView = canDownload;
      let gatedInvoice = null;

      if (role === ROLES.CLIENT) {
        const shareEntry = (file.sharedWith || []).find(s => String(s.userId) === String(userId));
        const allowDownload = shareEntry?.allowDownload === true;

        if (shareEntry?.invoiceId) {
          gatedInvoice = await ProjectInvoice.findById(shareEntry.invoiceId).select('status invoiceNumber total currency').lean();
        }

        const invoicePaid = gatedInvoice ? gatedInvoice.status === 'paid' : true;
        canDownload = !!shareEntry && allowDownload && invoicePaid;
        canView = !!shareEntry; // preview allowed if shared, even if download locked
      }

      let previewUrl = null;
      // Generate preview URL for images and videos
      if (file.storageKey && file.mimeType && (file.mimeType.startsWith('image/') || file.mimeType.startsWith('video/') || file.mimeType === 'application/pdf')) {
        try {
          // Generate a signed URL valid for 1 hour
          previewUrl = await storageAdapter.getSignedDownloadUrl(
            file.storageKey,
            file.filename,
            false, // forceDownload
            file.mimeType,
            3600 // ttl
          );
        } catch (err) {
          console.warn(`Failed to generate preview URL for file ${file._id}:`, err.message);
        }
      }

      return {
        ...file,
        canDownload,
        canView,
        previewUrl,
        gatedInvoice,
      };
    }));

    // Group by baseFileId to show version history
    const fileGroups = {};
    const standaloneFiles = [];

    processedFiles.forEach(file => {
      if (file.baseFileId) {
        if (!fileGroups[file.baseFileId]) {
          fileGroups[file.baseFileId] = [];
        }
        fileGroups[file.baseFileId].push(file);
      } else {
        standaloneFiles.push(file);
      }
    });

    res.status(200).json({
      files: processedFiles,
      fileGroups,
      standaloneFiles,
      totalCount: processedFiles.length,
    });
  } catch (error) {
    console.error('❌ Error fetching project files:', error);
    res.status(500).json({ error: 'Failed to fetch files', details: error.message });
  }
};

/**
 * @desc    Get single file details with signed download URL
 * @route   GET /api/projects/:id/files/:fileId
 * @access  Protected (Project Collaborators Only)
 */
export const getFileDetails = async (req, res) => {
  try {
    const { id: projectId, fileId } = req.params;
    const userId = req.userId;

    // RBAC: Check project access
    const { role } = await getProjectRole(projectId, userId);
    if (!role) {
      return res.status(403).json({ error: 'Access denied. You are not a collaborator on this project.' });
    }

    if (!checkPermission(role, PERMISSIONS.FILE_VIEW)) {
      return res.status(403).json({ error: 'You do not have permission to view files.' });
    }

    // Entitlement check is now handled by middleware

    const file = await ProjectFile.findOne({ fileId, projectId });
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // For clients, ensure file is shared with them and download is allowed (and invoice paid if present)
    if (role === ROLES.CLIENT) {
      const shareEntry = (file.sharedWith || []).find(s => String(s.userId) === String(userId));
      if (!shareEntry) {
        return res.status(403).json({ error: 'File not shared with this client' });
      }

      if (shareEntry.invoiceId) {
        const invoice = await ProjectInvoice.findById(shareEntry.invoiceId).select('status invoiceNumber').lean();
        if (invoice && invoice.status !== 'paid') {
          return res.status(403).json({ error: 'Payment required before download', code: 'INVOICE_UNPAID', invoiceNumber: invoice.invoiceNumber });
        }
      }

      if (!shareEntry.allowDownload) {
        return res.status(403).json({ error: 'Download not enabled for this file' });
      }
    }

    // Generate signed download URL with original filename for proper download
    const downloadUrl = await storageAdapter.getSignedDownloadUrl(file.storageKey, {
      filename: file.originalFilename,
      ttl: 900,
      forceDownload: true
    });

    // Record access
    await file.recordDownload();

    // Get version history if applicable
    let versionHistory = [];
    if (file.baseFileId) {
      versionHistory = await ProjectFile.getVersionHistory(projectId, file.baseFileId);
    }

    res.status(200).json({
      file: file.toObject(),
      downloadUrl,
      versionHistory,
      urlExpiresIn: 900,
    });
  } catch (error) {
    console.error('❌ Error fetching file details:', error);
    res.status(500).json({ error: 'Failed to fetch file details', details: error.message });
  }
};

/**
 * @desc    Archive a file (soft delete)
 * @route   POST /api/projects/:id/files/:fileId/archive
 * @access  Protected (Project Collaborators Only)
 */
export const archiveFile = async (req, res) => {
  try {
    const { id: projectId, fileId } = req.params;
    const userId = req.userId;

    const { role } = await getProjectRole(projectId, userId);
    if (!role) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check generic delete permission (Archiving is treated as delete)
    if (!checkPermission(role, PERMISSIONS.FILE_DELETE)) {
      return res.status(403).json({ error: 'You do not have permission to archive files' });
    }

    const file = await ProjectFile.findOne({ fileId, projectId });
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const project = await Project.findById(projectId).select('ownerId').lean();
    const isProjectOwner = String(project.ownerId) === String(userId);

    if (!isProjectOwner && file.uploaderId !== userId) {
      return res.status(403).json({ error: 'Only the uploader or project owner can archive this file' });
    }

    file.status = 'archived';
    await file.save();

    const io = req.app?.get('io');
    if (io) {
      io.to(`project-${projectId}`).emit('project:files:archived', { fileId });
    }

    res.status(200).json({
      success: true,
      message: 'File archived successfully',
      fileId,
    });
  } catch (error) {
    console.error('❌ Error archiving file:', error);
    res.status(500).json({ error: 'Failed to archive file', details: error.message });
  }
};

/**
 * @desc    Restore archived file
 * @route   POST /api/projects/:id/files/:fileId/restore
 * @access  Protected (Project Collaborators Only)
 */
export const restoreFile = async (req, res) => {
  try {
    const { id: projectId, fileId } = req.params;
    const userId = req.userId;

    const { role } = await getProjectRole(projectId, userId);
    if (!role) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check generic delete permission (Restoring is treated as delete/manage)
    if (!checkPermission(role, PERMISSIONS.FILE_DELETE)) {
      return res.status(403).json({ error: 'You do not have permission to restore files' });
    }

    const file = await ProjectFile.findOne({ fileId, projectId, status: 'archived' });
    if (!file) {
      return res.status(404).json({ error: 'Archived file not found' });
    }

    file.status = 'active';
    await file.save();

    const io = req.app?.get('io');
    if (io) {
      io.to(`project-${projectId}`).emit('project:files:restored', { fileId });
    }

    res.status(200).json({
      success: true,
      message: 'File restored successfully',
      file,
    });
  } catch (error) {
    console.error('❌ Error restoring file:', error);
    res.status(500).json({ error: 'Failed to restore file', details: error.message });
  }
};

/**
 * @desc    Permanently delete a file
 * @route   DELETE /api/projects/:id/files/:fileId
 * @access  Protected (Project Owner Only)
 */
export const deleteFile = async (req, res) => {
  try {
    const { id: projectId, fileId } = req.params;
    const userId = req.userId;

    // RBAC Check
    const { role } = await getProjectRole(projectId, userId);
    if (!role) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check generic delete permission
    if (!checkPermission(role, PERMISSIONS.FILE_DELETE)) {
      return res.status(403).json({ error: 'You do not have permission to delete files' });
    }

    // Fetch the file
    const file = await ProjectFile.findOne({ fileId, projectId });
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Ownership Check for non-owners
    const project = await Project.findById(projectId).select('ownerId').lean();
    const isProjectOwner = String(project.ownerId) === String(userId);

    if (!isProjectOwner && file.uploaderId !== userId) {
      return res.status(403).json({ error: 'You can only delete files you uploaded' });
    }

    // Delete from storage
    try {
      await storageAdapter.deleteFile(file.storageKey);
    } catch (storageError) {
      console.error('⚠️ Failed to delete from storage:', storageError);
    }

    // Delete from database
    await ProjectFile.deleteOne({ _id: file._id });

    // Audit Log
    await logAudit({
      userId,
      action: 'delete_file',
      resourceType: 'project',
      resourceId: projectId,
      details: { fileId, filename: file.filename, storageKey: file.storageKey },
      req
    });

    const io = req.app?.get('io');
    if (io) {
      io.to(`project-${projectId}`).emit('project:files:deleted', { fileId });
    }

    res.status(200).json({
      success: true,
      message: 'File permanently deleted',
    });
  } catch (error) {
    console.error('❌ Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file', details: error.message });
  }
};

/**
 * @desc    Get signed download URL for preview
 * @route   GET /api/projects/:id/files/:fileId/preview
 * @access  Protected (Project Collaborators Only)
 */
export const getFilePreviewUrl = async (req, res) => {
  try {
    const { id: projectId, fileId } = req.params;
    const userId = req.userId;

    // RBAC: Check project access
    const { role } = await getProjectRole(projectId, userId);
    if (!role) {
      return res.status(403).json({ error: 'Access denied. You are not a collaborator on this project.' });
    }

    if (!checkPermission(role, PERMISSIONS.FILE_VIEW)) {
      return res.status(403).json({ error: 'You do not have permission to view files.' });
    }

    // Entitlement check is now handled by middleware

    const file = await ProjectFile.findOne({ fileId, projectId });
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Generate signed URL with shorter TTL for preview (opens in browser)
    const previewUrl = await storageAdapter.getSignedDownloadUrl(file.storageKey, {
      filename: file.originalFilename,
      ttl: 600,
      forceDownload: false,  // Allow preview in browser
      contentType: file.mimeType  // Ensure correct MIME type
    });

    res.status(200).json({
      previewUrl,
      mimeType: file.mimeType,
      filename: file.filename,
      isPreviewable: file.isPreviewable,
      expiresIn: 600,
    });
  } catch (error) {
    console.error('❌ Error generating preview URL:', error);
    res.status(500).json({ error: 'Failed to generate preview URL', details: error.message });
  }
};
