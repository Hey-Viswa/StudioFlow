import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { formatINR, formatCompactNumber } from '../../utils/currency';
import {
  DollarSign,
  CheckCircle2,
  Send,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

export default function InvoicesKPI({ stats, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-6 bg-card border-border">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </Card>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      label: 'Total Billed',
      value: stats.totalBilled,
      count: stats.countPaid + stats.countSent + stats.countOverdue,
      icon: DollarSign,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      iconColor: 'rgb(59 130 246)',
      trend: null
    },
    {
      label: 'Paid',
      value: stats.totalPaid,
      count: stats.countPaid,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      iconColor: 'rgb(22 163 74)',
      trend: stats.totalPaid > 0 ? 'up' : null
    },
    {
      label: 'Sent',
      value: stats.totalSent,
      count: stats.countSent,
      icon: Send,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      iconColor: 'rgb(249 115 22)',
      trend: null
    },
    {
      label: 'Overdue',
      value: stats.totalOverdue,
      count: stats.countOverdue,
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      iconColor: 'rgb(239 68 68)',
      trend: stats.countOverdue > 0 ? 'down' : null
    },
    {
      label: 'Cancelled',
      value: stats.totalCancelled,
      count: stats.countCancelled,
      icon: XCircle,
      color: 'text-gray-500',
      bgColor: 'bg-gray-500/10',
      iconColor: 'rgb(107 114 128)',
      trend: null
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const TrendIcon = kpi.trend === 'up' ? TrendingUp : TrendingDown;

        return (
          <Card key={kpi.label} className="p-6 bg-card border-border hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                    <Icon className="w-5 h-5" style={{ color: kpi.iconColor }} />
                  </div>
                  {kpi.trend && (
                    <TrendIcon
                      className={`w-4 h-4 ${kpi.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}
                    />
                  )}
                </div>

                <p className="text-sm text-muted-foreground mb-1">{kpi.label}</p>

                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-foreground">
                    {formatINR(kpi.value, { compact: true })}
                  </p>
                </div>

                <p className="text-xs text-muted-foreground mt-1">
                  {kpi.count} {kpi.count === 1 ? 'invoice' : 'invoices'}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

