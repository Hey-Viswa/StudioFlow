import * as React from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Button } from "./ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart"
import { Line, LineChart, Pie, PieChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { Download, RefreshCw, TrendingUp } from "lucide-react"
import { cn } from "../lib/utils"

// Chart configuration with proper shadcn/ui chart colors
const revenueChartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)",
  },
}

const invoiceChartConfig = {
  invoices: {
    label: "Invoices",
  },
  draft: {
    label: "Draft",
    color: "var(--chart-1)",
  },
  sent: {
    label: "Sent",
    color: "var(--chart-2)",
  },
  paid: {
    label: "Paid",
    color: "var(--chart-3)",
  },
  overdue: {
    label: "Overdue",
    color: "var(--chart-4)",
  },
}

const projectChartConfig = {
  "in-progress": {
    label: "In Progress",
    color: "var(--chart-1)",
  },
  completed: {
    label: "Completed",
    color: "var(--chart-2)",
  },
  "needs-revision": {
    label: "Needs Revision",
    color: "var(--chart-3)",
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

  return (
    <Card ref={ref} className={cn("", className)} {...props}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Revenue Over Time</CardTitle>
            <CardDescription>
              {hasData ? `Showing revenue for the last ${granularity === 'monthly' ? '6 months' : granularity === 'weekly' ? '8 weeks' : '30 days'}` : "Track revenue trends across time periods"}
            </CardDescription>
          </div>
          {onGranularityChange && (
            <Select value={granularity} onValueChange={onGranularityChange}>
              <SelectTrigger className="w-32">
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
          <div className="flex h-[250px] items-center justify-center text-muted-foreground">
            <p className="text-sm">No revenue data available</p>
          </div>
        ) : (
          <ChartContainer config={revenueChartConfig} className="h-[250px] w-full">
            <LineChart
              data={data}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis 
                dataKey="date" 
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="w-[150px]"
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    }}
                    formatter={(value) => `₹${value.toLocaleString()}`}
                  />
                }
              />
              <Line
                dataKey="revenue"
                type="monotone"
                stroke="var(--color-revenue)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        {hasData && (
          <>
            <div className="flex items-center gap-2 leading-none font-medium">
              Total Revenue: ₹{totalRevenue.toLocaleString()} <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground leading-none">
              Showing total revenue for the selected period
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
      { status: 'draft', count: data.find(d => d.status === 'draft')?.count || 0, fill: "var(--color-draft)" },
      { status: 'sent', count: data.find(d => d.status === 'sent')?.count || 0, fill: "var(--color-sent)" },
      { status: 'paid', count: data.find(d => d.status === 'paid')?.count || 0, fill: "var(--color-paid)" },
      { status: 'overdue', count: data.find(d => d.status === 'overdue')?.count || 0, fill: "var(--color-overdue)" }
    ]
    return transformed.filter(d => d.count > 0)
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
          <div className="flex h-[250px] items-center justify-center text-muted-foreground">
            <p className="text-sm">No invoice data available</p>
          </div>
        ) : (
          <ChartContainer 
            config={invoiceChartConfig} 
            className="mx-auto aspect-square max-h-[250px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie 
                data={chartData} 
                dataKey="count" 
                nameKey="status" 
              />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        {hasData && (
          <>
            <div className="flex items-center gap-2 leading-none font-medium">
              Total: {totalInvoices} invoices
            </div>
            <div className="text-muted-foreground leading-none">
              Breakdown by current status
            </div>
          </>
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

  return (
    <Card ref={ref} className={cn("", className)} {...props}>
      <CardHeader>
        <CardTitle>Project Progress</CardTitle>
        <CardDescription>
          Weekly breakdown of project statuses
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[250px] items-center justify-center text-muted-foreground">
            <p className="text-sm">No project data available</p>
          </div>
        ) : (
          <ChartContainer config={projectChartConfig} className="h-[250px] w-full">
            <BarChart data={data}>
              <XAxis 
                dataKey="week" 
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => {
                  return value
                }}
              />
              <Bar 
                dataKey="in-progress" 
                stackId="a"
                fill="var(--color-in-progress)" 
                radius={[0, 0, 4, 4]}
              />
              <Bar 
                dataKey="completed" 
                stackId="a"
                fill="var(--color-completed)" 
                radius={[0, 0, 4, 4]}
              />
              <Bar 
                dataKey="needs-revision" 
                stackId="a"
                fill="var(--color-needs-revision)" 
                radius={[4, 4, 0, 0]}
              />
              <ChartTooltip
                content={<ChartTooltipContent />}
                cursor={false}
                defaultIndex={1}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        {hasData && (
          <div className="text-muted-foreground leading-none">
            Stacked view of project counts by status
          </div>
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
        <h2 className="text-2xl font-semibold">Analytics</h2>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RevenueChart 
          data={revenueData}
          granularity={revenueGranularity}
          onGranularityChange={onRevenueGranularityChange}
          className="md:col-span-2"
        />
        <InvoiceStatusChart data={invoiceStatusData} />
        <ProjectProgressChart data={projectProgressData} />
      </div>
    </div>
  )
})

DashboardGraphs.displayName = "DashboardGraphs"

export { DashboardGraphs, RevenueChart, InvoiceStatusChart, ProjectProgressChart }
