import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Loader2, Activity, FileText, MessageSquare, CreditCard, User, Settings } from 'lucide-react';

const ACTION_ICONS = {
  'comment.create': MessageSquare,
  'comment.update': MessageSquare,
  'comment.delete': MessageSquare,
  'comment.react': MessageSquare,
  'comment.resolve': MessageSquare,
  'invoice.create': FileText,
  'invoice.update': FileText,
  'invoice.sent': FileText,
  'invoice.paid': CreditCard,
  'project.update': Settings,
  'member.add': User,
  'member.remove': User,
  'default': Activity
};

const ACTION_COLORS = {
  'comment.create': 'text-blue-500 bg-blue-500/10',
  'invoice.paid': 'text-green-500 bg-green-500/10',
  'invoice.sent': 'text-orange-500 bg-orange-500/10',
  'member.add': 'text-purple-500 bg-purple-500/10',
  'default': 'text-slate-500 bg-slate-500/10'
};

const formatActionText = (action, details) => {
  switch (action) {
    case 'comment.create':
      return details?.hasAttachments ? 'posted a comment with attachments' : 'posted a comment';
    case 'comment.update':
      return 'edited a comment';
    case 'comment.delete':
      return 'deleted a comment';
    case 'comment.react':
      return `reacted ${details?.emoji || ''} to a comment`;
    case 'comment.resolve':
      return 'resolved a comment';
    case 'invoice.create':
      return 'created an invoice';
    case 'invoice.sent':
      return 'sent an invoice';
    case 'invoice.paid':
      return 'marked invoice as paid';
    default:
      return action.replace('.', ' ');
  }
};

export default function ActivityTab({ projectId }) {
  const { getToken } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchActivity();
  }, [projectId]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const response = await fetch(`${apiUrl}/audit/projects/${projectId}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (!response.ok) throw new Error('Failed to fetch activity logs');

      const data = await response.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Error fetching activity:', err);
      setError('Failed to load activity history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{error}</p>
        <button onClick={fetchActivity} className="text-primary hover:underline mt-2">
          Try Again
        </button>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p>No activity recorded yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-6">
        {logs.map((log) => {
          const Icon = ACTION_ICONS[log.action] || ACTION_ICONS.default;
          const colorClass = ACTION_COLORS[log.action] || ACTION_COLORS.default;
          
          return (
            <div key={log._id} className="flex gap-4 group">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">
                      {log.user?.name || 'Unknown User'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatActionText(log.action, log.details)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </span>
                </div>
                
                {/* Optional: Show extra details if needed */}
                {/* <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                  {JSON.stringify(log.details)}
                </div> */}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
