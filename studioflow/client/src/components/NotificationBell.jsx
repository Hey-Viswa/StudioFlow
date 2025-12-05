import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { ScrollArea } from './ui/scroll-area';
import { useNotifications } from '../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [open, setOpen] = useState(false);

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification._id);
    }

    // Navigate to link if exists
    if (notification.link) {
      setOpen(false);
      navigate(notification.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  // Get icon based on notification type
  const getNotificationIcon = (type, icon) => {
    if (icon) return icon;

    const iconMap = {
      'payment-received': '💰',
      'payment-failed': '❌',
      'subscription-created': '🎉',
      'subscription-renewed': '🔄',
      'subscription-expired': '⏰',
      'invoice-generated': '📄',
      'invoice-paid': '✅',
      'invoice-overdue': '⚠️',
      'comment-added': '💬',
      'comment-mention': '@',
      'comment-reply': '↩️',
      'project-created': '📁',
      'project-updated': '📝',
      'project-deleted': '🗑️',
      'task-assigned': '✅',
      'file-uploaded': '📎',
      'system-update': '🔧',
    };

    return iconMap[type] || '🔔';
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    const colorMap = {
      low: 'text-muted-foreground',
      normal: 'text-blue-500',
      high: 'text-orange-500',
      urgent: 'text-red-500',
    };
    return colorMap[priority] || 'text-muted-foreground';
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs"
              onClick={handleMarkAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <Bell className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification._id}
                  className={`cursor-pointer p-3 ${
                    !notification.read ? 'bg-accent/50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <span className="text-xl flex-shrink-0">
                      {getNotificationIcon(notification.type, notification.icon)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium line-clamp-1">
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center cursor-pointer"
              onClick={() => {
                setOpen(false);
                navigate('/dashboard/notifications');
              }}
            >
              View all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
