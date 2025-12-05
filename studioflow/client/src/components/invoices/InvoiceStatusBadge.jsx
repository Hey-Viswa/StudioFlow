import { useState } from 'react';
import { Badge } from '../ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { Button } from '../ui/button';
import { CheckCircle2, Clock, FileText, AlertCircle, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    icon: FileText,
    style: { backgroundColor: 'rgb(255 255 255 / 0.1)', color: 'rgb(212 212 216)', borderColor: 'rgb(161 161 170 / 0.3)' },
  },
  pending: {
    label: 'Sent',
    icon: Clock,
    style: { backgroundColor: 'rgb(251 146 60 / 0.2)', color: 'rgb(249 115 22)', borderColor: 'rgb(251 146 60 / 0.3)' },
  },
  sent: {
    label: 'Sent',
    icon: Clock,
    style: { backgroundColor: 'rgb(251 146 60 / 0.2)', color: 'rgb(249 115 22)', borderColor: 'rgb(251 146 60 / 0.3)' },
  },
  partially_paid: {
    label: 'Partially Paid',
    icon: Clock,
    style: { backgroundColor: 'rgb(59 130 246 / 0.2)', color: 'rgb(37 99 235)', borderColor: 'rgb(59 130 246 / 0.3)' },
  },
  paid: {
    label: 'Paid',
    icon: CheckCircle2,
    style: { backgroundColor: 'rgb(34 197 94 / 0.2)', color: 'rgb(22 163 74)', borderColor: 'rgb(34 197 94 / 0.3)' },
  },
  overdue: {
    label: 'Overdue',
    icon: AlertCircle,
    style: { backgroundColor: 'rgb(168 85 247 / 0.2)', color: 'rgb(147 51 234)', borderColor: 'rgb(168 85 247 / 0.3)' },
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    style: { backgroundColor: 'rgb(239 68 68 / 0.2)', color: 'rgb(220 38 38)', borderColor: 'rgb(239 68 68 / 0.3)' },
  },
};

const AVAILABLE_STATUSES = ['draft', 'pending', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'];

/**
 * Invoice status badge with popover for changing status
 * @param {Object} props
 * @param {string} props.status - Current invoice status
 * @param {string} props.invoiceId - Invoice ID for updates
 * @param {Function} props.onStatusChange - Callback when status changes (invoiceId, newStatus)
 * @param {boolean} props.disabled - Disable status changes
 * @param {boolean} props.loading - Show loading state
 * @param {boolean} props.allowEdit - Allow editing status via popover (default: true)
 */
export default function InvoiceStatusBadge({
  status,
  isOverdue,
  invoiceId,
  onStatusChange,
  disabled = false,
  loading = false,
  allowEdit = true,
}) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = config.icon;

  // Override style if overdue
  const badgeStyle = isOverdue ? {
    ...config.style,
    borderColor: 'rgb(239 68 68 / 0.5)', // Red border
    color: 'rgb(239 68 68)', // Red text
  } : config.style;

  const handleStatusSelect = async (newStatus) => {
    if (newStatus === status || !onStatusChange || updating) return;

    setUpdating(true);
    try {
      // Optimistic update - close popover immediately
      setOpen(false);

      await onStatusChange(invoiceId, newStatus);

      toast.success(`Status updated to ${STATUS_CONFIG[newStatus].label}`);
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status', {
        description: error.message || 'Please try again',
      });
    } finally {
      setUpdating(false);
    }
  };

  // If editing not allowed, just show the badge
  if (!allowEdit || disabled) {
    return (
      <Badge variant="outline" className="flex items-center gap-1" style={badgeStyle}>
        <Icon className="w-3 h-3" />
        {config.label}
        {isOverdue && <span className="ml-1 text-[10px] font-bold">!</span>}
      </Badge>
    );
  }

  // Determine available next statuses based on current status
  let allowedTransitions = [];
  if (status === 'draft') {
    allowedTransitions = ['pending', 'sent']; // Can mark as Sent
  } else if (status === 'pending' || status === 'sent') {
    allowedTransitions = ['cancelled']; // Can cancel a sent invoice
  } else if (status === 'overdue') {
    allowedTransitions = ['cancelled'];
  }
  // 'paid' and 'cancelled' are terminal states for manual updates

  // If no allowed transitions, disable editing
  if (allowedTransitions.length === 0) {
    return (
      <Badge variant="outline" className="flex items-center gap-1" style={badgeStyle}>
        <Icon className="w-3 h-3" />
        {config.label}
        {isOverdue && <span className="ml-1 text-[10px] font-bold">!</span>}
      </Badge>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            loading || updating ? 'opacity-50 cursor-wait' : 'cursor-pointer'
          )}
          style={badgeStyle}
          disabled={loading || updating}
          aria-label={`Change status from ${config.label}`}
        >
          <Icon className="w-3 h-3" />
          {config.label}
          {isOverdue && <span className="ml-1 text-[10px] font-bold">!</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2 bg-popover border-border" align="end">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">
            Change Status
          </p>
          {allowedTransitions.map((statusKey) => {
            const statusConfig = STATUS_CONFIG[statusKey];
            const StatusIcon = statusConfig.icon;

            return (
              <Button
                key={statusKey}
                variant={'ghost'}
                size="sm"
                className={cn(
                  'w-full justify-start text-left font-normal'
                )}
                onClick={() => handleStatusSelect(statusKey)}
                disabled={updating}
              >
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs font-semibold"
                  style={statusConfig.style}
                >
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig.label}
                </span>
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
