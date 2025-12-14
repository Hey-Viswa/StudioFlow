
import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function AnalyticsHeatmap({ data = [] }) {
  // Convert flat data to a map for O(1) lookup
  // Data format: { day: 1-7, hour: 0-23, count: number }
  const dataMap = useMemo(() => {
    const map = new Map();
    data.forEach(item => {
      // Create key "day-hour" e.g., "1-14"
      map.set(`${item.day}-${item.hour}`, item.count);
    });
    return map;
  }, [data]);

  // Determine max count for scaling color intensity
  const maxCount = useMemo(() => {
    let max = 0;
    for (const count of dataMap.values()) {
      if (count > max) max = count;
    }
    return max || 1; // Avoid division by zero
  }, [dataMap]);

  const getColor = (count) => {
    if (!count) return 'bg-muted/40'; // Empty state
    
    // Simple 4-step intensity scale similar to GitHub
    const intensity = count / maxCount;
    if (intensity < 0.25) return 'bg-green-200 dark:bg-green-900/40';
    if (intensity < 0.50) return 'bg-green-400 dark:bg-green-700/60';
    if (intensity < 0.75) return 'bg-green-500 dark:bg-green-600';
    return 'bg-green-600 dark:bg-green-500';
  };

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="min-w-[800px]">
        {/* Header Row (Hours) */}
        <div className="flex mb-2">
          <div className="w-10 flex-shrink-0" /> {/* Spacer for Day labels */}
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
                  // MongoDB $dayOfWeek is 1=Sun, 2=Mon... so index+1 matches
                  // Actually, let's verify if data comes as 1-indexed.
                  // YES, $dayOfWeek returns 1 (Sunday) to 7 (Saturday).
                  // So we use dayIndex + 1.
                  const count = dataMap.get(`${dayIndex + 1}-${hour}`) || 0;
                  
                  return (
                    <TooltipProvider key={`${day}-${hour}`}>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "aspect-square rounded-[2px] transition-colors hover:ring-2 hover:ring-ring hover:ring-offset-1 hover:z-10",
                              getColor(count)
                            )}
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
        
        {data.length === 0 ? (
          <div className="flex h-[200px] flex-col items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md bg-muted/20">
            <p>No activity recorded yet.</p>
            <p className="text-xs">Complete tasks or create projects to see your heatmap.</p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
             <div className="text-xs text-muted-foreground">
                <span className="font-medium">Tip:</span> Darker squares represent higher activity.
             </div>
             <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-1" role="img" aria-label="Activity Intensity Legend">
                <div className="w-3 h-3 rounded-[2px] bg-muted/40" title="No Activity"></div>
                <div className="w-3 h-3 rounded-[2px] bg-green-200 dark:bg-green-900/40" title="Low Activity"></div>
                <div className="w-3 h-3 rounded-[2px] bg-green-400 dark:bg-green-700/60" title="Medium Activity"></div>
                <div className="w-3 h-3 rounded-[2px] bg-green-500 dark:bg-green-600" title="High Activity"></div>
                <div className="w-3 h-3 rounded-[2px] bg-green-600 dark:bg-green-500" title="Peak Activity"></div>
              </div>
              <span>More</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
