import * as notificationService from '../services/notificationService.js';
import NotificationPreference from '../models/NotificationPreference.js';

/**
 * Get notifications for authenticated user
 * GET /api/notifications?page=1&limit=20&unreadOnly=false&type=comment
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      page = 1,
      limit = 20,
      unreadOnly = 'false',
      type = null
    } = req.query;

    const result = await notificationService.getNotifications(userId, {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100), // Max 100 per page
      unreadOnly: unreadOnly === 'true',
      type
    });

    res.json(result);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

/**
 * Get unread count for authenticated user
 * GET /api/notifications/unread-count
 */
export const getUnreadCountHandler = async (req, res) => {
  try {
    const userId = req.userId;
    const count = await notificationService.getUnreadCount(userId);

    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};

/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    await notificationService.markAsRead(id, userId);

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

/**
 * Mark all notifications as read
 * PATCH /api/notifications/read-all
 */
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
export const deleteNotification = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    await notificationService.deleteNotification(userId, id);

    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

/**
 * Delete all notifications
 * DELETE /api/notifications?confirm=true
 */
export const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const { confirm } = req.query;

    if (confirm !== 'true') {
      return res.status(400).json({
        error: 'Must confirm deletion with ?confirm=true'
      });
    }

    // Get all notification IDs for this user
    const { notifications } = await notificationService.getNotifications(userId, {
      page: 1,
      limit: 10000 // Get all
    });

    const ids = notifications.map(n => n._id);

    if (ids.length > 0) {
      // Delete each notification individually
      for (const id of ids) {
        await notificationService.deleteNotification(userId, id);
      }
    }

    res.json({
      success: true,
      message: 'All notifications deleted',
      deletedCount: ids.length
    });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({ error: 'Failed to delete all notifications' });
  }
};

/**
 * Register device token for push notifications
 * POST /api/notifications/register-token
 */
export const registerDeviceToken = async (req, res) => {
  try {
    const userId = req.userId;
    const { token, platform = 'web' } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Import DeviceToken model dynamically to avoid circular dependencies if any
    const DeviceToken = (await import('../models/DeviceToken.js')).default;

    // Upsert the token
    await DeviceToken.findOneAndUpdate(
      { userId, token },
      {
        userId,
        token,
        platform,
        isActive: true,
        lastUsedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Device token registered' });
  } catch (error) {
    console.error('Register device token error:', error);
    res.status(500).json({ error: 'Failed to register device token' });
  }
};

/**
 * Get notification preferences
 * GET /api/notifications/preferences
 */
export const getPreferences = async (req, res) => {
  try {
    const userId = req.userId;

    let dbPrefs = await NotificationPreference.findOne({ userId });

    // Return default structure if not found (frontend expects this)
    if (!dbPrefs) {
      return res.json({
        userId,
        channels: { push: true, email: false, inApp: true },
        triggers: { comments: 'all', tasks: 'assigned_only', files: true, project_updates: true },
        dnd: { enabled: false, startTime: '22:00', endTime: '08:00', timezone: 'UTC', bypassForUrgent: true },
        mutes: { marketing: false, system: false },
        digest: { emailFrequency: 'realtime', groupingWindowMinutes: 15 },
        projectSettings: []
      });
    }

    res.json(dbPrefs);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
};

/**
 * Update notification preferences
 * PATCH /api/notifications/preferences
 */
export const updatePreferences = async (req, res) => {
  try {
    const userId = req.userId;
    const updates = req.body;

    // Simple validation could go here if needed

    const prefs = await NotificationPreference.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json(prefs);
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
};
