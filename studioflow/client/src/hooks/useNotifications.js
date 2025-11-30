import { useState, useEffect, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { io } from 'socket.io-client';

// Remove /api from VITE_API_URL since it already includes it
const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

let socket = null;

export const useNotifications = () => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Use Clerk's getToken() method - defensive check
      let token;
      try {
        token = await getToken();
      } catch (authError) {
        console.warn('⚠️ Failed to get auth token:', authError.message);
        setError('Authentication failed');
        setLoading(false);
        return;
      }

      if (!token) {
        console.warn('⚠️ No auth token available');
        setError('Not authenticated');
        setLoading(false);
        return;
      }

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
  }, [user?.id, getToken]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) return;

    try {
      const token = await getToken();
      if (!token) {
        console.warn('⚠️ No auth token for unread count');
        return;
      }

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
  }, [user?.id, getToken]);

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId) => {
      if (!user?.id) return;

      try {
        const token = await getToken();
        if (!token) {
          console.warn('⚠️ No auth token for mark as read');
          return;
        }

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
    [user?.id, getToken]
  );

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      const token = await getToken();
      if (!token) {
        console.warn('⚠️ No auth token for mark all as read');
        return;
      }

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
  }, [user?.id, getToken]);

  // Delete notification
  const deleteNotification = useCallback(
    async (notificationId) => {
      if (!user?.id) return;

      try {
        const token = await getToken();
        if (!token) {
          console.warn('⚠️ No auth token for delete notification');
          return;
        }

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
    [user?.id, getToken]
  );

  // Initialize socket and listeners
  useEffect(() => {
    if (!user?.id) return;

    // Initialize socket if needed
    if (!socket) {
      console.log('🔌 Initializing socket connection...');
      socket = io(API_BASE_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      socket.on('connect', () => {
        console.log('✅ Socket connected:', socket.id);
        socket.emit('authenticate', user.id);
      });

      socket.on('authenticated', (data) => {
        console.log('✅ Socket authenticated:', data);
      });

      socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected');
      });
    }

    // Define handlers
    const playNotificationSound = () => {
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(e => console.log('Audio play failed:', e));
      } catch (e) {
        console.error('Error playing sound:', e);
      }
    };

    const handleNewNotification = (data) => {
      const notification = data.notification || data;
      console.log('🔔 New notification received:', notification);
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      playNotificationSound();
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

    const handleNotificationDeleted = (data) => {
      console.log('🗑️ Notification deleted:', data);
      setNotifications(prev => prev.filter(n => !data.ids.includes(n._id)));
    };

    // Cleanup listeners on unmount or user change
    return () => {
      console.log('🧹 Cleaning up socket listeners');
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:updated', handleNotificationRead);
      socket.off('notification:all-read', handleAllNotificationsRead);
      socket.off('notification:deleted', handleNotificationDeleted);
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
    refetch: fetchNotifications
  };
};
