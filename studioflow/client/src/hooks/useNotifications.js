import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { io } from 'socket.io-client';

// Remove /api from VITE_API_URL since it already includes it
const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

let socket = null;

export const useNotifications = () => {
  const { user } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize socket connection
  useEffect(() => {
    if (!user?.id) return;

    if (!socket) {
      socket = io(API_BASE_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      socket.on('connect', () => {
        console.log('🔌 Socket connected');
        socket.emit('authenticate', user.id);
      });

      socket.on('authenticated', (data) => {
        console.log('✅ Socket authenticated:', data);
      });

      socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected');
      });
    }

    return () => {
      // Don't disconnect socket on component unmount
      // Keep it alive for other components that might need it
    };
  }, [user?.id]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const token = await user.getSessionToken();

      const response = await fetch(`${API_BASE_URL}/api/notifications?limit=20`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) return;

    try {
      const token = await user.getSessionToken();

      const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch unread count');

      const data = await response.json();
      setUnreadCount(data.count || 0);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, [user]);

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId) => {
      if (!user?.id) return;

      try {
        const token = await user.getSessionToken();

        const response = await fetch(
          `${API_BASE_URL}/api/notifications/${notificationId}/read`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) throw new Error('Failed to mark as read');

        // Update local state
        setNotifications((prev) =>
          prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    },
    [user]
  );

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      const token = await user.getSessionToken();

      const response = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to mark all as read');

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, [user]);

  // Delete notification
  const deleteNotification = useCallback(
    async (notificationId) => {
      if (!user?.id) return;

      try {
        const token = await user.getSessionToken();

        const response = await fetch(
          `${API_BASE_URL}/api/notifications/${notificationId}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) throw new Error('Failed to delete notification');

        // Update local state
        setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      } catch (err) {
        console.error('Error deleting notification:', err);
      }
    },
    [user]
  );

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket || !user?.id) return;

    const handleNewNotification = (notification) => {
      console.log('🔔 New notification received:', notification);
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    const handleNotificationRead = ({ notificationId }) => {
      console.log('👁️ Notification marked as read:', notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    const handleAllNotificationsRead = () => {
      console.log('👁️ All notifications marked as read');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    };

    socket.on('notification', handleNewNotification);
    socket.on('notification-read', handleNotificationRead);
    socket.on('notifications-read-all', handleAllNotificationsRead);

    return () => {
      socket.off('notification', handleNewNotification);
      socket.off('notification-read', handleNotificationRead);
      socket.off('notifications-read-all', handleAllNotificationsRead);
    };
  }, [user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications,
  };
};
