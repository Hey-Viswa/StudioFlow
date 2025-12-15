import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@clerk/clerk-react';
import { useSearchParams } from 'react-router-dom';
import AnalyticsHeatmap from '@/components/analytics/AnalyticsHeatmap';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, CheckCircle2, AlertCircle, RefreshCw, DollarSign, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function AnalyticsDashboard() {
  const { getToken } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get initial values from URL or defaults
  const initialRange = searchParams.get('range') || 'week'; // 'day', 'week', 'month'
  const initialView = searchParams.get('view') || 'heatmap'; // 'heatmap', 'line'

  // We can keep local state for immediate UI feedback, or just derive from URL. 
  // Deriving strictly from URL can cause latency if we wait for navigation.
  // Using local state synced with URL is a common pattern for responsiveness.
  const [range, setRangeState] = useState(initialRange);
  const [viewMode, setViewModeState] = useState(initialView);
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync State Helpers
  const setRange = (value) => {
    setRangeState(value);
    setSearchParams(prev => {
      prev.set('range', value);
      return prev;
    }, { replace: true });
  };

  const setViewMode = (value) => {
    setViewModeState(value);
    setSearchParams(prev => {
      prev.set('view', value);
      return prev;
    }, { replace: true });
  };

  const fetchAnalytics = async (selectedRange) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/analytics/overview?range=${selectedRange}`, { getToken });
      setData(response);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      // ... error handling
      if (err.message.includes('403') || err.message.includes('disabled')) {
        setError('Analytics dashboard is currently disabled by your administrator.');
      } else {
        setError('Failed to load analytics data.');
      }
      toast.error('Could not load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Effect to handle URL changes (e.g. back button) and initial load
  useEffect(() => {
    const rangeFromUrl = searchParams.get('range') || 'week';
    const viewFromUrl = searchParams.get('view') || 'heatmap';
    
    // Sync local state if URL changed externally
    if (rangeFromUrl !== range) setRangeState(rangeFromUrl);
    if (viewFromUrl !== viewMode) setViewModeState(viewFromUrl);

    fetchAnalytics(rangeFromUrl);
  }, [searchParams]); 

  if (loading && !data) {
    // ... loading state
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
         <Loader2 className="w-8 h-8 animate-spin text-primary" />
         <p className="text-muted-foreground animate-pulse">Analyzing studio data...</p>
      </div>
    );
  }

  // ... error state
  if (error) {
     const isAccessDenied = error.includes('disabled') || error.includes('Access Denied');
     return (
       <div className="flex flex-col items-center justify-center h-[50vh] gap-4 p-8 text-center">
         <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isAccessDenied ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
           <AlertCircle className="w-6 h-6" />
         </div>
         <h3 className="text-xl font-semibold">{isAccessDenied ? 'Access Restricted' : 'Unable to Load Data'}</h3>
         <p className="text-muted-foreground max-w-md">
           {error}
         </p>
         <Button onClick={() => fetchAnalytics(range)} variant="outline">Try Again</Button>
       </div>
     );
  }

  const { summary, heatmap, timeline, meta } = data || {};

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Overview</h1>
          <p className="text-muted-foreground mt-1">
            Real-time insights into your studio's performance.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full border border-border/50">
           {meta?.cached ? (
             <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Cached</span>
           ) : (
             <span className="flex items-center gap-1.5 text-primary"><RefreshCw className="w-3 h-3 animate-spin duration-[3000ms]" /> Live</span>
           )}
           <span>•</span>
           <span>Updated {new Date(meta?.generatedAt).toLocaleTimeString()}</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Projects Completed" 
          value={summary?.projectsCompleted} 
          icon={CheckCircle2}
          color="text-emerald-500"
          description="Total delivered projects"
        />
        <KpiCard 
          title="Revisions Count" 
          value={summary?.revisionsCount} 
          icon={RefreshCw}
          color="text-orange-500"
          description="Iterative cycles"
        />
        <KpiCard 
          title="Payment Success" 
          value={`${summary?.paymentSuccessRate}%`} 
          icon={TrendingUp}
          color="text-blue-500"
          description="Paid invoices rate"
        />
        <KpiCard 
          title="Avg Invoice Value" 
          value={`₹${summary?.avgInvoiceValue}`} // Changed to Rupee symbol
          icon={DollarSign}
          color="text-green-500"
          description="Per paid invoice" 
        />
      </div>

      {/* Heatmap Section */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Activity {range === 'day' ? 'Timeline' : 'Trends'}
          </CardTitle>
          <CardDescription>
            Visualizing your active working hours ({range === 'today' ? 'today' : range === 'month' ? 'last 30 days' : 'last 7 days'}).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnalyticsHeatmap 
            data={heatmap} 
            timeline={timeline}
            range={range}
            onRangeChange={setRange}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
          {heatmap && heatmap.length > 0 && (
             <div className="mt-6 pt-6 border-t border-border/50">
               <h4 className="text-sm font-semibold mb-2">Weekly Insight</h4>
               <p className="text-sm text-muted-foreground">
                 {getHeatmapInsight(heatmap)}
               </p>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper to generate a simple text insight
function getHeatmapInsight(data) {
    if (!data || data.length === 0) return "Start working on projects to see insights here.";
    
    // Find peak day
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = {};
    let maxCount = 0;
    let peakDay = '';

    data.forEach(item => {
        const day = days[item.day - 1]; // data.day is 1-indexed
        dayCounts[day] = (dayCounts[day] || 0) + item.count;
        if (dayCounts[day] > maxCount) {
            maxCount = dayCounts[day];
            peakDay = day;
        }
    });

    return `You seem to be most productive on ${peakDay}s. Keep up the momentum!`;
}

function KpiCard({ title, value, icon: Icon, color, description }) {
  return (
    <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
