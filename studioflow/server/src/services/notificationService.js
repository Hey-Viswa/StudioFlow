import Notification from '../models/Notification.js';
import NotificationBatch from '../models/NotificationBatch.js';
import NotificationPreference from '../models/NotificationPreference.js';
import { getIO } from '../config/socket.js';
import { sendEmail, isMessagingAvailable } from '../config/appwriteMessaging.js';
import { sendPushNotification as sendFCMPush, isFirebaseAvailable } from '../config/firebase.js';
import { emailQueue } from '../config/queue.js';
import crypto from 'crypto';
import { NotificationRulesService } from './notificationRules.js';
import { notificationQueue } from '../queues/notificationQueue.js';
import featureFlags from '../config/featureFlags.js';

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
  category = 'info',
  sendEmail = false,
  sendPush = false,
  idempotencyKey = null,
  actorId,
  resourceId,
  resourceType
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
      recipientId: userId,
      actorId,
      resourceId,
      resourceType,
      type,
      title,
      message,
      link,
      data: { metadata, url: link }, // Map to 'data' field in schema
      isRead: false, // Schema uses isRead, not read
      category
    });

    console.log(`✅ Notification persisted: ${notification._id} for user ${userId}`);

    // Update idempotency cache
    idempotencyCache.set(idempotencyKey, {
      notificationId: notification._id,
      timestamp: Date.now()
    });

    // Step 2: Check if user is online
    let io = null;
    try {
      io = getIO();
    } catch (e) {
      // Socket not initialized (e.g. script/worker context)
      // Treat as offline
    }

    let isUserOnline = false;

    if (io) {
      const roomName = `user:${userId}`;

      // ALWAYS emit real-time notification (Redis adapter handles cross-node delivery)
      io.to(roomName).emit('notification:new', notification);
      console.log(`⚡ Real-time notification emitted to user ${userId}`);

      // Check local presence for fallback logic (Note: In multi-node, this might be false negative)
      const room = io.sockets.adapter.rooms.get(roomName);
      isUserOnline = room && room.size > 0;

      if (!isUserOnline) {
        console.log(`zzz User ${userId} appears offline (locally). Proceeding to fallback channels.`);
      }
    }

    // Step 3: Fallback - Send Email/Push ONLY if user is offline
    // (Or if we want to force send regardless of status, we could add a force flag, but per req we fallback)
    if (!isUserOnline) {
      if (sendEmail) {
        try {
          await sendNotificationEmail(userId, notification);
        } catch (emailError) {
          console.error('⚠️  Email delivery error:', emailError.message);
          // Non-critical, notification still delivered
        }
      }

      if (sendPush) {
        try {
          await sendNotificationPush(userId, notification);
        } catch (pushError) {
          console.error('⚠️  Push notification error:', pushError.message);
          // Non-critical, notification still delivered
        }
      }
    } else {
      console.log(`🔕 Suppressed email/push for online user ${userId}`);
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
/**
 * Get user's FCM token from database
 */
const getUserFCMToken = async (userId) => {
  try {
    // Import dynamically to avoid circular dependencies
    const DeviceToken = (await import('../models/DeviceToken.js')).default;

    // Find active token for this user
    // We sort by lastUsedAt to get the most recently active device
    const deviceToken = await DeviceToken.findOne({
      userId,
      isActive: true
    }).sort({ lastUsedAt: -1 });

    return deviceToken?.token || null;
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

  const query = { recipientId: userId };
  if (unreadOnly) query.isRead = false;
  if (category) query.category = category;
  if (type) query.type = type;

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({ recipientId: userId, isRead: false });

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
    { _id: notificationId, recipientId: userId },
    { isRead: true, readAt: new Date() },
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
    { recipientId: userId, isRead: false },
    { isRead: true, readAt: new Date() }
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
    recipientId: userId
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
  return await Notification.countDocuments({ recipientId: userId, isRead: false });
};

/**
 * Cleanup old read notifications
 */
export const cleanupOldNotifications = async (daysOld = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await Notification.deleteMany({
    isRead: true,
    readAt: { $lt: cutoffDate }
  });

  console.log(`🧹 Cleaned up ${result.deletedCount} old notifications`);
  return result;
};

/**
 * Process a notification event (Direct execution logic)
 * This contains the logic previously only in the worker.
 */
export const processNotificationEvent = async (type, data, actorId) => {
  console.log(`🔄 Processing notification event: ${type}`);

  try {
    // 1. Determine Recipients
    const recipients = await NotificationRulesService.getRecipients(type, data, actorId);

    if (!recipients || recipients.length === 0) {
      console.log('ℹ️ No recipients found for this event.');
      return;
    }

    console.log(`👥 Found ${recipients.length} potential recipients`);

    // 2. Process for each recipient
    for (const recipient of recipients) {
      const userId = recipient.userId;

      // Context for preference checking
      const context = {
        projectId: data.projectId || data._id, // Assuming data has project info
        isMention: Array.isArray(data.mentions) && data.mentions.some(m =>
          (typeof m === 'string' ? m === userId : m.userId === userId)
        ),
        isUrgent: data.priority === 'high',
        role: recipient.role
      };

      // 3. Check Preferences
      const shouldNotify = await NotificationRulesService.shouldNotify(userId, type, context);

      if (!shouldNotify) {
        console.log(`🔕 Notification suppressed for user ${userId} by preferences`);
        continue;
      }

      // Customization for Mentions
      let notificationTitle = data.title;
      let notificationPriority = data.priority || 'medium';

      if (context.isMention) {
        notificationTitle = '🔔 You were mentioned';
        notificationPriority = 'high';
      }

      // 4. Get Enabled Channels
      const channels = await NotificationRulesService.getEnabledChannels(userId, context.isUrgent);

      // Map event type to model enum
      const typeMapping = {
        'comment.created': 'comment_created',
        'task.assigned': 'assigned',
        'project.needs_revision': 'project_needs_revision',
        'project.finalized': 'project_finalized',
        'file.uploaded': 'file_uploaded',
        'invoice.created': 'invoice_created',
        'invoice.paid': 'invoice_paid',
        'project.updated': 'project_updated'
      };

      const modelType = typeMapping[type] || 'mention'; // Default fallback

      // Map category to model enum
      const categoryMapping = {
        'comment': 'info',
        'task': 'action',
        'project': 'info',
        'invoice': 'urgent',
        'file': 'info'
      };
      const modelCategory = categoryMapping[data.category] || 'info';

      // 5. Check Digest Logic
      // Check if we should digest instead of sending immediate email
      // We still create the in-app notification (Notification model), but suppress the immediate email
      let shouldDigest = false;
      if (featureFlags.phase3.smartNotifications) {
        shouldDigest = await NotificationRulesService.shouldDigest(userId, type);
      }

      // Create Notification
      const notification = await createNotification({
        userId,
        type: modelType,
        actorId,
        resourceId: data.resourceId || data.taskId || data.projectId || data._id,
        resourceType: data.resourceType || 'project',
        title: notificationTitle,
        message: data.message,
        link: data.link,
        metadata: data,
        priority: notificationPriority,
        category: modelCategory,
        // If digesting, Force Email OFF here. The Batch worker will handle email later.
        sendEmail: shouldDigest ? false : channels.email,
        sendPush: channels.push,
        idempotencyKey: data.idempotencyKey // Pass the key from the job data
      });

      // 6. Add to Digest Batch if needed
      if (shouldDigest) {
        await addToDigest(userId, notification);
        console.log(`📥 Notification batched for digest (User: ${userId})`);
      }
    }
    console.log(`✅ Successfully processed notification event: ${type}`);
    return true;
  } catch (error) {
    console.error('❌ Error processing notification event:', error);
    return false;
  }
};

/**
 * Add notification to a pending batch
 */
export const addToDigest = async (userId, notification) => {
  try {
    const prefs = await NotificationPreference.findOne({ userId });
    const frequency = prefs?.digest?.emailFrequency || 'daily';

    // Calculate processAfter based on frequency
    // For simplicity: process at next interval (e.g., 9am tomorrow for daily)
    const now = new Date();
    const processAfter = new Date(now);

    if (frequency === 'daily') {
      processAfter.setDate(processAfter.getDate() + 1);
      processAfter.setHours(9, 0, 0, 0); // 9 AM next day
    } else if (frequency === 'weekly') {
      // Next Monday at 9am
      const day = processAfter.getDay();
      const diff = processAfter.getDate() - day + (day === 0 ? -6 : 1) + 7;
      processAfter.setDate(diff);
      processAfter.setHours(9, 0, 0, 0);
    } else {
      // Use grouping window (default 15 mins) if set, or fallback to 15 mins
      const windowMinutes = prefs.digest?.groupingWindowMinutes || 15;
      processAfter.setMinutes(processAfter.getMinutes() + windowMinutes);
    }

    // Find existing pending batch or create new one
    let batch = await NotificationBatch.findOne({
      userId,
      status: 'pending'
    });

    if (!batch) {
      batch = new NotificationBatch({
        userId,
        status: 'pending',
        processAfter,
        notifications: []
      });
    }

    // Add simplified snapshot
    batch.notifications.push({
      notificationId: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      createdAt: notification.createdAt,
      data: notification.data?.metadata
    });

    await batch.save();
    return batch;

  } catch (error) {
    console.error('Failed to add to digest batch:', error);
    // Don't throw, just fail the batch part
  }
};

/**
 * Trigger a notification event (adds to queue with fallback)
 * @param {string} type - Event type (e.g., 'task.assigned', 'comment.created')
 * @param {Object} data - Event data (payload)
 * @param {string} actorId - ID of user who triggered the event
 */
export const triggerNotification = async (type, data, actorId) => {
  // Check if queue is enabled (import dynamically to avoid circular deps if possible, or use the one imported at top)
  // We imported notificationQueue at the top, let's check its property or the exported flag if we updated imports
  // Ideally we should import isQueueEnabled from the queue file.
  // For now, let's rely on the queue.add throwing or check process.env

  // Check if queue is enabled
  const useQueue = process.env.ENABLE_REDIS_QUEUE === 'true';

  if (!useQueue) {
    console.log(`DIRECT MODE: Processing notification ${type} immediately.`);
    return await processNotificationEvent(type, data, actorId);
  }

  try {
    console.log(`📨 Triggering notification: ${type} (Actor: ${actorId})`);

    const job = await notificationQueue.add({
      type,
      data,
      actorId,
      timestamp: new Date()
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: true,
      removeOnFail: false
    });

    console.log(`✅ Notification job added to queue: ${job.id} (${type})`);
    return job;
  } catch (error) {
    console.error('❌ Failed to queue notification (Redis issue?), falling back to direct execution:', error);

    // Fallback: Execute directly
    return await processNotificationEvent(type, data, actorId);
  }
};

/**
 * Clear idempotency cache (for testing/maintenance)
 */
export const clearIdempotencyCache = () => {
  idempotencyCache.clear();
  console.log('🧹 Idempotency cache cleared');
};
