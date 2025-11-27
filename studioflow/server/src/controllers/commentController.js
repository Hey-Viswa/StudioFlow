import Project from '../models/Project.js';
import { createNotificationWithIdempotency } from '../services/notificationServiceV2.js';

/**
 * Enhanced comment controller with threading, reactions, and mentions
 */

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

    res.status(200).json({ comments });
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

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
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
      text: text.trim(),
      parentId: parentId || null,
      reactions: new Map(),
      attachments: attachments || [],
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
      const notifyUserIds = [];
      
      // Notify project owner if not the commenter
      if (project.ownerId !== userId) {
        notifyUserIds.push(project.ownerId);
      }
      
      // Notify mentioned users
      if (mentions && mentions.length > 0) {
        mentions.forEach(mentionedUserId => {
          if (mentionedUserId !== userId && !notifyUserIds.includes(mentionedUserId)) {
            notifyUserIds.push(mentionedUserId);
          }
        });
      }
      
      // Notify parent comment author if replying
      if (parentId) {
        const parentComment = project.comments.id(parentId);
        if (parentComment && parentComment.userId !== userId && !notifyUserIds.includes(parentComment.userId)) {
          notifyUserIds.push(parentComment.userId);
        }
      }
      
      if (notifyUserIds.length > 0) {
        await createBulkNotifications({
          userIds: notifyUserIds,
          type: mentions && mentions.length > 0 ? 'comment-mentioned' : 'comment-added',
          title: mentions && mentions.length > 0 ? '🔔 You were mentioned' : '💬 New Comment',
          message: `${userName} commented: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`,
          link: `/dashboard/projects/${projectId}`,
          priority: mentions && mentions.length > 0 ? 'high' : 'medium',
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
