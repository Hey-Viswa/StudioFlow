import Notification from '../models/Notification.js';
import { getIO } from '../config/socket.js';
import { emailQueue } from '../config/queue.js';
import crypto from 'crypto';
import { processNotificationEvent } from './notificationService.js';

// In-memory idempotency cache (use Redis in production)
const idempotencyCache = new Map();
const IDEMPOTENCY_TTL = 3600000; // 1 hour

// Cleanup expired keys periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of idempotencyCache.entries()) {
    if (now - value.timestamp > IDEMPOTENCY_TTL) {
      idempotencyCache.delete(key);
    }
  }
}, 300000); // Every 5 minutes

/**
 * Generate idempotency key from event data
 */
const generateIdempotencyKey = (eventType, projectId, userId, actionType) => {
  const data = `${eventType}:${projectId}:${userId}:${actionType}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Check if notification already exists (idempotency)
 */
const checkIdempotency = async (idempotencyKey) => {
  // Check cache first
  if (idempotencyCache.has(idempotencyKey)) {
    const cached = idempotencyCache.get(idempotencyKey);
    console.log(`⏭️  Skipping duplicate notification: ${idempotencyKey}`);
    return cached.notificationId;
  }

  // Check database for recent similar notifications (last 1 hour)
  const oneHourAgo = new Date(Date.now() - IDEMPOTENCY_TTL);
  const existing = await Notification.findOne({
    idempotencyKey,
    createdAt: { $gte: oneHourAgo }
  });

  if (existing) {
    console.log(`⏭️  Found existing notification in DB: ${existing._id}`);
    idempotencyCache.set(idempotencyKey, {
      notificationId: existing._id.toString(),
      timestamp: Date.now()
    });
    return existing._id.toString();
  }

  return null;
};

/**
 * Centralized notification creation helper
 * Ensures: DB write first, then realtime emit, then email queue
 */
import { notificationQueue } from '../queues/notificationQueue.js';

// ... (keep imports)

// ... (keep idempotency cache logic)

/**
 * Centralized notification creation helper
 * Pushes job to Redis queue for processing by the worker
 */
export const createNotificationWithIdempotency = async ({
  // Standard params
  projectId,
  recipients = [], // Array of user IDs (optional, if not provided, Rules Engine will determine)
  type,
  title,
  message,
  link = null,
  metadata = {},

  // Optional params
  priority = 'medium',
  category = 'general',
  icon = 'bell',
  sendEmail = false,
  emailTemplate = 'notification',

  // Idempotency
  idempotencyKey = null,
  eventType = null, // e.g., 'project-deleted', 'task-assigned'
  actorId = null // ID of the user who triggered the event
}) => {
  try {
    // Generate idempotency key if not provided
    const idemKey = idempotencyKey || (
      eventType && projectId && recipients[0]
        ? generateIdempotencyKey(eventType, projectId, recipients[0], type)
        : null
    );

    // Check for duplicates if idempotency key provided
    if (idemKey) {
      const existingId = await checkIdempotency(idemKey);
      if (existingId) {
        return { skipped: true, notificationId: existingId };
      }
    }

    // Prepare job data
    const jobData = {
      type: eventType || type, // Use eventType if available (e.g., 'comment.created')
      actorId,
      data: {
        projectId,
        recipients, // Pass explicit recipients if any
        title,
        message,
        link,
        priority,
        category,
        icon,
        metadata,
        sendEmail,
        emailTemplate,
        ...metadata // Spread metadata into top-level data for easier access in worker
      }
    };



    // Check if queue is enabled
    if (process.env.ENABLE_REDIS_QUEUE !== 'true') {
      console.log(`DIRECT MODE: Processing notification ${jobData.type} immediately.`);
      await processNotificationEvent(jobData.type, jobData.data, jobData.actorId);
      return {
        success: true,
        queued: false,
        message: 'Processed directly'
      };
    }

    // Add to Redis Queue
    const job = await notificationQueue.add(jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: true
    });

    console.log(`✅ Notification job enqueued: ${job.id} (Type: ${jobData.type})`);

    // Cache for idempotency (using job ID as placeholder)
    if (idemKey) {
      idempotencyCache.set(idemKey, {
        notificationId: `job-${job.id}`,
        timestamp: Date.now()
      });
    }

    return {
      success: true,
      jobId: job.id,
      queued: true
    };
  } catch (error) {
    console.error('❌ Enqueue notification error:', error);

    // Fallback: If Redis fails, maybe we should log it or try direct DB write?
    // For now, just return error
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Legacy wrapper for backward compatibility
 */
export const createNotification = async (options) => {
  const recipients = options.userId ? [options.userId] : options.recipients || [];
  return createNotificationWithIdempotency({
    ...options,
    recipients,
    metadata: options.meta || options.metadata || {}
  });
};

/**
 * Bulk notification creation with idempotency
 */
export const createBulkNotifications = async ({
  userIds,
  type,
  title,
  message,
  link = null,
  priority = 'medium',
  category = 'general',
  sendEmail = false,
  metadata = {}
}) => {
  return createNotificationWithIdempotency({
    recipients: userIds,
    type,
    title,
    message,
    link,
    priority,
    category,
    sendEmail,
    metadata
  });
};

/**
 * Get notifications for a user with pagination
 */
export const listNotifications = async (userId, {
  page = 1,
  limit = 20,
  unreadOnly = false,
  type = null
} = {}) => {
  try {
    const query = { userId };

    if (unreadOnly) {
      query.read = false;
    }

    if (type) {
      query.type = type;
    }

    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId, read: false })
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    };
  } catch (error) {
    console.error('List notifications error:', error);
    throw error;
  }
};

/**
 * Mark notification(s) as read
 */
export const markAsRead = async (notificationIds, userId) => {
  try {
    const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];

    const result = await Notification.updateMany(
      {
        _id: { $in: ids },
        userId,
        read: false
      },
      {
        $set: { read: true, readAt: new Date() }
      }
    );

    console.log(`✅ Marked ${result.modifiedCount} notifications as read`);

    // Emit update event
    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit('notification:updated', {
        ids,
        read: true
      });
    }

    return result;
  } catch (error) {
    console.error('Mark as read error:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = async (userId) => {
  try {
    const result = await Notification.updateMany(
      { userId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    console.log(`✅ Marked all notifications as read for user ${userId}`);

    // Emit update event
    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit('notification:all-read');
    }

    return result;
  } catch (error) {
    console.error('Mark all as read error:', error);
    throw error;
  }
};

/**
 * Delete notification(s)
 */
export const deleteNotifications = async (notificationIds, userId) => {
  try {
    const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];

    const result = await Notification.deleteMany({
      _id: { $in: ids },
      userId
    });

    console.log(`✅ Deleted ${result.deletedCount} notifications`);

    // Emit delete event
    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit('notification:deleted', {
        ids
      });
    }

    return result;
  } catch (error) {
    console.error('Delete notifications error:', error);
    throw error;
  }
};

/**
 * Get unread count for a user
 */
export const getUnreadCount = async (userId) => {
  try {
    return await Notification.countDocuments({ userId, read: false });
  } catch (error) {
    console.error('Get unread count error:', error);
    throw error;
  }
};

/**
 * Delete old read notifications (cleanup job)
 */
export const deleteOldNotifications = async (daysOld = 90) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await Notification.deleteMany({
      read: true,
      createdAt: { $lt: cutoffDate }
    });

    console.log(`🧹 Deleted ${result.deletedCount} old notifications`);
    return result.deletedCount;
  } catch (error) {
    console.error('Delete old notifications error:', error);
    throw error;
  }
};

export default {
  createNotification,
  createNotificationWithIdempotency,
  createBulkNotifications,
  listNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotifications,
  getUnreadCount,
  deleteOldNotifications
};
