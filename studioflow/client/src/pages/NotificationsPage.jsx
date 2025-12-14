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
  Inbox,
  ChevronRight
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
  const navigate = useNavigate();
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
      'payment-received': { icon: '💰', color: 'from-emerald-500/20 to-teal-500/20 text-emerald-500' },
      'payment-failed': { icon: '❌', color: 'from-red-500/20 to-rose-500/20 text-red-500' },
      'subscription-created': { icon: '🎉', color: 'from-purple-500/20 to-indigo-500/20 text-purple-500' },
      'subscription-renewed': { icon: '🔄', color: 'from-blue-500/20 to-cyan-500/20 text-blue-500' },
      'subscription-expired': { icon: '⏰', color: 'from-orange-500/20 to-amber-500/20 text-orange-500' },
      'invoice-generated': { icon: '📄', color: 'from-slate-500/20 to-gray-500/20 text-slate-500' },
      'invoice-paid': { icon: '✅', color: 'from-green-500/20 to-emerald-500/20 text-green-500' },
      'invoice-overdue': { icon: '⚠️', color: 'from-amber-500/20 to-yellow-500/20 text-amber-500' },
      'comment-added': { icon: '💬', color: 'from-blue-500/20 to-indigo-500/20 text-blue-500' },
      'comment-mentioned': { icon: '🔔', color: 'from-amber-500/20 to-orange-500/20 text-amber-500' },
      'task-assigned': { icon: '📋', color: 'from-indigo-500/20 to-violet-500/20 text-indigo-500' },
      'task-completed': { icon: '✅', color: 'from-green-500/20 to-teal-500/20 text-green-500' },
      'task-overdue': { icon: '⏰', color: 'from-red-500/20 to-pink-500/20 text-red-500' },
      'file-uploaded': { icon: '📎', color: 'from-pink-500/20 to-rose-500/20 text-pink-500' },
      'file-shared': { icon: '🔗', color: 'from-cyan-500/20 to-sky-500/20 text-cyan-500' },
      'project-invitation': { icon: '✉️', color: 'from-violet-500/20 to-purple-500/20 text-violet-500' },
      'project-deleted': { icon: '🗑️', color: 'from-red-500/20 to-orange-500/20 text-red-500' },
      'project-archived': { icon: '📦', color: 'from-amber-500/20 to-yellow-500/20 text-amber-500' },
      system: { icon: '⚙️', color: 'from-slate-500/20 to-gray-500/20 text-slate-500' },
      info: { icon: 'ℹ️', color: 'from-blue-500/20 to-sky-500/20 text-blue-500' },
      warning: { icon: '⚠️', color: 'from-amber-500/20 to-yellow-500/20 text-amber-500' },
      error: { icon: '❌', color: 'from-red-500/20 to-rose-500/20 text-red-500' },
      success: { icon: '✅', color: 'from-green-500/20 to-emerald-500/20 text-green-500' },
    };

    return iconMap[type] || { icon: '🔔', color: 'from-primary/20 to-primary/10 text-primary' };
  };

  const getPriorityColor = (priority) => {
    const colorMap = {
      high: 'bg-red-500/10 text-red-600 border-red-200',
      medium: 'bg-amber-500/10 text-amber-600 border-amber-200',
      low: 'bg-blue-500/10 text-blue-600 border-blue-200',
    };
    return colorMap[priority] || 'bg-slate-500/10 text-slate-600 border-slate-200';
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
    <div className="min-h-screen bg-background/50">
      <div className="container max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
              Notifications
            </h1>
            <p className="text-muted-foreground text-lg">
              Stay updated with your latest activity
            </p>
          </div>

          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                variant="outline"
                className="shadow-sm hover:bg-primary/5 border-primary/20 hover:border-primary/40 transition-all font-medium"
              >
                <Check className="w-4 h-4 mr-2 text-primary" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard/settings')}
              className="rounded-full hover:bg-secondary"
              title="Notification Settings"
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Feed */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <Tabs value={filter} onValueChange={setFilter} className="w-full">
                <TabsList className="bg-muted/50 p-1 rounded-xl">
                  <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">All</TabsTrigger>
                  <TabsTrigger value="unread" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    Unread
                    {unreadCount > 0 && <span className="ml-2 bg-primary/10 text-primary px-1.5 rounded-full text-xs">{unreadCount}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="read" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Archived</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="ghost" size="icon" onClick={refetch} className="ml-2 text-muted-foreground hover:text-primary transition-colors">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            <Card className="border shadow-none bg-background/40 backdrop-blur-xl">
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-280px)] pr-4">
                  <div className="p-2 md:p-4 space-y-8">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in duration-500">
                        <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-6 ring-8 ring-muted/10">
                          <Inbox className="w-10 h-10 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2 text-foreground">All caught up!</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">
                          {searchQuery
                            ? "No notifications match your active filters."
                            : "You have no new notifications at the moment. Take a break!"}
                        </p>
                        {searchQuery && (
                          <Button variant="link" onClick={() => setSearchQuery('')} className="mt-4 text-primary">
                            Clear filters
                          </Button>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Sections */}
                        {['today', 'yesterday', 'thisWeek', 'older'].map(group => (
                          groupedNotifications[group].length > 0 && (
                            <div key={group} className="space-y-3 relative">
                              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md py-2 px-1 border-b border-border/40 mb-2">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                  {group.replace(/([A-Z])/g, ' $1').trim()}
                                  <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px]">
                                    {groupedNotifications[group].length}
                                  </span>
                                </h3>
                              </div>
                              <div className="space-y-3">
                                {groupedNotifications[group].map(notification => (
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
                            </div>
                          )
                        ))}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Filters */}
          <div className="lg:col-span-4 lg:sticky lg:top-8 space-y-6">
            <Card className="border shadow-sm bg-card/50 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" />
                  Filter & Search
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Keywords</label>
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <Input
                      placeholder="Search notifications..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-secondary/30 border-transparent focus:bg-background transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
                      >
                        <X className="w-3 h-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right pt-0.5">
                    Search by title or content
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="bg-secondary/30 border-transparent focus:bg-background transition-all">
                      <SelectValue placeholder="All Activity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Activity</SelectItem>
                      <SelectItem value="project">📁 Projects</SelectItem>
                      <SelectItem value="task">✅ Tasks</SelectItem>
                      <SelectItem value="comment">💬 Comments</SelectItem>
                      <SelectItem value="file">📎 Files</SelectItem>
                      <SelectItem value="invoice">📄 Invoices</SelectItem>
                      <SelectItem value="payment">💰 Payments</SelectItem>
                      <SelectItem value="system">⚙️ System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="pt-2 space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-between group hover:border-primary/50 transition-all"
                    onClick={() => navigate('/dashboard/settings')}
                  >
                    <span className="flex items-center gap-2">
                      <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform duration-500" />
                      Preferences
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </Button>

                </div>
              </CardContent>
            </Card>

            {/* Quick Stats or Tips could go here */}
            <Card className="bg-primary/5 border-primary/10">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Bell className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-1">Stay in the loop</h4>
                  <p className="text-xs text-muted-foreground">
                    Customize your notification preferences in settings to receive only what matters most.
                  </p>
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
  const { icon, color } = getIcon(notification.type);

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
      className={`group relative flex items-start gap-4 p-4 rounded-xl transition-all duration-200 cursor-pointer border
        ${!notification.read
          ? 'bg-background border-primary/20 shadow-sm hover:shadow-md hover:border-primary/40' // Unread styles
          : 'bg-transparent border-transparent hover:bg-accent/40' // Read styles
        }
      `}
    >
      {/* Unread Glow Indicator */}
      {!notification.read && (
        <div className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
      )}

      {/* Icon */}
      <div className={`mt-0.5 flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-gradient-to-br shadow-inner ${color}`}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
          <h4 className={`text-sm font-semibold leading-snug ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
            {notification.title}
          </h4>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap flex items-center gap-1 bg-muted/30 px-1.5 py-0.5 rounded">
            <Clock className="w-3 h-3 opacity-70" />
            {getTimeAgo(notification.createdAt)}
          </span>
        </div>

        <p className={`text-sm leading-relaxed line-clamp-2 ${!notification.read ? 'text-foreground/80' : 'text-muted-foreground/70'}`}>
          {notification.message}
        </p>

        {/* Footer Metadata */}
        <div className="flex items-center gap-2 pt-2">
          {notification.priority === 'high' && (
            <Badge variant="outline" className={`text-[10px] px-2 py-0 h-5 border ${getPriorityColor('high')}`}>
              High Priority
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 bg-secondary/50 text-secondary-foreground/80 lowercase">
            #{notification.category || 'update'}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        {!notification.read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={(e) => onMarkRead(e, notification._id)}
            title="Mark as read"
          >
            <Check className="w-4 h-4" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-secondary"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => onDelete(e, notification._id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
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
