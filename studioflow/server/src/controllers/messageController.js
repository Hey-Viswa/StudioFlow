import Message from '../models/Message.js';
import Project from '../models/Project.js';
import { getIO } from '../config/socket.js';
import { createNotificationWithIdempotency } from '../services/notificationServiceV2.js';
import { createAppwriteNotification, isAppwriteAvailable } from '../config/appwrite.js';

/**
 * @desc    Get messages for a project
 * @route   GET /api/projects/:projectId/messages
 * @access  Protected (Project members only)
 */
export const getMessages = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;
    const { page = 1, limit = 50, parentId } = req.query;

    // Verify project access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.isMember(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build query
    const query = {
      projectId,
      deleted: false
    };

    // Filter by thread
    if (parentId) {
      query.parentId = parentId;
    } else {
      query.parentId = null; // Top-level messages only
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Message.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Message.countDocuments(query)
    ]);

    // Get reply counts for top-level messages
    if (!parentId) {
      const messageIds = messages.map(m => m._id);
      const replyCounts = await Message.aggregate([
        {
          $match: {
            parentId: { $in: messageIds },
            deleted: false
          }
        },
        {
          $group: {
            _id: '$parentId',
            count: { $sum: 1 }
          }
        }
      ]);

      const replyCountMap = {};
      replyCounts.forEach(rc => {
        replyCountMap[rc._id.toString()] = rc.count;
      });

      messages.forEach(msg => {
        msg.replyCount = replyCountMap[msg._id.toString()] || 0;
      });
    }

    res.json({
      messages: messages.reverse(), // Oldest first for chat display
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

/**
 * @desc    Send a message
 * @route   POST /api/projects/:projectId/messages
 * @access  Protected (Project members only)
 */
export const sendMessage = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;
    const { body, parentId, mentions = [], attachments = [] } = req.body;

    // Validation
    if (!body || body.trim().length === 0) {
      return res.status(400).json({ error: 'Message body is required' });
    }

    // Verify project access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.isMember(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get author name
    const member = project.members.find(m => m.userId === userId);
    const authorName = member?.name || 'Unknown';

    // Check thread depth if replying
    let threadDepth = 0;
    if (parentId) {
      const parentMessage = await Message.findById(parentId);
      if (!parentMessage) {
        return res.status(404).json({ error: 'Parent message not found' });
      }
      threadDepth = parentMessage.threadDepth + 1;
      if (threadDepth > 2) {
        return res.status(400).json({ error: 'Maximum thread depth exceeded' });
      }
    }

    // Step 1: Create message in database
    const message = await Message.create({
      projectId,
      authorId: userId,
      authorName,
      body,
      parentId: parentId || null,
      threadDepth,
      mentions: mentions.map(m => ({
        userId: m.userId,
        name: m.name
      })),
      attachments: attachments.map(a => ({
        type: a.type,
        url: a.url,
        filename: a.filename,
        size: a.size,
        mimeType: a.mimeType
      }))
    });

    console.log(`✅ Message created: ${message._id} in project ${projectId}`);

    // Step 2: Emit realtime event via Socket.IO or Appwrite
    setImmediate(async () => {
      try {
        if (isAppwriteAvailable()) {
          // Try Appwrite first
          await createAppwriteNotification({
            userId: 'broadcast', // Special case for project messages
            type: 'message-sent',
            title: `New message in ${project.title}`,
            message: `${authorName}: ${body.substring(0, 100)}`,
            link: `/dashboard/projects/${projectId}`,
            metadata: {
              projectId,
              messageId: message._id.toString(),
              authorId: userId
            },
            category: 'message'
          });
        } else {
          // Fallback to Socket.IO
          const io = getIO();
          if (io) {
            io.to(`project-${projectId}`).emit('message:new', {
              message: message.toObject()
            });
            console.log(`📡 Realtime message sent to project-${projectId}`);
          }
        }
      } catch (realtimeError) {
        console.error('⚠️  Realtime emit error:', realtimeError.message);
      }
    });

    // Step 3: Create notifications for mentioned users
    if (mentions && mentions.length > 0) {
      const mentionedUserIds = mentions
        .map(m => m.userId)
        .filter(uid => uid !== userId); // Don't notify yourself

      if (mentionedUserIds.length > 0) {
        setImmediate(async () => {
          try {
            await createNotificationWithIdempotency({
              projectId,
              recipients: mentionedUserIds,
              type: 'message-mention',
              title: '🔔 You were mentioned',
              message: `${authorName} mentioned you: ${body.substring(0, 100)}`,
              link: `/dashboard/projects/${projectId}`,
              priority: 'high',
              category: 'message',
              sendEmail: true,
              metadata: {
                projectId,
                messageId: message._id.toString(),
                authorId: userId,
                authorName
              },
              eventType: 'message-mention',
              idempotencyKey: `message-mention-${message._id}-${Date.now()}`
            });
          } catch (notifError) {
            console.error('⚠️  Notification error:', notifError.message);
          }
        });
      }
    }

    res.status(201).json({
      message: message.toObject(),
      success: true
    });
  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

/**
 * @desc    Edit a message
 * @route   PATCH /api/projects/:projectId/messages/:messageId
 * @access  Protected (Message author only)
 */
export const editMessage = async (req, res) => {
  try {
    const { projectId, messageId } = req.params;
    const userId = req.userId;
    const { body } = req.body;

    if (!body || body.trim().length === 0) {
      return res.status(400).json({ error: 'Message body is required' });
    }

    const message = await Message.findOne({
      _id: messageId,
      projectId,
      deleted: false
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.authorId !== userId) {
      return res.status(403).json({ error: 'Only message author can edit' });
    }

    message.body = body;
    message.edited = true;
    message.editedAt = new Date();
    await message.save();

    // Emit realtime update
    const io = getIO();
    if (io) {
      io.to(`project-${projectId}`).emit('message:updated', {
        message: message.toObject()
      });
    }

    res.json({
      message: message.toObject(),
      success: true
    });
  } catch (error) {
    console.error('❌ Edit message error:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
};

/**
 * @desc    Delete a message
 * @route   DELETE /api/projects/:projectId/messages/:messageId
 * @access  Protected (Message author or project owner)
 */
export const deleteMessage = async (req, res) => {
  try {
    const { projectId, messageId } = req.params;
    const userId = req.userId;

    const [message, project] = await Promise.all([
      Message.findOne({ _id: messageId, projectId, deleted: false }),
      Project.findById(projectId)
    ]);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only author or project owner can delete
    if (message.authorId !== userId && !project.isOwner(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    message.deleted = true;
    message.deletedAt = new Date();
    await message.save();

    // Emit realtime update
    const io = getIO();
    if (io) {
      io.to(`project-${projectId}`).emit('message:deleted', {
        messageId: message._id
      });
    }

    res.json({
      success: true,
      message: 'Message deleted'
    });
  } catch (error) {
    console.error('❌ Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

/**
 * @desc    Add reaction to message
 * @route   POST /api/projects/:projectId/messages/:messageId/reactions
 * @access  Protected (Project members only)
 */
export const addReaction = async (req, res) => {
  try {
    const { projectId, messageId } = req.params;
    const userId = req.userId;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    const message = await Message.findOne({
      _id: messageId,
      projectId,
      deleted: false
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Remove existing reaction from this user with same emoji
    message.reactions = message.reactions.filter(
      r => !(r.userId === userId && r.emoji === emoji)
    );

    // Add new reaction
    message.reactions.push({
      userId,
      emoji,
      createdAt: new Date()
    });

    await message.save();

    // Emit realtime update
    const io = getIO();
    if (io) {
      io.to(`project-${projectId}`).emit('message:reaction', {
        messageId: message._id,
        reactions: message.reactions
      });
    }

    res.json({
      reactions: message.reactions,
      success: true
    });
  } catch (error) {
    console.error('❌ Add reaction error:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
};

export default {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction
};
