import { Progress } from './ui/progress';
import { Card, CardContent } from './ui/card';
import {
    CheckCircle2,
    Clock,
    AlertCircle,
    TrendingUp,
    FileText
} from 'lucide-react';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export default function ProjectStats({ project, taskStats, invoiceStats }) {
    // Calculate stats if not provided (fallback)
    const completion = taskStats?.total > 0
        ? Math.round((taskStats.completed / taskStats.total) * 100)
        : (project.progress || 0);

    const stats = [
        {
            label: 'Overall Progress',
            value: `${completion}%`,
            icon: TrendingUp,
            color: 'text-primary',
            subtext: 'Based on completed tasks',
            metric: 'progress'
        },
        {
            label: 'Tasks',
            value: taskStats?.total || 0,
            icon: CheckCircle2,
            color: 'text-green-500',
            subtext: `${taskStats?.completed || 0} completed`,
            metric: 'tasks'
        },
        {
            label: 'Pending',
            value: taskStats?.pending || 0,
            icon: Clock,
            color: 'text-yellow-500',
            subtext: 'Tasks to do',
            metric: 'pending'
        },
        {
            label: 'Invoices Due',
            value: invoiceStats?.pendingCount || 0,
            icon: FileText,
            color: 'text-blue-500',
            subtext: invoiceStats?.overdueCount > 0 ? `${invoiceStats.overdueCount} overdue` : 'On track',
            metric: 'invoices'
        }
    ];

    const chartData = [
        { name: 'Completed', value: taskStats?.completed || 0 },
        { name: 'Pending', value: taskStats?.pending || 0 },
        { name: 'Invoices', value: invoiceStats?.pendingCount || 0 },
        { name: 'Overdue', value: invoiceStats?.overdueCount || 0 },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* KPI Cards */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stats.map((stat, index) => (
                    <Card key={index} className="shadow-sm border border-slate-200/60 dark:border-slate-800 bg-card">
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
            </div>

            {/* Quick Chart */}
            <Card className="shadow-sm border border-slate-200/60 dark:border-slate-800 bg-card hidden sm:block">
                <CardContent className="p-4 h-[160px] flex flex-col justify-center">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Project Overview</p>
                    <div style={{ width: '100%', height: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
