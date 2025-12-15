import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useThemeColor } from '../ThemeColorProvider';
import { useTheme } from 'next-themes';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { LayoutGrid, LineChart as LineChartIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const THEME_COLORS = {
  green: { hex: '#10b981', tailwind: 'bg-emerald-500' },
  blue: { hex: '#3b82f6', tailwind: 'bg-blue-500' },
  violet: { hex: '#8b5cf6', tailwind: 'bg-violet-500' },
  orange: { hex: '#f97316', tailwind: 'bg-orange-500' },
  rose: { hex: '#f43f5e', tailwind: 'bg-rose-500' },
  yellow: { hex: '#eab308', tailwind: 'bg-yellow-500' },
  red: { hex: '#ef4444', tailwind: 'bg-red-500' },
  zinc: { hex: '#71717a', tailwind: 'bg-zinc-500' },
};

export default function AnalyticsHeatmap({ 
  data = [], 
  timeline = [], 
  range, 
  onRangeChange,
  viewMode = 'heatmap',
  onViewModeChange 
}) {
  const { themeColor } = useThemeColor();
  const { theme } = useTheme();
  // const [viewMode, setViewMode] = useState('heatmap'); // Removed local state

  // Get current active color
  const activeColor = THEME_COLORS[themeColor] || THEME_COLORS.green;

  // --- Heatmap Logic ---
  const dataMap = useMemo(() => {
    const map = new Map();
    data.forEach(item => {
      map.set(`${item.day}-${item.hour}`, item.count);
    });
    return map;
  }, [data]);

  const maxCount = useMemo(() => {
    let max = 0;
    for (const count of dataMap.values()) {
      if (count > max) max = count;
    }
    return max || 1;
  }, [dataMap]);

  const getHeatmapColor = (count) => {
    if (!count) return 'bg-slate-100 dark:bg-slate-800'; 
    const intensity = count / maxCount;
    // Dynamic opacity based on base color could be better, but sticking to simple mapping for now
    // We can use the theme color with different opacities or stick to the previous hardcoded emerald if strict theme sync is hard to map to 4 shades tailwind-dynamically.
    // However, user requested "theme sync". 
    // To do proper tailwind dynamic classes: `bg-${color}-200` doesn't work well with arbitrary color names unless safe-listed.
    // So we'll use style with opacity.
    
    return activeColor.hex; 
  };
  
  const getCellStyle = (count) => {
    if (!count) return {};
    const intensity = Math.max(0.2, count / maxCount); // Min 0.2 opacity
    return { 
      backgroundColor: activeColor.hex, 
      opacity: intensity 
    };
  };

  // --- Render ---
  return (
    <div className="w-full space-y-4">
      {/* Controls Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
           <Button 
             variant={viewMode === 'heatmap' ? 'secondary' : 'ghost'} 
             size="sm" 
             className="h-8 gap-2"
             onClick={() => onViewModeChange && onViewModeChange('heatmap')}
           >
             <LayoutGrid className="w-4 h-4" />
             <span className="hidden sm:inline">Heatmap</span>
           </Button>
           <Button 
             variant={viewMode === 'line' ? 'secondary' : 'ghost'} 
             size="sm" 
             className="h-8 gap-2"
             onClick={() => onViewModeChange && onViewModeChange('line')}
           >
             <LineChartIcon className="w-4 h-4" />
             <span className="hidden sm:inline">Line Chart</span>
           </Button>
        </div>

        <div className="flex items-center gap-2">
           <span className="text-xs font-medium text-muted-foreground mr-1">Time Range:</span>
           <Select value={range} onValueChange={onRangeChange}>
             <SelectTrigger className="h-8 w-[120px]">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="day">Today (24h)</SelectItem>
               <SelectItem value="week">This Week</SelectItem>
               <SelectItem value="month">Last 30 Days</SelectItem>
             </SelectContent>
           </Select>
        </div>
      </div>

      {viewMode === 'heatmap' ? (
        <div className="w-full overflow-x-auto pb-4">
          <div className="min-w-[800px]">
             {/* Header Row (Hours) */}
            <div className="flex mb-2">
              <div className="w-10 flex-shrink-0" />
              <div className="flex-1 grid grid-cols-24 gap-1">
                {HOURS.map((hour) => (
                  <div key={hour} className="text-[10px] text-muted-foreground text-center">
                    {hour === 0 ? '12am' : hour === 12 ? '12pm' : hour > 12 ? hour - 12 : hour}
                  </div>
                ))}
              </div>
            </div>

            {/* Rows (Days) */}
            <div className="space-y-1">
              {DAYS.map((day, dayIndex) => (
                <div key={day} className="flex items-center">
                  <div className="w-10 text-xs text-muted-foreground flex-shrink-0 font-medium">
                    {day}
                  </div>
                  <div className="flex-1 grid grid-cols-24 gap-1">
                    {HOURS.map((hour) => {
                      const count = dataMap.get(`${dayIndex + 1}-${hour}`) || 0;
                      return (
                        <TooltipProvider key={`${day}-${hour}`}>
                          <Tooltip delayDuration={100}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "aspect-square rounded-[2px] transition-all hover:ring-2 hover:ring-ring hover:ring-offset-1 hover:z-10",
                                  !count && 'bg-slate-100 dark:bg-slate-800'
                                )}
                                style={getCellStyle(count)}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs font-medium">
                                {count} {count === 1 ? 'activity' : 'activities'} on {day} at {hour}:00
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {data.length === 0 && (
              <div className="flex h-[200px] flex-col items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md bg-muted/20 mt-4">
                <p>No activity recorded yet.</p>
                <p className="text-xs">Complete tasks or create projects to populate data.</p>
              </div>
            )}
            
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground w-full">
               <span>Darker color = Higher activity</span>
               <div className="flex items-center gap-1">
                  <span>Less</span>
                  <div className="w-3 h-3 rounded-[2px] bg-slate-100 dark:bg-slate-800" />
                  <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: activeColor.hex, opacity: 0.3 }} />
                  <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: activeColor.hex, opacity: 0.6 }} />
                  <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: activeColor.hex, opacity: 1 }} />
                  <span>More</span>
               </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-[350px] w-full animate-in fade-in duration-300">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={activeColor.hex} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={activeColor.hex} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis 
                dataKey="label" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} 
                minTickGap={30}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} 
                allowDecimals={false}
              />
              <RechartsTooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--popover)' }}
                itemStyle={{ color: 'var(--foreground)' }}
                labelStyle={{ color: 'var(--muted-foreground)' }}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke={activeColor.hex} 
                fillOpacity={1} 
                fill="url(#colorCount)" 
                strokeWidth={2}
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
