import * as React from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Button } from "./ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart"
import { Line, LineChart, Pie, PieChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Area, AreaChart, ResponsiveContainer, Sector, Label } from "recharts"
import { Download, RefreshCw, TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react"
import { cn } from "../lib/utils"

// Chart configuration with proper HSL colors
const revenueChartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(221.2, 83.2%, 53.3%)", // Primary Blue
  },
}

const invoiceChartConfig = {
  invoices: {
    label: "Invoices",
  },
  draft: {
    label: "Draft",
    color: "hsl(215.4, 16.3%, 46.9%)", // Slate
  },
  sent: {
    label: "Sent",
    color: "hsl(221.2, 83.2%, 53.3%)", // Blue
  },
  paid: {
    label: "Paid",
    color: "hsl(142.1, 76.2%, 36.3%)", // Green
  },
  overdue: {
    label: "Overdue",
    color: "hsl(346.8, 77.2%, 49.8%)", // Red
  },
  cancelled: {
    label: "Cancelled",
    color: "hsl(215, 16%, 47%)", // Gray
  },
  failed: {
    label: "Failed",
    color: "hsl(0, 84%, 60%)", // Light Red
  },
}

const projectChartConfig = {
  "in-progress": {
    label: "In Progress",
    color: "hsl(221.2, 83.2%, 53.3%)", // Blue
  },
  completed: {
    label: "Completed",
    color: "hsl(142.1, 76.2%, 36.3%)", // Green
  },
  "needs-revision": {
    label: "Needs Revision",
    color: "hsl(47.9, 95.8%, 53.1%)", // Yellow
  },
}

const RevenueChart = React.forwardRef(({
  data = [],
  granularity = "monthly",
  onGranularityChange,
  className,
  ...props
}, ref) => {
  const hasData = data && data.length > 0
  const totalRevenue = React.useMemo(() =>
    data.reduce((sum, item) => sum + (item.revenue || 0), 0),
    [data]
  )

  // Calculate trend (comparing first and last data points)
  const trend = React.useMemo(() => {
    if (data.length < 2) return { direction: 'neutral', percentage: 0 }
    const first = data[0]?.revenue || 0
    const last = data[data.length - 1]?.revenue || 0

    if (first === 0) return { direction: 'neutral', percentage: 0 }

    const change = ((last - first) / first) * 100
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      percentage: Math.abs(change).toFixed(1)
    }
  }, [data])

  // Calculate max value for better Y-axis scaling
  const maxRevenue = React.useMemo(() => {
    if (!hasData) return 0
    const max = Math.max(...data.map(d => d.revenue || 0))
    return Math.ceil(max * 1.1) // Add 10% padding
  }, [data, hasData])

  return (
    <Card ref={ref} className={cn("", className)} {...props}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Revenue Over Time</CardTitle>
            <CardDescription>
              {hasData ? `Showing revenue for the last ${granularity === 'monthly' ? '6 months' : granularity === 'weekly' ? '8 weeks' : '30 days'}` : "Track revenue trends across time periods"}
            </CardDescription>
          </div>
          {onGranularityChange && (
            <Select value={granularity} onValueChange={onGranularityChange}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            <p className="text-sm">No revenue data available</p>
          </div>
        ) : (
          <ChartContainer config={revenueChartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  minTickGap={32}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                  domain={[0, maxRevenue]}
                  width={50}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="w-[180px]"
                      labelFormatter={(value) => {
                        return new Date(value).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      }}
                      formatter={(value) => ['₹' + value.toLocaleString('en-IN'), 'Revenue']}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-revenue)"
                  strokeWidth={3}
                  fill="url(#colorRevenue)"
                  animationDuration={1000}
                  animationEasing="ease-in-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm border-t pt-4">
        {hasData && (
          <>
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2 leading-none font-semibold text-lg">
                Total: ₹{totalRevenue.toLocaleString('en-IN')}
              </div>
              {trend.direction !== 'neutral' && (
                <div className={cn(
                  "flex items-center gap-1 text-sm font-medium",
                  trend.direction === 'up' ? "text-emerald-500" : "text-rose-500"
                )}>
                  {trend.direction === 'up' ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {trend.percentage}%
                </div>
              )}
            </div>
            <div className="text-muted-foreground leading-none w-full text-left text-xs">
              {trend.direction === 'up'
                ? `Revenue increased by ${trend.percentage}% in this period`
                : trend.direction === 'down'
                  ? `Revenue decreased by ${trend.percentage}% in this period`
                  : 'Revenue remained stable in this period'}
            </div>
          </>
        )}
      </CardFooter>
    </Card>
  )
})

RevenueChart.displayName = "RevenueChart"

const InvoiceStatusChart = React.forwardRef(({
  data = [],
  className,
  ...props
}, ref) => {
  const chartData = React.useMemo(() => {
    const transformed = [
      { status: 'draft', count: data.find(d => d.status === 'draft')?.count || 0, fill: invoiceChartConfig.draft.color },
      { status: 'sent', count: data.find(d => d.status === 'sent')?.count || 0, fill: invoiceChartConfig.sent.color },
      { status: 'paid', count: data.find(d => d.status === 'paid')?.count || 0, fill: invoiceChartConfig.paid.color },
      { status: 'overdue', count: data.find(d => d.status === 'overdue')?.count || 0, fill: invoiceChartConfig.overdue.color },
      { status: 'cancelled', count: data.find(d => d.status === 'cancelled')?.count || 0, fill: invoiceChartConfig.cancelled.color },
      { status: 'failed', count: data.find(d => d.status === 'failed')?.count || 0, fill: invoiceChartConfig.failed.color }
    ]
    return transformed
  }, [data])

  const totalInvoices = React.useMemo(() =>
    chartData.reduce((sum, item) => sum + item.count, 0),
    [chartData]
  )

  const hasData = chartData.length > 0

  return (
    <Card ref={ref} className={cn("flex flex-col", className)} {...props}>
      <CardHeader className="items-center pb-0">
        <CardTitle>Invoice Status</CardTitle>
        <CardDescription>Current distribution of all invoices</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {!hasData ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            <p className="text-sm">No invoice data available</p>
          </div>
        ) : (
          <ChartContainer
            config={invoiceChartConfig}
            className="mx-auto aspect-square max-h-[300px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    className="w-[160px]"
                    formatter={(value, name) => (
                      <>
                        <div
                          className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                          style={{
                            backgroundColor: `var(--color-${name})`,
                          }}
                        />
                        {invoiceChartConfig[name]?.label || name}
                        <div className="ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums text-foreground">
                          {value}
                          <span className="font-normal text-muted-foreground">
                            inv
                          </span>
                        </div>
                      </>
                    )}
                  />
                }
              />
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="status"
                innerRadius={60}
                strokeWidth={5}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-3xl font-bold"
                          >
                            {totalInvoices.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 24}
                            className="fill-muted-foreground text-xs"
                          >
                            Invoices
                          </tspan>
                        </text>
                      )
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm pt-4">
        {hasData && (
          <div className="grid grid-cols-2 gap-2 w-full text-xs">
            {chartData.map((item) => (
              <div key={item.status} className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="text-muted-foreground capitalize">{item.status}:</span>
                <span className="font-medium ml-auto">{item.count}</span>
              </div>
            ))}
          </div>
        )}
      </CardFooter>
    </Card>
  )
})


InvoiceStatusChart.displayName = "InvoiceStatusChart"

const ProjectProgressChart = React.forwardRef(({
  data = [],
  className,
  ...props
}, ref) => {
  const hasData = data && data.length > 0

  // Calculate totals for each status
  const totals = React.useMemo(() => {
    if (!hasData) return { inProgress: 0, completed: 0, needsRevision: 0 }
    return {
      inProgress: data.reduce((sum, item) => sum + (item['in-progress'] || 0), 0),
      completed: data.reduce((sum, item) => sum + (item.completed || 0), 0),
      needsRevision: data.reduce((sum, item) => sum + (item['needs-revision'] || 0), 0),
    }
  }, [data, hasData])

  const maxValue = React.useMemo(() => {
    if (!hasData) return 10
    const values = data.flatMap(d => [
      d['in-progress'] || 0,
      d.completed || 0,
      d['needs-revision'] || 0
    ])
    const max = Math.max(...values, 1)
    return Math.ceil(max * 1.2)
  }, [data, hasData])

  const grandTotal = totals.inProgress + totals.completed + totals.needsRevision

  return (
    <Card ref={ref} className={cn("", className)} {...props}>
      <CardHeader>
        <CardTitle>Project Progress</CardTitle>
        <CardDescription>
          Weekly tracking of project statuses over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            <p className="text-sm">No project data available</p>
          </div>
        ) : (
          <ChartContainer config={projectChartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{
                  top: 20,
                  right: 20,
                  left: 0,
                  bottom: 10,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="week"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  domain={[0, maxValue]}
                  width={40}
                  allowDecimals={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="w-[200px]"
                      labelFormatter={(value) => value}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="var(--color-completed)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="in-progress"
                  stroke="var(--color-in-progress)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="needs-revision"
                  stroke="var(--color-needs-revision)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-3 text-sm border-t pt-4">
        {hasData && (
          <>
            <div className="flex w-full items-center justify-between">
              <span className="font-semibold text-base">Total Projects: {grandTotal}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 w-full text-xs">
              <div className="flex flex-col items-start gap-1 p-2 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[hsl(var(--chart-2))]" />
                  <span className="text-muted-foreground font-medium">Done</span>
                </div>
                <span className="font-bold text-lg text-[hsl(var(--chart-2))]">{totals.completed}</span>
              </div>
              <div className="flex flex-col items-start gap-1 p-2 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[hsl(var(--chart-1))]" />
                  <span className="text-muted-foreground font-medium">Active</span>
                </div>
                <span className="font-bold text-lg text-[hsl(var(--chart-1))]">{totals.inProgress}</span>
              </div>
              <div className="flex flex-col items-start gap-1 p-2 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[hsl(var(--chart-3))]" />
                  <span className="text-muted-foreground font-medium">Revise</span>
                </div>
                <span className="font-bold text-lg text-[hsl(var(--chart-3))]">{totals.needsRevision}</span>
              </div>
            </div>
          </>
        )}
      </CardFooter>
    </Card>
  )
})

ProjectProgressChart.displayName = "ProjectProgressChart"

const DashboardGraphs = React.forwardRef(({
  revenueData = [],
  invoiceStatusData = [],
  projectProgressData = [],
  revenueGranularity = "monthly",
  onRevenueGranularityChange,
  onRefresh,
  onExport,
  className,
  ...props
}, ref) => {
  return (
    <div ref={ref} className={cn("space-y-4", className)} {...props}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Analytics</h2>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} className="h-8">
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Refresh
            </Button>
          )}
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport} className="h-8">
              <Download className="h-3.5 w-3.5 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
        <RevenueChart
          data={revenueData}
          granularity={revenueGranularity}
          onGranularityChange={onRevenueGranularityChange}
          className="col-span-1 md:col-span-2"
        />
        <InvoiceStatusChart data={invoiceStatusData} className="col-span-1" />
        <ProjectProgressChart data={projectProgressData} className="col-span-1" />
      </div>
    </div>
  )
})

DashboardGraphs.displayName = "DashboardGraphs"

export { DashboardGraphs, RevenueChart, InvoiceStatusChart, ProjectProgressChart }
