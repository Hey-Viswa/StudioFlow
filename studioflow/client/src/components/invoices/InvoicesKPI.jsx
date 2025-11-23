import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { formatINR, formatCompactNumber } from '../../utils/currency';
import { 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

export default function InvoicesKPI({ stats, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6 bg-slate-900 border-slate-800">
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
      count: stats.countPaid + stats.countPending + stats.countOverdue,
      icon: DollarSign,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      trend: null
    },
    {
      label: 'Paid',
      value: stats.totalPaid,
      count: stats.countPaid,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      trend: stats.totalPaid > 0 ? 'up' : null
    },
    {
      label: 'Pending',
      value: stats.totalPending,
      count: stats.countPending,
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      trend: null
    },
    {
      label: 'Overdue',
      value: stats.totalOverdue,
      count: stats.countOverdue,
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      trend: stats.countOverdue > 0 ? 'down' : null
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const TrendIcon = kpi.trend === 'up' ? TrendingUp : TrendingDown;

        return (
          <Card key={kpi.label} className="p-6 bg-card border-slate-800 hover:border-slate-700 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                    <Icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                  {kpi.trend && (
                    <TrendIcon 
                      className={`w-4 h-4 ${kpi.trend === 'up' ? 'text-green-500' : 'text-red-500'}`} 
                    />
                  )}
                </div>
                
                <p className="text-sm text-slate-400 mb-1">{kpi.label}</p>
                
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-white">
                    {formatINR(kpi.value, { compact: true })}
                  </p>
                </div>
                
                <p className="text-xs text-slate-500 mt-1">
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
