import { Progress } from './ui/progress';
import { Card, CardContent } from './ui/card';
import {
    CheckCircle2,
    Clock,
    AlertCircle,
    TrendingUp,
    FileText
} from 'lucide-react';

export default function ProjectStats({ project, taskStats, invoiceStats }) {
    // Calculate stats if not provided (fallback)
    const completion = project.progress || 0;

    const stats = [
        {
            label: 'Overall Progress',
            value: `${completion}%`,
            icon: TrendingUp,
            color: 'text-primary',
            subtext: 'Based on completed tasks'
        },
        {
            label: 'Tasks',
            value: taskStats?.total || 0,
            icon: CheckCircle2,
            color: 'text-green-500',
            subtext: `${taskStats?.completed || 0} completed`
        },
        {
            label: 'Pending',
            value: taskStats?.pending || 0,
            icon: Clock,
            color: 'text-yellow-500',
            subtext: 'Tasks to do'
        },
        {
            label: 'Invoices Due',
            value: invoiceStats?.pendingCount || 0,
            icon: FileText,
            color: 'text-blue-500',
            subtext: invoiceStats?.overdueCount > 0 ? `${invoiceStats.overdueCount} overdue` : 'On track'
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
                <Card key={index} className="shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                            <p className="text-2xl font-bold">{stat.value}</p>
                            <p className="text-xs text-muted-foreground">{stat.subtext}</p>
                        </div>
                        <div className={`p-2 rounded-full bg-muted/40 ${stat.color}`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>
            ))}

            {/* Visual Progress Bar - Optional if using card above */}
            {/* <div className="col-span-full mt-2">
        <div className="flex justify-between text-xs mb-1">
          <span>Project Completion</span>
          <span>{completion}%</span>
        </div>
        <Progress value={completion} className="h-2" />
      </div> */}
        </div>
    );
}
