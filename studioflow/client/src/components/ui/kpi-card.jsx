import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { cn } from "../../lib/utils"

const KpiCard = React.forwardRef(({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend,
  trendValue,
  className,
  ...props 
}, ref) => {
  const getTrendColor = () => {
    if (!trend) return ""
    return trend === "up" ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
  }

  return (
    <Card ref={ref} className={cn("", className)} {...props}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {Icon && (
          <Icon className="h-4 w-4 text-muted-foreground" />
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trendValue) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            {trendValue && (
              <span className={cn("font-medium", getTrendColor())}>
                {trend === "up" ? "↑" : "↓"} {trendValue}
              </span>
            )}
            {description && <span>{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
})

KpiCard.displayName = "KpiCard"

export { KpiCard }
