import Notification from '../models/Notification.js';
import { getIO } from '../config/socket.js';
import { sendEmail, isMessagingAvailable } from '../config/appwriteMessaging.js';
import { sendPushNotification as sendFCMPush, isFirebaseAvailable } from '../config/firebase.js';
import { emailQueue } from '../config/queue.js';
import crypto from 'crypto';

// In-memory cache for idempotency (use Redis in production)
const idempotencyCache = new Map();
const CACHE_TTL = 3600000; // 1 hour

/**
 * Generate idempotency key from event data
 */
const generateIdempotencyKey = (userId, type, metadata) => {
  const data = `${userId}:${type}:${JSON.stringify(metadata)}`;
  return crypto.createHash('md5').update(data).digest('hex');
};

/**
 * Check if notification already exists (idempotency)
 */
const checkIdempotency = async (idempotencyKey) => {
  // Check cache first
  if (idempotencyCache.has(idempotencyKey)) {
    const cached = idempotencyCache.get(idempotencyKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.notificationId;
    }
    idempotencyCache.delete(idempotencyKey);
  }

  // Check database
  const existing = await Notification.findOne({ idempotencyKey });
  if (existing) {
    // Update cache
    idempotencyCache.set(idempotencyKey, {
      notificationId: existing._id,
      timestamp: Date.now()
    });
    return existing._id;
  }

  return null;
};

/**
 * Create notification with idempotency, realtime, and email/push delivery
 * @param {Object} params - Notification parameters
 * @returns {Promise<Object>} Created notification
 */
export const createNotification = async ({
  userId,
  type,
  title,
  message,
  link = null,
  metadata = {},
  priority = 'medium',
  category = 'general',
  sendEmail = false,
  sendPush = false,
  idempotencyKey = null
}) => {
  try {
    // Generate idempotency key if not provided
    if (!idempotencyKey) {
      idempotencyKey = generateIdempotencyKey(userId, type, metadata);
    }

    // Check for duplicate
    const existingId = await checkIdempotency(idempotencyKey);
    if (existingId) {
      console.log(`⏭️  Skipping duplicate notification: ${idempotencyKey}`);
      return await Notification.findById(existingId);
    }

    // Step 1: Persist to database FIRST
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      link,
      metadata,
      priority,
      category,
      idempotencyKey,
      read: false
    });

    console.log(`✅ Notification persisted: ${notification._id} for user ${userId}`);

    // Update idempotency cache
    idempotencyCache.set(idempotencyKey, {
      notificationId: notification._id,
      timestamp: Date.now()
    });

    // Step 2: Emit realtime event (Socket.IO)
    try {
      const io = getIO();
      if (io) {
        io.to(`user:${userId}`).emit('notification:new', {
          notification: notification.toObject()
        });
        console.log(`📡 Realtime notification sent to user:${userId}`);
      }
    } catch (realtimeError) {
      console.error('⚠️  Realtime emit error:', realtimeError.message);
      // Non-critical, continue
    }

    // Step 3: Send email if requested
    if (sendEmail) {
      try {
        await sendNotificationEmail(userId, notification);
      } catch (emailError) {
        console.error('⚠️  Email delivery error:', emailError.message);
        // Non-critical, notification still delivered
      }
    }

    // Step 4: Send push notification if requested
    if (sendPush) {
      try {
        await sendNotificationPush(userId, notification);
      } catch (pushError) {
        console.error('⚠️  Push notification error:', pushError.message);
        // Non-critical, notification still delivered
      }
    }

    return notification;
  } catch (error) {
    console.error('❌ Create notification error:', error);
    throw error;
  }
};

/**
 * Send notification email via Appwrite or fallback
 */
const sendNotificationEmail = async (userId, notification) => {
  try {
    // Get user email (you'll need to implement getUserEmail)
    const userEmail = await getUserEmail(userId);
    if (!userEmail) {
      console.warn(`⚠️  No email found for user ${userId}`);
      return;
    }

    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 20px; margin-top: 20px; border-radius: 8px; }
          .title { font-size: 20px; font-weight: bold; color: #1F2937; margin-bottom: 10px; }
          .message { font-size: 16px; color: #4B5563; margin-bottom: 20px; }
          .button { 
            display: inline-block; 
            background: #4F46E5; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin-top: 10px;
          }
          .footer { text-align: center; margin-top: 30px; color: #9CA3AF; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 StudioFlow Notification</h1>
          </div>
          <div class="content">
            <div class="title">${notification.title}</div>
            <div class="message">${notification.message}</div>
            ${notification.link ? `<a href="${process.env.CLIENT_URL || 'http://localhost:3002'}${notification.link}" class="button">View Details</a>` : ''}
          </div>
          <div class="footer">
            <p>You received this notification from StudioFlow</p>
            <p><a href="${process.env.CLIENT_URL || 'http://localhost:3002'}/dashboard/settings">Manage notification preferences</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (isMessagingAvailable()) {
      // Use Appwrite Messaging
      await sendEmail({
        to: [userEmail],
        subject: notification.title,
        body: emailBody,
        isHtml: true
      });
      console.log(`✅ Notification email sent via Appwrite to ${userEmail}`);
    } else {
      // Fallback to BullMQ + SendGrid
      await emailQueue.add('send-notification-email', {
        notificationId: notification._id.toString(),
        userId,
        userEmail,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        template: 'notification'
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      });
      console.log(`📧 Notification email queued (fallback) for ${userEmail}`);
    }
  } catch (error) {
    console.error('❌ Send notification email error:', error);
    throw error;
  }
};

/**
 * Send push notification via Firebase Cloud Messaging
 */
const sendNotificationPush = async (userId, notification) => {
  if (!isFirebaseAvailable()) {
    console.warn('⚠️  Firebase not configured - push notifications disabled');
    return;
  }

  try {
    // Get user's FCM token from database (you'll need to store this when user registers device)
    const fcmToken = await getUserFCMToken(userId);
    
    if (!fcmToken) {
      console.warn(`⚠️  No FCM token found for user ${userId}`);
      return;
    }

    await sendFCMPush({
      token: fcmToken,
      title: notification.title,
      body: notification.message,
      data: {
        notificationId: notification._id.toString(),
        type: notification.type,
        category: notification.category,
        priority: notification.priority
      },
      link: notification.link ? `${process.env.CLIENT_URL || 'http://localhost:3002'}${notification.link}` : null
    });
    
    console.log(`✅ Push notification sent via FCM to user ${userId}`);
  } catch (error) {
    console.error('❌ Send push notification error:', error);
    // Don't throw - push is non-critical
  }
};

/**
 * Get user's FCM token from database
 * TODO: Implement storage of FCM tokens when users register devices
 */
const getUserFCMToken = async (userId) => {
  try {
    // For now, you'll need to store FCM tokens in your User model or a separate collection
    // Example: const user = await User.findOne({ clerkId: userId });
    // return user?.fcmToken;
    
    // Placeholder: return null until you implement FCM token storage
    return null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

/**
 * Get user email (implement based on your User model)
 */
const getUserEmail = async (userId) => {
  try {
    // Import User model or use Clerk API
    const { createClerkClient } = await import('@clerk/backend');
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const user = await clerk.users.getUser(userId);
    return user.emailAddresses?.[0]?.emailAddress || null;
  } catch (error) {
    console.error('Error getting user email:', error);
    return null;
  }
};

/**
 * Create bulk notifications with idempotency
 */
export const createBulkNotifications = async ({
  userIds,
  type,
  title,
  message,
  link = null,
  metadata = {},
  priority = 'medium',
  category = 'general',
  sendEmail = false,
  sendPush = false
}) => {
  const results = [];
  
  for (const userId of userIds) {
    try {
      const notification = await createNotification({
        userId,
        type,
        title,
        message,
        link,
        metadata: { ...metadata, bulkSend: true },
        priority,
        category,
        sendEmail,
        sendPush
      });
      results.push({ userId, success: true, notificationId: notification._id });
    } catch (error) {
      console.error(`Failed to create notification for user ${userId}:`, error);
      results.push({ userId, success: false, error: error.message });
    }
  }

  return results;
};

/**
 * Get notifications for a user
 */
export const getNotifications = async (userId, options = {}) => {
  const {
    limit = 20,
    skip = 0,
    unreadOnly = false,
    category = null,
    type = null
  } = options;

  const query = { userId };
  if (unreadOnly) query.read = false;
  if (category) query.category = category;
  if (type) query.type = type;

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({ userId, read: false });

  return {
    notifications,
    total,
    unreadCount,
    page: Math.floor(skip / limit) + 1,
    pages: Math.ceil(total / limit)
  };
};

/**
 * Mark notification as read
 */
export const markAsRead = async (userId, notificationId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true, readAt: new Date() },
    { new: true }
  );

  if (notification) {
    // Emit realtime update
    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit('notification:read', { notificationId });
    }
  }

  return notification;
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { userId, read: false },
    { read: true, readAt: new Date() }
  );

  // Emit realtime update
  const io = getIO();
  if (io) {
    io.to(`user:${userId}`).emit('notifications:all-read');
  }

  return result;
};

/**
 * Delete notification
 */
export const deleteNotification = async (userId, notificationId) => {
  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    userId
  });

  if (notification) {
    // Emit realtime update
    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit('notification:deleted', { notificationId });
    }
  }

  return notification;
};

/**
 * Get unread count
 */
export const getUnreadCount = async (userId) => {
  return await Notification.countDocuments({ userId, read: false });
};

/**
 * Cleanup old read notifications
 */
export const cleanupOldNotifications = async (daysOld = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await Notification.deleteMany({
    read: true,
    readAt: { $lt: cutoffDate }
  });

  console.log(`🧹 Cleaned up ${result.deletedCount} old notifications`);
  return result;
};

/**
 * Clear idempotency cache (for testing/maintenance)
 */
export const clearIdempotencyCache = () => {
  idempotencyCache.clear();
  console.log('🧹 Idempotency cache cleared');
};
