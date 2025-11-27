import Notification from '../models/Notification.js';
import { getIO } from '../config/socket.js';
import { emailQueue } from '../config/queue.js';

/**
 * Create a new notification and emit real-time event
 * @param {Object} data - Notification data
 * @returns {Promise<Object>} Created notification
 */
export const createNotification = async ({
  userId,
  type,
  title,
  message,
  link = null,
  meta = {},
  icon = 'bell',
  priority = 'normal',
  sendEmail = false,
  emailTemplate = null
}) => {
  try {
    // Create notification in database
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      link,
      meta,
      icon,
      priority
    });

    console.log(`✅ Notification created: ${notification._id} for user ${userId}`);

    // Emit real-time event via Socket.IO
    try {
      const io = getIO();
      if (io) {
        io.to(`user:${userId}`).emit('notification:new', {
          notification: notification.toObject()
        });
        console.log(`📡 Real-time notification sent to user:${userId}`);
      }
    } catch (socketError) {
      console.error('Socket.IO emit error:', socketError.message);
      // Non-critical error, continue
    }

    // Enqueue email if requested
    if (sendEmail) {
      try {
        await emailQueue.add('send-notification-email', {
          notificationId: notification._id.toString(),
          userId,
          type,
          title,
          message,
          link,
          template: emailTemplate || 'notification'
        }, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        });
        console.log(`📧 Email job enqueued for notification ${notification._id}`);
      } catch (emailError) {
        console.error('Email queue error:', emailError.message);
        // Non-critical error, notification still created
      }
    }

    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
};

/**
 * Create bulk notifications (e.g., for broadcasting)
 * @param {Array} notifications - Array of notification objects
 * @returns {Promise<Array>} Created notifications
 */
export const createBulkNotifications = async (notifications) => {
  try {
    const created = await Notification.insertMany(notifications);
    
    // Emit real-time events for each
    const io = getIO();
    if (io) {
      created.forEach(notification => {
        io.to(`user:${notification.userId}`).emit('notification:new', {
          notification: notification.toObject()
        });
      });
    }

    console.log(`✅ ${created.length} bulk notifications created`);
    return created;
  } catch (error) {
    console.error('Bulk notification error:', error);
    throw error;
  }
};

/**
 * Get notifications for a user with pagination
 * @param {String} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Notifications and metadata
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
 * @param {String|Array} notificationIds - Single ID or array of IDs
 * @param {String} userId - User ID (for security check)
 * @returns {Promise<Object>} Update result
 */
export const markAsRead = async (notificationIds, userId) => {
  try {
    const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];

    const result = await Notification.updateMany(
      {
        _id: { $in: ids },
        userId, // Security: only mark user's own notifications
        read: false
      },
      {
        $set: { read: true }
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
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Update result
 */
export const markAllAsRead = async (userId) => {
  try {
    const result = await Notification.updateMany(
      { userId, read: false },
      { $set: { read: true } }
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
 * @param {String|Array} notificationIds - Single ID or array of IDs
 * @param {String} userId - User ID (for security check)
 * @returns {Promise<Object>} Delete result
 */
export const deleteNotifications = async (notificationIds, userId) => {
  try {
    const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];

    const result = await Notification.deleteMany({
      _id: { $in: ids },
      userId // Security: only delete user's own notifications
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
 * @param {String} userId - User ID
 * @returns {Promise<Number>} Unread count
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
 * @param {Number} daysOld - Delete notifications older than this many days
 * @returns {Promise<Number>} Number deleted
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

// Export all functions
export default {
  createNotification,
  createBulkNotifications,
  listNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotifications,
  getUnreadCount,
  deleteOldNotifications
};
