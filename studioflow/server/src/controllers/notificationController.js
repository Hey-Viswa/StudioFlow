import notificationService from '../services/notificationService.js';

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

    const result = await notificationService.listNotifications(userId, {
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

    await notificationService.deleteNotifications(id, userId);

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
    const { notifications } = await notificationService.listNotifications(userId, {
      limit: 10000 // Get all
    });

    const ids = notifications.map(n => n._id);

    if (ids.length > 0) {
      await notificationService.deleteNotifications(ids, userId);
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
