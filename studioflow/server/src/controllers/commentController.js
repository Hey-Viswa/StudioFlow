import Project from '../models/Project.js';
import Comment from '../models/Comment.js';
import { createNotificationWithIdempotency } from '../services/notificationServiceV2.js';
import ProjectMember from '../models/ProjectMember.js';
import { checkPermission, PERMISSIONS, ROLES } from '../utils/permissions.js';
import { logAudit } from '../services/auditService.js';

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

export const getComments = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const project = await Project.findById(projectId).select('ownerId settings');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // RBAC: Check project access
    const { role } = await getProjectRole(projectId, userId);
    if (!role) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!checkPermission(role, PERMISSIONS.PROJECT_VIEW)) {
      return res.status(403).json({ error: 'You do not have permission to view comments.' });
    }

    // Fetch comments from global collection
    const comments = await Comment.find({ projectId })
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit)
      .lean();

    // Convert reactions Map to object
    const formattedComments = comments.map(comment => ({
      ...comment,
      reactions: comment.reactions ? Object.fromEntries(comment.reactions instanceof Map ? comment.reactions : new Map(Object.entries(comment.reactions))) : {}
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
    const { text, parentId, attachments, mentions, clientGeneratedId } = req.body;
    const userId = req.userId;
    const userName = req.userName || '';
    const userEmail = req.userEmail || '';

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const project = await Project.findById(projectId).select('ownerId settings stats');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Idempotency check (if clientGeneratedId provided)
    if (clientGeneratedId) {
      // Optional: Check if comment with this clientGeneratedId exists for this user/project
      // const existing = await Comment.findOne({ projectId, userId, clientGeneratedId });
      // if (existing) return res.status(200).json({ comment: existing });
    }

    // RBAC: Check project access and comment permission
    const { role } = await getProjectRole(projectId, userId);
    if (!role) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!checkPermission(role, PERMISSIONS.COMMENT_CREATE)) {
      return res.status(403).json({ error: 'You do not have permission to add comments.' });
    }

    // Validate parent comment if replying
    if (parentId) {
      const parentExists = await Comment.exists({ _id: parentId, projectId });
      if (!parentExists) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
    }

    const newComment = await Comment.create({
      projectId,
      userId,
      userName,
      userEmail,
      content: text.trim(),
      parentId: parentId || null,
      clientGeneratedId: clientGeneratedId || null,
      reactions: new Map(),
      attachments: attachments || [],
      mentions: mentions || [],
      createdAt: new Date()
    });

    // Log audit event
    await logAudit({
      userId,
      action: 'comment.create',
      resourceType: 'comment',
      resourceId: newComment._id,
      details: {
        projectId,
        parentId: parentId || null,
        hasAttachments: (attachments && attachments.length > 0)
      },
      req
    });

    // Update project stats
    await Project.updateOne({ _id: projectId }, { $inc: { 'stats.commentCount': 1 } });

    const commentObj = {
      ...newComment.toObject(),
      reactions: {}
    };

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${projectId}`).emit('comment:added', {
        projectId,
        comment: commentObj
      });
    }

    // Notify project members
    try {
      // Import dynamically to avoid circular dependency issues
      const { triggerNotification } = await import('../services/notificationService.js');

      await triggerNotification(
        'comment.created',
        {
          projectId,
          commentId: commentObj._id,
          commenterName: userName,
          text: text,
          title: '💬 New Comment', // Worker will override if mentioned
          message: `${userName} commented: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`,
          link: `/dashboard/projects/${projectId}?tab=comments`,
          priority: 'medium', // Worker will override if mentioned
          category: 'comment',
          mentions: mentions || []
        },
        userId // Actor
      );
    } catch (notifError) {
      console.error('Error sending comment notifications:', notifError);
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

    const comment = await Comment.findOne({ _id: commentId, projectId });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // RBAC: Check permission
    if (comment.userId !== userId) {
      return res.status(403).json({ error: 'You can only edit your own comments' });
    }

    comment.content = text.trim();
    comment.edited = true;
    comment.editedAt = new Date();

    await comment.save();

    // Log audit event
    await logAudit({
      userId,
      action: 'comment.update',
      resourceType: 'comment',
      resourceId: comment._id,
      details: {
        projectId
      },
      req
    });

    const commentObj = {
      ...comment.toObject(),
      reactions: comment.reactions ? Object.fromEntries(comment.reactions) : {}
    };

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${projectId}`).emit('comment:updated', {
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

    const comment = await Comment.findOne({ _id: commentId, projectId });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // RBAC Check
    const { role } = await getProjectRole(projectId, userId);
    if (!role) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 1. Check if user has generic DELETE_COMMENT permission (e.g. Owner)
    const canDeleteAny = checkPermission(role, PERMISSIONS.COMMENT_DELETE);

    // 2. Check if user has DELETE_OWN_COMMENT permission
    const canDeleteOwn = checkPermission(role, PERMISSIONS.COMMENT_DELETE_OWN);

    if (canDeleteAny) {
      // Allowed to delete any comment
    } else if (canDeleteOwn) {
      // Allowed only if it's their own comment
      if (comment.userId !== userId) {
        return res.status(403).json({ error: 'You can only delete your own comments' });
      }
    } else {
      return res.status(403).json({ error: 'You do not have permission to delete comments' });
    }

    // Delete comment and replies
    await Comment.deleteMany({
      $or: [
        { _id: commentId },
        { parentId: commentId }
      ]
    });

    // Log audit event
    await logAudit({
      userId,
      action: 'comment.delete',
      resourceType: 'comment',
      resourceId: commentId,
      details: {
        projectId
      },
      req
    });

    // Update project stats
    await Project.updateOne({ _id: projectId }, { $inc: { 'stats.commentCount': -1 } });

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${projectId}`).emit('comment:deleted', {
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

    const comment = await Comment.findOne({ _id: commentId, projectId });

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

    await comment.save();

    const commentObj = {
      ...comment.toObject(),
      reactions: Object.fromEntries(comment.reactions)
    };

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${projectId}`).emit('comment:updated', {
        projectId,
        comment: commentObj
      });
    }

    // Log audit event
    await logAudit({
      userId,
      action: 'comment.react',
      resourceType: 'comment',
      resourceId: commentId,
      details: {
        projectId,
        emoji,
        action: userIndex > -1 ? 'removed' : 'added'
      },
      req
    });

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

    const project = await Project.findById(projectId).select('ownerId');
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only project owner can resolve
    if (project.ownerId !== userId) {
      return res.status(403).json({ error: 'Only project owner can resolve comments' });
    }

    const comment = await Comment.findOne({ _id: commentId, projectId });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    comment.isResolved = true;
    comment.resolvedBy = userId;
    comment.resolvedAt = new Date();

    await comment.save();

    // Log audit event
    await logAudit({
      userId,
      action: 'comment.resolve',
      resourceType: 'comment',
      resourceId: commentId,
      details: {
        projectId
      },
      req
    });

    const commentObj = {
      ...comment.toObject(),
      reactions: comment.reactions ? Object.fromEntries(comment.reactions) : {}
    };

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${projectId}`).emit('comment:updated', {
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
