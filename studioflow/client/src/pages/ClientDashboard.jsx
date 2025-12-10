import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { toast } from 'sonner'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { KpiCard } from '../components/ui/kpi-card'
import { Badge } from '../components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '../components/ui/breadcrumb'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Textarea } from '../components/ui/textarea'
import { ProjectCard } from '../components/ProjectCard'
import { FilesStrip } from '../components/FilesStrip'
import { DashboardGraphs } from '../components/DashboardGraphs'
import { useProjects, useProjectMetrics } from '../hooks/useProjects'
import { useSocket } from '../hooks/useSocket'
import { ShimmerDashboard } from '../components/skeletons/ShimmerDashboard'
import {
  Search,
  IndianRupee,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Download,
  Eye,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'

export default function ClientDashboard() {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const socket = useSocket()

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [dateRange, setDateRange] = useState('all')

  // Memoize filters to prevent unnecessary re-renders
  const filters = useMemo(() => ({
    search: searchTerm,
    status: statusFilter,
    clientId: clientFilter,
    dateRange: dateRange
  }), [searchTerm, statusFilter, clientFilter, dateRange])

  // Data
  const { projects, loading: projectsLoading, refetch: refetchProjects, requestRevision, approveFinal } = useProjects(filters)
  const { metrics, loading: metricsLoading } = useProjectMetrics()

  // UI State
  const [selectedProject, setSelectedProject] = useState(null)
  const [revisionModalOpen, setRevisionModalOpen] = useState(false)
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [revisionNotes, setRevisionNotes] = useState('')
  const [recentFiles, setRecentFiles] = useState([])
  const [recentInvoices, setRecentInvoices] = useState([])
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all')

  // Chart data
  const [revenueGranularity, setRevenueGranularity] = useState('monthly')
  const [chartData, setChartData] = useState({
    revenue: [],
    invoiceStatus: [],
    projectProgress: []
  })

  // Fetch dashboard data with memoization
  const fetchDashboardData = useCallback(async () => {
    try {
      const token = await getToken()
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

      const [filesRes, invoicesRes, chartsRes] = await Promise.all([
        fetch(`${apiUrl}/dashboard/recent-files`, {
          credentials: 'include',
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        }),
        fetch(`${apiUrl}/dashboard/recent-invoices`, {
          credentials: 'include',
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        }),
        fetch(`${apiUrl}/dashboard/charts`, {
          credentials: 'include',
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        })
      ])

      if (filesRes.ok) {
        const filesData = await filesRes.json()
        setRecentFiles(filesData.files || [])
      }

      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json()
        setRecentInvoices(invoicesData.invoices || [])
      }

      if (chartsRes.ok) {
        const chartsData = await chartsRes.json()
        setChartData(chartsData)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }, [getToken])

  // Only fetch dashboard data once on mount
  useEffect(() => {
    fetchDashboardData()
  }, []) // Empty dependency array - only run once

  // Real-time updates
  useEffect(() => {
    if (!socket) return

    const handleRefresh = () => {
      console.log('🔄 Real-time update received, refreshing dashboard...')
      fetchDashboardData()
      refetchProjects()
    }

    // Listen for relevant events
    socket.on('project-created', handleRefresh)
    socket.on('project-updated', handleRefresh)
    socket.on('project-deleted', handleRefresh)
    socket.on('invoice-created', handleRefresh)
    socket.on('invoice-updated', handleRefresh)
    socket.on('invoice-paid', handleRefresh)
    socket.on('file-uploaded', handleRefresh)
    socket.on('file-deleted', handleRefresh)

    return () => {
      socket.off('project-created', handleRefresh)
      socket.off('project-updated', handleRefresh)
      socket.off('project-deleted', handleRefresh)
      socket.off('invoice-created', handleRefresh)
      socket.off('invoice-updated', handleRefresh)
      socket.off('invoice-paid', handleRefresh)
      socket.off('file-uploaded', handleRefresh)
      socket.off('file-deleted', handleRefresh)
    }
  }, [socket, fetchDashboardData, refetchProjects])

  const handleRequestRevision = (projectId) => {
    const project = projects.find(p => p._id === projectId)
    setSelectedProject(project)
    setRevisionModalOpen(true)
  }

  const handleApproveFinal = (projectId) => {
    const project = projects.find(p => p._id === projectId)
    setSelectedProject(project)
    setApproveModalOpen(true)
  }

  const submitRevisionRequest = async () => {
    if (!selectedProject || !revisionNotes.trim()) {
      toast.error('Please provide revision notes')
      return
    }

    try {
      await requestRevision(selectedProject._id, revisionNotes)
      toast.success('Revision request submitted')
      setRevisionModalOpen(false)
      setRevisionNotes('')
      setSelectedProject(null)
      refetchProjects()
    } catch (error) {
      console.error('Error requesting revision:', error)
    }
  }

  const submitApproval = async () => {
    if (!selectedProject) return

    try {
      await approveFinal(selectedProject._id)
      toast.success('Project approved successfully!')
      setApproveModalOpen(false)
      setSelectedProject(null)
      refetchProjects()
    } catch (error) {
      console.error('Error approving project:', error)
    }
  }

  const handleExportCharts = () => {
    try {
      // Prepare data for CSV
      const csvRows = [];

      // Header
      csvRows.push(['Dashboard Analytics Export']);
      csvRows.push([`Generated on: ${new Date().toLocaleString()}`]);
      csvRows.push([]); // Empty line

      // Revenue Data
      csvRows.push(['Revenue Data']);
      csvRows.push(['Date', 'Revenue']);
      chartData.revenue.forEach(item => {
        csvRows.push([item.date, item.revenue]);
      });
      csvRows.push([]);

      // Invoice Status Data
      csvRows.push(['Invoice Status Distribution']);
      csvRows.push(['Status', 'Count']);
      chartData.invoiceStatus.forEach(item => {
        csvRows.push([item.status, item.count]);
      });
      csvRows.push([]);

      // Project Progress Data
      csvRows.push(['Project Progress']);
      csvRows.push(['Week', 'In Progress', 'Completed', 'Needs Revision']);
      chartData.projectProgress.forEach(item => {
        csvRows.push([
          item.week,
          item['in-progress'] || 0,
          item.completed || 0,
          item['needs-revision'] || 0
        ]);
      });

      // Convert to CSV string
      const csvContent = "data:text/csv;charset=utf-8,"
        + csvRows.map(e => e.join(",")).join("\n");

      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `dashboard_analytics_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);

      // Trigger download
      link.click();
      document.body.removeChild(link);

      toast.success('Analytics exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export analytics');
    }
  }

  const uniqueClients = useMemo(() => {
    const allClients = projects.flatMap(p =>
      p.members?.filter(m => m.role === 'client').map(m => ({ id: m.userId, name: m.name || m.email })) || []
    )
    return Array.from(new Map(allClients.map(c => [c.id, c])).values())
  }, [projects])

  const filteredProjects = projects

  const filteredInvoices = recentInvoices.filter(inv =>
    invoiceStatusFilter === 'all' || inv.status === invoiceStatusFilter
  )

  // Loading State - Shimmer Effect
  if (projectsLoading || metricsLoading) {
    return <ShimmerDashboard />
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Breadcrumbs */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor projects, invoices, and collaborate with your team
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Total Billed"
            value={`₹${metrics.totalBilled?.toLocaleString() || 0}`}
            description="Total amount invoiced"
            icon={IndianRupee}
            trend={metrics.totalBilledChange >= 0 ? "up" : "down"}
            trendValue={`${metrics.totalBilledChange >= 0 ? '+' : ''}${metrics.totalBilledChange?.toFixed(1) || 0}%`}
          />
          <KpiCard
            title="Paid"
            value={`₹${metrics.totalPaid?.toLocaleString() || 0}`}
            description="Successfully collected"
            icon={CheckCircle2}
            trend={metrics.totalPaidChange >= 0 ? "up" : "down"}
            trendValue={`${metrics.totalPaidChange >= 0 ? '+' : ''}${metrics.totalPaidChange?.toFixed(1) || 0}%`}
          />
          <KpiCard
            title="Outstanding"
            value={`₹${metrics.outstanding?.toLocaleString() || 0}`}
            description="Awaiting payment"
            icon={Clock}
          />
          <KpiCard
            title="Overdue"
            value={`₹${metrics.overdue?.toLocaleString() || 0}`}
            description="Past due date"
            icon={AlertCircle}
            trend={metrics.overdueChange >= 0 ? "up" : "down"}
            trendValue={`${metrics.overdueChange >= 0 ? '+' : ''}${metrics.overdueChange?.toFixed(1) || 0}%`}
            reverseColor={true}
          />
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>View and manage your client projects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="needs-revision">Needs Revision</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                </SelectContent>
              </Select>

              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {uniqueClients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Project Cards Grid */}
            {projectsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-1">No projects found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' || clientFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first project to get started'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => (
                  <ProjectCard
                    key={project._id}
                    project={project}
                    onView={(id) => navigate(`/dashboard/projects/${id}`)}
                    onOpenFiles={(id) => navigate(`/dashboard/projects/${id}/files`)}
                    onOpenComments={(id) => navigate(`/dashboard/projects/${id}?tab=comments`)}
                    onRequestRevision={project.userRole === 'client' ? handleRequestRevision : undefined}
                    onApproveFinal={project.userRole === 'client' ? handleApproveFinal : undefined}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex-1">
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>Latest billing activity</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/invoices')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent invoices</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredInvoices.map((invoice) => (
                  <div
                    key={invoice._id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/dashboard/invoices?id=${invoice._id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{invoice.title || `Invoice #${invoice.invoiceNumber}`}</div>
                      <div className="text-sm text-muted-foreground">
                        {invoice.clientName} • {format(new Date(invoice.createdAt), 'MMM dd, yyyy')}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={invoice.status === 'paid' ? 'default' : 'outline'}>
                        {invoice.status}
                      </Badge>
                      <div className="text-right">
                        <div className="font-semibold">₹{invoice.total?.toLocaleString()}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dashboard/invoices?id=${invoice._id}`);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api$/, '');
                            window.open(`${apiUrl}/api/invoices/project/${invoice.invoiceNumber || invoice._id}/download`, '_blank');
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Files */}
        <FilesStrip
          files={recentFiles}
          title="Recent Files"
          maxVisible={6}
          onFileClick={(file) => {
            if (file.url) {
              window.open(file.url, '_blank');
            } else {
              toast.info(`Opening ${file.filename}...`);
              // Fallback if no URL (shouldn't happen with new backend logic)
              navigate(`/dashboard/projects/${file.projectId}?tab=files`);
            }
          }}
          onViewAll={() => navigate('/dashboard/projects')}
        />

        {/* Analytics Charts */}
        <DashboardGraphs
          revenueData={chartData.revenue}
          invoiceStatusData={chartData.invoiceStatus}
          projectProgressData={chartData.projectProgress}
          revenueGranularity={revenueGranularity}
          onRevenueGranularityChange={setRevenueGranularity}
          onRefresh={fetchDashboardData}
          onExport={handleExportCharts}
        />

        {/* Request Revision Modal */}
        <Dialog open={revisionModalOpen} onOpenChange={setRevisionModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Revision</DialogTitle>
              <DialogDescription>
                Provide feedback and request changes for {selectedProject?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Textarea
                placeholder="Describe the changes you'd like to see..."
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRevisionModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitRevisionRequest} disabled={!revisionNotes.trim()}>
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Approve Final Modal */}
        <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Final Version</DialogTitle>
              <DialogDescription>
                Confirm that you approve the final version of {selectedProject?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  By approving, you confirm that the project meets your requirements and is ready for completion.
                  This action will mark the project as finalized.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitApproval} className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve Final
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
