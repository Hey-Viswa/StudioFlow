import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';
import {
  Search,
  Loader2,
  Plus,
  TrendingUp,
  TrendingDown,
  FolderKanban,
  CheckCircle2,
  Clock,
  Archive,
  ArrowUpRight,
  MoreHorizontal,
  AlertCircle,
  Crown,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { useSocket } from '../hooks/useSocket';

export default function DashboardHome() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const socket = useSocket(); // Connect to Socket.IO
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    fetchProjects();
    fetchUsage();
  }, []);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    // Listen for project created events
    socket.on('project-created', (data) => {
      // console.log('🔔 Real-time: Project created', data);
      fetchProjects(); // Refresh project list
    });

    // Listen for project updated events
    socket.on('project-updated', (data) => {
      // console.log('🔔 Real-time: Project updated', data);
      // Update specific project in state
      setProjects(prevProjects =>
        prevProjects.map(p =>
          p._id === data.projectId
            ? { ...p, ...data.updates }
            : p
        )
      );
    });

    // Listen for project deleted events
    socket.on('project-deleted', (data) => {
      // console.log('🔔 Real-time: Project deleted', data);
      setProjects(prevProjects =>
        prevProjects.filter(p => p._id !== data.projectId)
      );
    });

    // Cleanup listeners
    return () => {
      socket.off('project-created');
      socket.off('project-updated');
      socket.off('project-deleted');
    };
  }, [socket]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProjects(projects);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = projects.filter(project =>
        project.title?.toLowerCase().includes(query) ||
        project.brief?.toLowerCase().includes(query) ||
        project.status?.toLowerCase().includes(query)
      );
      setFilteredProjects(filtered);
    }
  }, [searchQuery, projects]);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/projects`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch projects: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error('Fetch projects error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsage = async () => {
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/projects/usage`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      }
    } catch (err) {
      console.error('Failed to fetch usage:', err);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      'on-hold': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      archived: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    };
    return colors[status] || 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: 'In Progress',
      completed: 'Completed',
      'on-hold': 'On Hold',
      archived: 'Archived'
    };
    return labels[status] || 'In Progress';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-3 h-3" />;
      case 'on-hold': return <Clock className="w-3 h-3" />;
      case 'archived': return <Archive className="w-3 h-3" />;
      default: return <TrendingUp className="w-3 h-3" />;
    }
  };

  // Calculate stats
  // Calculate stats from usage API if available, else fallback to local filtering
  const totalProjects = usage?.stats?.total ?? projects.length;
  const activeProjects = usage?.stats?.active ?? projects.filter(p => p.status === 'active').length;
  const completedProjects = usage?.stats?.completed ?? projects.filter(p => p.status === 'completed').length;
  const onHoldProjects = usage?.stats?.onHold ?? projects.filter(p => p.status === 'on-hold').length;

  // Real Trends from API
  const activeProjectsTrend = usage?.trends?.active || { value: 0, direction: 'neutral' };
  const completedProjectsTrend = usage?.trends?.completed || { value: 0, direction: 'neutral' };

  return (
    <TooltipProvider>
      <div className="flex-1 space-y-6 p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Dashboard</h2>
            <p className="text-sm md:text-base text-muted-foreground text-slate-400">
              Overview of your projects and activity
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/dashboard/projects/new">
                  <Button className="w-full md:w-auto bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    New Project
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Create a new project to manage tasks, team members, and invoices</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-slate-400">Loading projects...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 font-medium">Error loading projects</p>
            <p className="text-red-400/80 text-sm mt-1">{error}</p>
            <Button onClick={fetchProjects} variant="outline" className="mt-4 border-red-500/30 text-red-400 hover:bg-red-500/10">
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Project Usage Alert for Free Tier */}
            {usage && usage.plan === 'free' && (
              <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30">
                <div className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">Free Plan - Project Limit</p>
                        <p className="text-sm text-slate-300">
                          You're using <strong className="text-amber-400">{usage.count} of {usage.limit}</strong> projects
                          {usage.limit - usage.count > 0 ? (
                            <span className="ml-1">({usage.limit - usage.count} remaining)</span>
                          ) : (
                            <span className="ml-1 text-red-400">(Limit reached!)</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link to="/dashboard/subscription" className="w-full md:w-auto">
                          <Button size="sm" className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-white">
                            <Crown className="w-4 h-4 mr-2" />
                            Upgrade
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Upgrade to Pro (₹1/mo) or Studio (₹2/mo) for more projects</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {/* Progress Bar */}
                  <div className="mt-3 w-full bg-slate-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${usage.count >= usage.limit
                        ? 'bg-red-500'
                        : usage.count / usage.limit > 0.7
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                        }`}
                      style={{ width: `${(usage.count / usage.limit) * 100}%` }}
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* Stats Grid */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-card border-slate-800">
                <div className="p-6">
                  <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-slate-400">Total Projects</p>
                    <FolderKanban className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-white">{totalProjects}</p>
                    <p className="text-xs text-slate-500">
                      All your projects
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="bg-card border-slate-800">
                <div className="p-6">
                  <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-slate-400">Active</p>
                    <TrendingUp className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-white">{activeProjects}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      {activeProjectsTrend.direction === 'up' ? (
                        <>
                          <TrendingUp className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">+{activeProjectsTrend.value}%</span>
                        </>
                      ) : activeProjectsTrend.direction === 'down' ? (
                        <>
                          <TrendingDown className="w-3 h-3 text-red-400" />
                          <span className="text-red-400">-{activeProjectsTrend.value}%</span>
                        </>
                      ) : (
                        <span>No change</span>
                      )}
                      <span className="ml-1">from last month</span>
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="bg-card border-slate-800">
                <div className="p-6">
                  <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-slate-400">Completed</p>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-white">{completedProjects}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      {completedProjectsTrend.direction === 'up' ? (
                        <>
                          <TrendingUp className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">+{completedProjectsTrend.value}%</span>
                        </>
                      ) : completedProjectsTrend.direction === 'down' ? (
                        <>
                          <TrendingDown className="w-3 h-3 text-red-400" />
                          <span className="text-red-400">-{completedProjectsTrend.value}%</span>
                        </>
                      ) : (
                        <span>No change</span>
                      )}
                      <span className="ml-1">from last month</span>
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="bg-card border-slate-800">
                <div className="p-6">
                  <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-slate-400">On Hold</p>
                    <Clock className="h-4 w-4 text-yellow-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-white">{onHoldProjects}</p>
                    <p className="text-xs text-slate-500">
                      Awaiting action
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Projects Section */}
            <Card className="bg-card border-slate-800">
              <div className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Recent Projects</h3>
                    <p className="text-sm text-slate-400">
                      {searchQuery ? (
                        <>Showing {filteredProjects.length} result{filteredProjects.length !== 1 ? 's' : ''} for "{searchQuery}"</>
                      ) : (
                        <>You have {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} in total</>
                      )}
                    </p>
                  </div>
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Search projects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-11 pr-10 h-11 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all w-full"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {filteredProjects.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderKanban className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {searchQuery ? 'No projects found' : 'No projects yet'}
                    </h3>
                    <p className="text-slate-400 mb-6">
                      {searchQuery ? 'Try adjusting your search terms' : 'Get started by creating your first project'}
                    </p>
                    {!searchQuery && (
                      <Link to="/dashboard/projects/new">
                        <Button className="bg-primary hover:bg-primary/90">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Project
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block rounded-md border border-slate-800">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-800 hover:bg-slate-800/50">
                            <TableHead className="text-slate-400">Project</TableHead>
                            <TableHead className="text-slate-400">Status</TableHead>
                            <TableHead className="text-slate-400">Progress</TableHead>
                            <TableHead className="text-slate-400">Due Date</TableHead>
                            <TableHead className="text-slate-400">Role</TableHead>
                            <TableHead className="text-slate-400 text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProjects.map((project) => {
                            const progress = project.progress || 0;
                            return (
                              <TableRow
                                key={project._id}
                                className="border-slate-800 hover:bg-slate-800/50 cursor-pointer"
                                onClick={() => window.location.href = `/dashboard/projects/${project._id}`}
                              >
                                <TableCell className="font-medium">
                                  <div className="flex flex-col">
                                    <span className="text-white font-semibold">{project.title}</span>
                                    {project.brief && (
                                      <span className="text-sm text-slate-400 line-clamp-1 mt-0.5">
                                        {project.brief}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={`${getStatusColor(project.status)} flex items-center gap-1 w-fit`}
                                  >
                                    {getStatusIcon(project.status)}
                                    {getStatusLabel(project.status)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 max-w-[120px]">
                                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-gradient-to-r from-primary to-purple-600 transition-all"
                                          style={{ width: `${progress}%` }}
                                        />
                                      </div>
                                    </div>
                                    <span className="text-sm text-slate-400 font-medium w-10">{progress}%</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-slate-400">
                                  {project.dueDate
                                    ? new Date(project.dueDate).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })
                                    : 'No date'
                                  }
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-slate-800/50 text-slate-300 border-slate-700">
                                    {project.userRole === 'owner' ? 'Owner' : 'Client'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Link to={`/dashboard/projects/${project._id}`}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-slate-400 hover:text-white hover:bg-slate-800"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      View
                                      <ArrowUpRight className="w-4 h-4 ml-1" />
                                    </Button>
                                  </Link>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                      {filteredProjects.map((project) => {
                        const progress = project.progress || 0;
                        return (
                          <div
                            key={project._id}
                            className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 space-y-3 cursor-pointer active:bg-slate-800/50 transition-colors"
                            onClick={() => window.location.href = `/dashboard/projects/${project._id}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0 mr-3">
                                <h4 className="font-semibold text-white truncate">{project.title}</h4>
                                {project.brief && (
                                  <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{project.brief}</p>
                                )}
                              </div>
                              <Badge
                                variant="outline"
                                className={`${getStatusColor(project.status)} flex-shrink-0`}
                              >
                                {getStatusIcon(project.status)}
                              </Badge>
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-400">
                              <span>{project.userRole === 'owner' ? 'Owner' : 'Client'}</span>
                              <span>
                                {project.dueDate
                                  ? new Date(project.dueDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })
                                  : 'No date'
                                }
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-400">Progress</span>
                                <span className="text-white font-medium">{progress}%</span>
                              </div>
                              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-primary to-purple-600 transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
