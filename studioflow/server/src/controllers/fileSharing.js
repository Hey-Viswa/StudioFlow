import crypto from 'crypto';
import ProjectFile from '../models/ProjectFile.js';
import Project from '../models/Project.js';
import storageAdapter from '../utils/storageAdapter.js';

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
    const { id: projectId, fileId } = req.params;
    const { clientId, allowDownload = false, expiresInDays = 7 } = req.body;
    const userId = req.userId;

    // Only project owner can share files
    const project = await Project.findById(projectId).select('ownerId members').lean();
    if (!project || project.ownerId !== userId) {
      return res.status(403).json({ error: 'Only project owner can share files' });
    }

    // Verify client is a member
    const isClient = project.members.some(
      m => m.userId === clientId && m.role === 'client'
    );
    if (!isClient) {
      return res.status(400).json({ error: 'User is not a client on this project' });
    }

    const file = await ProjectFile.findOne({ fileId, projectId });
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Generate share token
    const shareToken = generateShareToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Add to file's shared access
    if (!file.sharedWith) {
      file.sharedWith = [];
    }

    file.sharedWith.push({
      userId: clientId,
      shareToken,
      allowDownload,
      expiresAt,
      sharedBy: userId,
      sharedAt: new Date(),
    });

    await file.save();

    const shareUrl = `${process.env.FRONTEND_URL}/shared/files/${shareToken}`;

    res.status(200).json({
      success: true,
      shareToken,
      shareUrl,
      expiresAt,
      allowDownload,
      message: 'File shared successfully',
    });
  } catch (error) {
    console.error('❌ Error sharing file:', error);
    res.status(500).json({ error: 'Failed to share file' });
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

    // Check expiration
    if (new Date() > shareEntry.expiresAt) {
      return res.status(403).json({ error: 'Share link has expired' });
    }

    // Verify user is the intended recipient
    if (shareEntry.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate preview URL (always preview, never download unless allowed)
    const previewUrl = await storageAdapter.getSignedDownloadUrl(file.storageKey, {
      filename: file.originalFilename,
      ttl: 600,
      forceDownload: false, // Preview only
    });

    let downloadUrl = null;
    if (shareEntry.allowDownload) {
      downloadUrl = await storageAdapter.getSignedDownloadUrl(file.storageKey, {
        filename: file.originalFilename,
        ttl: 600,
        forceDownload: true,
      });
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
    const { id: projectId, fileId } = req.params;
    const { clientId } = req.body;
    const userId = req.userId;

    const project = await Project.findById(projectId).select('ownerId').lean();
    if (!project || project.ownerId !== userId) {
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
    const { id: projectId, fileId } = req.params;
    const { clientId } = req.body;
    const userId = req.userId;

    const project = await Project.findById(projectId).select('ownerId').lean();
    if (!project || project.ownerId !== userId) {
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
