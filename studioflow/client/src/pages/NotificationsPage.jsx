import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import {
  Bell,
  Check,
  Trash2,
  Filter,
  RefreshCw,
  Search,
  X,
  Settings,
  MoreHorizontal,
  Clock,
  Inbox
} from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useNotifications } from '../hooks/useNotifications';
import { DashboardSkeleton } from '../components/DashboardSkeleton';

const NotificationsPage = () => {
  const { notifications: allNotifications = [], unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, refetch } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter notifications based on selected filters
  useEffect(() => {
    let filtered = [...(allNotifications || [])];

    // Filter by read status
    if (filter === 'unread') {
      filtered = filtered.filter((n) => !n.read);
    } else if (filter === 'read') {
      filtered = filtered.filter((n) => n.read);
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((n) => n.type === typeFilter || n.category === typeFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.message.toLowerCase().includes(query)
      );
    }

    setNotifications(filtered);
  }, [allNotifications, filter, typeFilter, searchQuery]);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification._id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleDeleteNotification = async (e, notificationId) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  const handleMarkAsRead = async (e, notificationId) => {
    e.stopPropagation();
    await markAsRead(notificationId);
  };

  const getNotificationIcon = (type) => {
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
      'comment-mentioned': '🔔',
      'task-assigned': '📋',
      'task-completed': '✅',
      'task-overdue': '⏰',
      'file-uploaded': '📎',
      'file-shared': '🔗',
      'project-invitation': '✉️',
      'project-deleted': '🗑️',
      'project-archived': '📦',
      system: '⚙️',
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✅',
    };

    return iconMap[type] || '🔔';
  };

  const getPriorityColor = (priority) => {
    const colorMap = {
      high: 'bg-red-500',
      medium: 'bg-amber-500',
      low: 'bg-blue-500',
    };
    return colorMap[priority] || 'bg-slate-500';
  };

  const groupNotificationsByDate = (notifs) => {
    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    };

    if (!Array.isArray(notifs)) return groups;

    notifs.forEach(n => {
      if (!n.createdAt) {
        groups.older.push(n);
        return;
      }

      const date = new Date(n.createdAt);
      if (isNaN(date.getTime())) {
        groups.older.push(n);
        return;
      }

      if (isToday(date)) groups.today.push(n);
      else if (isYesterday(date)) groups.yesterday.push(n);
      else if (isThisWeek(date)) groups.thisWeek.push(n);
      else groups.older.push(n);
    });

    return groups;
  };

  const groupedNotifications = groupNotificationsByDate(notifications);

  if (loading && notifications.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="default" className="rounded-full px-3 py-1 text-sm">
                  {unreadCount} new
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1 text-base md:text-lg">
              Stay updated with your projects and team activity
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard/settings')}
              className="flex-1 md:flex-none md:flex"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} size="sm" className="flex-1 md:flex-none shadow-sm">
                <Check className="w-4 h-4 mr-2" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Feed */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <Tabs value={filter} onValueChange={setFilter} className="w-full">
                    <TabsList className="grid w-full md:max-w-[400px] grid-cols-3">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="unread">Unread</TabsTrigger>
                      <TabsTrigger value="read">Archived</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Button variant="ghost" size="icon" onClick={refetch} className="ml-2">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-300px)]">
                  <div className="p-6 pt-0 space-y-8">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
                          <Inbox className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
                        <p className="text-muted-foreground max-w-sm">
                          {searchQuery
                            ? "No notifications match your search filters."
                            : "You have no new notifications at the moment."}
                        </p>
                        {searchQuery && (
                          <Button variant="link" onClick={() => setSearchQuery('')} className="mt-2">
                            Clear filters
                          </Button>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Today's Notifications */}
                        {groupedNotifications.today.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider pl-1">Today</h3>
                            {groupedNotifications.today.map(notification => (
                              <NotificationItem
                                key={notification._id}
                                notification={notification}
                                onClick={handleNotificationClick}
                                onMarkRead={handleMarkAsRead}
                                onDelete={handleDeleteNotification}
                                getIcon={getNotificationIcon}
                                getPriorityColor={getPriorityColor}
                              />
                            ))}
                          </div>
                        )}

                        {/* Yesterday's Notifications */}
                        {groupedNotifications.yesterday.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider pl-1">Yesterday</h3>
                            {groupedNotifications.yesterday.map(notification => (
                              <NotificationItem
                                key={notification._id}
                                notification={notification}
                                onClick={handleNotificationClick}
                                onMarkRead={handleMarkAsRead}
                                onDelete={handleDeleteNotification}
                                getIcon={getNotificationIcon}
                                getPriorityColor={getPriorityColor}
                              />
                            ))}
                          </div>
                        )}

                        {/* This Week's Notifications */}
                        {groupedNotifications.thisWeek.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider pl-1">This Week</h3>
                            {groupedNotifications.thisWeek.map(notification => (
                              <NotificationItem
                                key={notification._id}
                                notification={notification}
                                onClick={handleNotificationClick}
                                onMarkRead={handleMarkAsRead}
                                onDelete={handleDeleteNotification}
                                getIcon={getNotificationIcon}
                                getPriorityColor={getPriorityColor}
                              />
                            ))}
                          </div>
                        )}

                        {/* Older Notifications */}
                        {groupedNotifications.older.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider pl-1">Older</h3>
                            {groupedNotifications.older.map(notification => (
                              <NotificationItem
                                key={notification._id}
                                notification={notification}
                                onClick={handleNotificationClick}
                                onMarkRead={handleMarkAsRead}
                                onDelete={handleDeleteNotification}
                                getIcon={getNotificationIcon}
                                getPriorityColor={getPriorityColor}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Filters */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-border/50 shadow-sm sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search keywords..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-muted/50"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="bg-muted/50">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="project">Projects</SelectItem>
                      <SelectItem value="task">Tasks</SelectItem>
                      <SelectItem value="comment">Comments</SelectItem>
                      <SelectItem value="file">Files</SelectItem>
                      <SelectItem value="invoice">Invoices</SelectItem>
                      <SelectItem value="payment">Payments</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="pt-2">
                  <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => navigate('/dashboard/settings')}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Notification Preferences
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-component for individual notification item
const NotificationItem = ({ notification, onClick, onMarkRead, onDelete, getIcon, getPriorityColor }) => {
  const getTimeAgo = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return '';
    }
  };

  return (
    <div
      onClick={() => onClick(notification)}
      className={`group relative flex items-start gap-4 p-4 rounded-xl transition-all duration-200 border cursor-pointer hover:shadow-md ${!notification.read
        ? 'bg-card border-primary/20 shadow-sm'
        : 'bg-card/40 border-transparent hover:bg-card hover:border-border/50'
        }`}
    >
      {/* Unread Indicator */}
      {!notification.read && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-primary rounded-r-full" />
      )}

      {/* Icon */}
      <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm ${!notification.read ? 'bg-primary/10' : 'bg-muted'
        }`}>
        {getIcon(notification.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
          <h4 className={`text-sm font-semibold leading-tight ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
            {notification.title}
          </h4>
          <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {getTimeAgo(notification.createdAt)}
          </span>
        </div>

        <p className={`text-sm line-clamp-2 ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
          {notification.message}
        </p>

        {/* Footer Metadata */}
        <div className="flex items-center gap-3 pt-2">
          {notification.priority === 'high' && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-red-200 text-red-600 bg-red-50">
              High Priority
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
            {notification.category || 'Update'}
          </Badge>
        </div>
      </div>

      {/* Actions (Hover on desktop, always visible on mobile) */}
      <div className="flex flex-col gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        {!notification.read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={(e) => onMarkRead(e, notification._id)}
            title="Mark as read"
          >
            <Check className="w-4 h-4" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => onDelete(e, notification._id)} className="text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default NotificationsPage;
