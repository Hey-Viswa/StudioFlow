import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
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
  MoreHorizontal
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

export default function DashboardHome() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

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
    switch(status) {
      case 'completed': return <CheckCircle2 className="w-3 h-3" />;
      case 'on-hold': return <Clock className="w-3 h-3" />;
      case 'archived': return <Archive className="w-3 h-3" />;
      default: return <TrendingUp className="w-3 h-3" />;
    }
  };

  // Calculate stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const onHoldProjects = projects.filter(p => p.status === 'on-hold').length;

  // Calculate trends (mock data - you can implement real logic later)
  const getTrend = (current, previous) => {
    if (previous === 0) return { value: 0, direction: 'neutral' };
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change).toFixed(1),
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
    };
  };

  // Mock previous data for trends
  const activeProjectsTrend = getTrend(activeProjects, Math.max(1, activeProjects - 2));
  const completedProjectsTrend = getTrend(completedProjects, Math.max(1, completedProjects - 1));

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard</h2>
          <p className="text-muted-foreground text-slate-400">
            Overview of your projects and activity
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/dashboard/projects/new">
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </Link>
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
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

          {/* Projects Table */}
          <Card className="bg-card border-slate-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Recent Projects</h3>
                  <p className="text-sm text-slate-400">You have {filteredProjects.length} projects in total</p>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                  />
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
                <div className="rounded-md border border-slate-800">
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
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
