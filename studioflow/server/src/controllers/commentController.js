import Project from '../models/Project.js';
import Comment from '../models/Comment.js';
import ProjectFile from '../models/ProjectFile.js';
import storageAdapter from '../utils/storageAdapter.js';
import { createNotificationWithIdempotency } from '../services/notificationServiceV2.js';
import ProjectMember from '../models/ProjectMember.js';
import { checkPermission, PERMISSIONS, ROLES } from '../utils/permissions.js';
import { logAudit } from '../services/auditService.js';
import { taskQueue } from '../queues/automationQueue.js';
// Removed unused feature flags import

/**
 * Enhanced comment controller with threading, reactions, and mentions
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

function extractStorageKeyFromAttachment(att) {
  if (!att) return null;
  if (att.key && typeof att.key === 'string') return att.key;
  if (!att.url || typeof att.url !== 'string') return null;

  try {
    const parsed = new URL(att.url);
    // Signed URLs include object key in pathname. Strip leading slash.
    const pathKey = parsed.pathname?.replace(/^\//, '');
    return pathKey || null;
  } catch {
    return null;
  }
}

export const getComments = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const userId = req.userId;

    const project = await Project.findById(projectId).select('comments members ownerId');
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check access
    const hasAccess = 
      project.ownerId === userId || 
      project.members.some(m => m.userId === userId);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Convert reactions Map to object for JSON serialization
    const comments = project.comments.map(comment => ({
      ...comment.toObject(),
      reactions: comment.reactions ? Object.fromEntries(comment.reactions) : {}
    }));

    // Fetch comments from global collection
    const comments = await Comment.find({ projectId })
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit)
      .lean();

    const allAttachments = comments.flatMap((c) => Array.isArray(c.attachments) ? c.attachments : []);
    const fileIds = [...new Set(allAttachments.map((a) => a?.fileId).filter(Boolean))];
    const storageKeys = [...new Set(allAttachments.map((a) => extractStorageKeyFromAttachment(a)).filter(Boolean))];

    const projectFiles = (fileIds.length > 0 || storageKeys.length > 0)
      ? await ProjectFile.find({
          projectId,
          status: { $ne: 'deleted' },
          $or: [
            ...(fileIds.length > 0 ? [{ fileId: { $in: fileIds } }] : []),
            ...(storageKeys.length > 0 ? [{ storageKey: { $in: storageKeys } }] : [])
          ]
        })
          .select('fileId storageKey filename originalFilename mimeType size')
          .lean()
      : [];

    const fileMap = new Map(projectFiles.map((f) => [f.fileId, f]));
    const keyMap = new Map(projectFiles.map((f) => [f.storageKey, f]));

    // Convert reactions map and normalize/regenerate attachment URLs
    const formattedComments = await Promise.all(comments.map(async (comment) => {
      if (comment.attachments && comment.attachments.length > 0) {
        const resolvedAttachments = await Promise.all(comment.attachments.map(async (att) => {
          const extractedKey = extractStorageKeyFromAttachment(att);
          const fileRecord = (att?.fileId ? fileMap.get(att.fileId) : null) || (extractedKey ? keyMap.get(extractedKey) : null);
          let previewUrl = att.previewUrl || null;
          let url = att.url || null;

          if (fileRecord?.storageKey) {
            try {
              const signed = await storageAdapter.getSignedDownloadUrl(fileRecord.storageKey, {
                filename: fileRecord.originalFilename || fileRecord.filename,
                forceDownload: false,
                contentType: fileRecord.mimeType,
                ttl: 3600
              });
              previewUrl = signed;
              url = signed;
            } catch (err) {
              // Keep existing fields if re-signing fails.
            }
          }

          if (process.env.NODE_ENV === 'production' && url && url.includes('localhost:5000')) {
            url = url.replace(/https?:\/\/localhost:5000/, 'https://www.studioflow.studio');
          }

          return {
            fileId: att.fileId || null,
            filename: att.filename || att.name || fileRecord?.filename || 'Attachment',
            name: att.name || att.filename || fileRecord?.filename || 'Attachment',
            mimeType: att.mimeType || att.type || fileRecord?.mimeType || 'application/octet-stream',
            type: att.type || att.mimeType || fileRecord?.mimeType || 'application/octet-stream',
            size: att.size || fileRecord?.size || 0,
            key: att.key || extractedKey || null,
            url,
            previewUrl
          };
        }));

        comment.attachments = resolvedAttachments;
      }

      // Fix attachment URLs in production (replace localhost with production domain)
      if (process.env.NODE_ENV === 'production' && comment.attachments && comment.attachments.length > 0) {
        comment.attachments = comment.attachments.map(att => {
          if (att.url && att.url.includes('localhost:5000')) {
            return {
              ...att,
              url: att.url.replace(/https?:\/\/localhost:5000/, 'https://www.studioflow.studio')
            };
          }
          return att;
        });
      }

      return {
        ...comment,
        reactions: comment.reactions ? Object.fromEntries(comment.reactions instanceof Map ? comment.reactions : new Map(Object.entries(comment.reactions))) : {}
      };
    }));

    // Log audit event
    await logAudit({
      userId,
      action: 'comment.view',
      resourceType: 'project',
      resourceId: projectId,
      details: {
        page,
        limit
      },
      req
    });

    res.status(200).json({ comments: formattedComments });
  } catch (error) {
    console.error('❌ Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

export const addComment = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { text, parentId, attachments, mentions } = req.body;
    const userId = req.userId;
    const userName = req.userName || '';
    const userEmail = req.userEmail || '';
    const normalizedText = typeof text === 'string' ? text.trim() : '';
    const normalizedAttachments = Array.isArray(attachments)
      ? attachments.map((att) => ({
          fileId: att?.fileId || null,
          filename: att?.filename || att?.name || 'Attachment',
          url: att?.url || null,
          previewUrl: att?.previewUrl || null,
          mimeType: att?.mimeType || att?.type || 'application/octet-stream',
          type: att?.type || att?.mimeType || 'application/octet-stream',
          size: att?.size || 0,
          key: att?.key || null,
        }))
      : [];
    const hasAttachments = normalizedAttachments.length > 0;

    if (!normalizedText && !hasAttachments) {
      return res.status(400).json({ error: 'Comment text or attachment is required' });
    }

    const project = await Project.findById(projectId).select('comments members ownerId');
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check access
    const hasAccess = 
      project.ownerId === userId || 
      project.members.some(m => m.userId === userId);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate parent comment if replying
    if (parentId) {
      const parentExists = project.comments.some(c => c._id.toString() === parentId);
      if (!parentExists) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
    }

    const newComment = {
      userId,
      userName,
      userEmail,
      content: normalizedText || 'Attachment',
      parentId: parentId || null,
      reactions: new Map(),
      attachments: normalizedAttachments,
      mentions: mentions || [],
      createdAt: new Date()
    };

    project.comments.push(newComment);
    await project.save();

    const addedComment = project.comments[project.comments.length - 1];
    const commentObj = {
      ...addedComment.toObject(),
      reactions: {}
    };

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`project-${projectId}`).emit('comment:added', {
        projectId,
        comment: commentObj
      });
    }

    // Notify project owner and mentioned users
    try {
      // Import dynamically to avoid circular dependency issues
      const { triggerNotification } = await import('../services/notificationService.js');

      await triggerNotification(
        'comment.created',
        {
          projectId,
          commentId: commentObj._id,
          commenterName: userName,
          text: normalizedText,
          title: '💬 New Comment', // Worker will override if mentioned
          message: normalizedText
            ? `${userName} commented: ${normalizedText.substring(0, 100)}${normalizedText.length > 100 ? '...' : ''}`
            : `${userName} added an attachment`,
          link: `/dashboard/projects/${projectId}?tab=comments`,
          priority: 'medium', // Worker will override if mentioned
          category: 'comment',
          metadata: {
            projectId,
            commentId: commentObj._id,
            commenterName: userName
          }
        });
      }
    } catch (notifError) {
      console.error('Error sending comment notifications:', notifError);
    }

    // --- AUTOMATION HOOK: Task Creation ---
    // Enqueue job for async process OR run direct if queue disabled/err
    // Always run for explicit task tags to keep #todo/#bug reliable in production.
    const lowerText = normalizedText.toLowerCase();
    const hasTaskTag = lowerText.includes('#todo') || lowerText.includes('#bug');
    if (hasTaskTag) {
      const automationPayload = {
        commentId: newComment._id,
        projectId,
        content: normalizedText,
        userId,
        link: `/dashboard/projects/${projectId}?tab=comments`
      };

      try {
        // console.log(`🔍 SB_DEBUG: ENABLE_REDIS_QUEUE = "${process.env.ENABLE_REDIS_QUEUE}"`);
        let queued = false;

        // TEMPORARY FIX: Force direct execution to ensure reliability in production until Redis worker is verified
        // if (process.env.ENABLE_REDIS_QUEUE === 'true') {
        //   try {
        //     taskQueue.add(automationPayload, {
        //       attempts: 3,
        //       backoff: { type: 'exponential', delay: 2000 },
        //       removeOnComplete: true
        //     });
        //     // console.log(`🚀 Queued task automation for comment ${newComment._id}`);
        //     queued = true;
        //   } catch (qErr) {
        //     console.warn('⚠️ Redis queue add failed, falling back to direct:', qErr.message);
        //   }
        // }

        if (!queued) {
          // Direct execution fallback
          // console.log('ℹ️ SB_DEBUG: Running task automation directly (No Queue)');
          try {
            const automationService = (await import('../services/automationService.js')).default;
            await automationService.processTaskAutomation(automationPayload);
            // console.log('SB_DEBUG: Direct automation finished successfully');
          } catch (directErr) {
            console.error('❌ Automation error:', directErr);
          }
        }
      } catch (queueError) {
        console.error('⚠️ Failed to enqueue task automation job:', queueError.message);
      }
    }

    res.status(201).json({ comment: commentObj });
  } catch (error) {
    console.error('❌ Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

export const updateComment = async (req, res) => {
  try {
    const { id: projectId, commentId } = req.params;
    const { text } = req.body;
    const userId = req.userId;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const comment = project.comments.id(commentId);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Only owner can edit
    if (comment.userId !== userId && project.ownerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    comment.text = text.trim();
    comment.edited = true;
    comment.editedAt = new Date();

    await project.save();

    const commentObj = {
      ...comment.toObject(),
      reactions: comment.reactions ? Object.fromEntries(comment.reactions) : {}
    };

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`project-${projectId}`).emit('comment:updated', {
        projectId,
        comment: commentObj
      });
    }

    res.status(200).json({ comment: commentObj });
  } catch (error) {
    console.error('❌ Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { id: projectId, commentId } = req.params;
    const userId = req.userId;

    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const comment = project.comments.id(commentId);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Only owner or project owner can delete
    if (comment.userId !== userId && project.ownerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Remove comment and all its replies
    const removeCommentAndReplies = (commentId) => {
      project.comments = project.comments.filter(c => {
        if (c._id.toString() === commentId) return false;
        if (c.parentId === commentId) {
          removeCommentAndReplies(c._id.toString());
          return false;
        }
        return true;
      });
    };

    removeCommentAndReplies(commentId);
    await project.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`project-${projectId}`).emit('comment:deleted', {
        projectId,
        commentId
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

export const reactToComment = async (req, res) => {
  try {
    const { id: projectId, commentId } = req.params;
    const { emoji } = req.body;
    const userId = req.userId;

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const comment = project.comments.id(commentId);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Initialize reactions if needed
    if (!comment.reactions) {
      comment.reactions = new Map();
    }

    // Get current users for this emoji
    const users = comment.reactions.get(emoji) || [];
    const userIndex = users.indexOf(userId);

    if (userIndex > -1) {
      // Remove reaction
      users.splice(userIndex, 1);
      if (users.length === 0) {
        comment.reactions.delete(emoji);
      } else {
        comment.reactions.set(emoji, users);
      }
    } else {
      // Add reaction
      users.push(userId);
      comment.reactions.set(emoji, users);
    }

    await project.save();

    const commentObj = {
      ...comment.toObject(),
      reactions: Object.fromEntries(comment.reactions)
    };

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`project-${projectId}`).emit('comment:updated', {
        projectId,
        comment: commentObj
      });
    }

    res.status(200).json({ reactions: commentObj.reactions });
  } catch (error) {
    console.error('❌ Error reacting to comment:', error);
    res.status(500).json({ error: 'Failed to react to comment' });
  }
};

export const resolveComment = async (req, res) => {
  try {
    const { id: projectId, commentId } = req.params;
    const userId = req.userId;

    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only project owner can resolve
    if (project.ownerId !== userId) {
      return res.status(403).json({ error: 'Only project owner can resolve comments' });
    }

    const comment = project.comments.id(commentId);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    comment.isResolved = true;
    comment.resolvedBy = userId;
    comment.resolvedAt = new Date();

    await project.save();

    const commentObj = {
      ...comment.toObject(),
      reactions: comment.reactions ? Object.fromEntries(comment.reactions) : {}
    };

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`project-${projectId}`).emit('comment:updated', {
        projectId,
        comment: commentObj
      });
    }

    res.status(200).json({ comment: commentObj });
  } catch (error) {
    console.error('❌ Error resolving comment:', error);
    res.status(500).json({ error: 'Failed to resolve comment' });
  }
};
