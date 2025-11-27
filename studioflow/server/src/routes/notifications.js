import express from 'express';
import {
  getNotifications,
  getUnreadCountHandler,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications
} from '../controllers/notificationController.js';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';

const router = express.Router();

// All routes require authentication
router.use(verifyClerk);

// GET /api/notifications - Get notifications for authenticated user
router.get('/', getNotifications);

// GET /api/notifications/unread-count - Get unread count
router.get('/unread-count', getUnreadCountHandler);

// PATCH /api/notifications/:id/read - Mark single notification as read
router.patch('/:id/read', markNotificationAsRead);

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', markAllNotificationsAsRead);

// DELETE /api/notifications/:id - Delete single notification
router.delete('/:id', deleteNotification);

// DELETE /api/notifications - Delete all notifications (with confirmation)
router.delete('/', deleteAllNotifications);

export default router;
