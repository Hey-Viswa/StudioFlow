import express from 'express';
import {
  getNotifications,
  getUnreadCountHandler,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  registerDeviceToken
} from '../controllers/notificationController.js';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// All routes require authentication
router.use(verifyClerk);

// Apply rate limiting
router.use(rateLimiter);

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

// POST /api/notifications/register-token - Register FCM token
router.post('/register-token', registerDeviceToken);

// POST /api/notifications/test - Trigger a test notification (Debug)


export default router;
