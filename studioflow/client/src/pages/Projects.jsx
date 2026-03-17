import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';
import { useSocket } from '../hooks/useSocket';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import SubscriptionAlert from '../components/SubscriptionAlert';
import { canCreateProject, hasActivePaidAccess } from '../lib/subscriptionUtils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Search,
  Loader2,
  Plus,
  LayoutGrid,
  LayoutList,
  MoreHorizontal,
  Eye,
  Trash2
} from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../components/ui/avatar"
import { ShimmerProjects } from '../components/skeletons/ShimmerProjects';
import { ProjectCard } from '../components/ProjectCard';

export default function Projects() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();
  const [projects, setProjects] = useState([]);
  const [myProjects, setMyProjects] = useState([]);
  const [sharedProjects, setSharedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [viewMode, setViewMode] = useState(() => {
    // Restore view mode from localStorage
    const saved = localStorage.getItem('projects-view-mode');
    return saved === 'board' ? 'board' : 'table';
  });
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'my', 'shared'
  const [subscription, setSubscription] = useState(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      // Fetch projects and subscription in parallel
      const [projectsResponse, subscriptionResponse] = await Promise.all([
        fetch(`${apiUrl}/projects`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
        }),
        fetch(`${apiUrl}/subscriptions/current`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
        })
      ]);

      if (!projectsResponse.ok) {
        throw new Error('Failed to fetch projects');
      }

      const projectsData = await projectsResponse.json();
      // console.log('📊 Projects data received:', projectsData);
      setProjects(projectsData.projects || []);
      setMyProjects(projectsData.myProjects || []);
      setSharedProjects(projectsData.sharedProjects || []);

      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json();
        // console.log('💳 Subscription data:', subscriptionData);
        setSubscription(subscriptionData);
      }
    } catch (err) {
      console.error('Fetch projects error:', err);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  // Setup Socket.IO for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleProjectCreated = () => {
      // console.log('📡 New project created');
      toast.info('New project available');
      fetchProjects();
    };

    socket.on('project-created', handleProjectCreated);

    return () => {
      socket.off('project-created', handleProjectCreated);
    };
  }, [socket, fetchProjects]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const statusConfig = {
    'active': {
      color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      label: 'In Progress',
      badge: 'In Progress'
    },
    'in-progress': {
      color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      label: 'In Progress',
      badge: 'In Progress'
    },
    'completed': {
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      label: 'Completed',
      badge: 'Completed'
    },
    'needs-revision': {
      color: 'bg-red-500/10 text-red-600 border-red-500/20',
      label: 'Needs Revision',
      badge: 'Needs Revision'
    },
    'on-hold': {
      color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      label: 'On Hold',
      badge: 'On Hold'
    },
    'review': {
      color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      label: 'Review',
      badge: 'Review'
    },
    'archived': {
      color: 'bg-muted/50 text-muted-foreground border-border',
      label: 'Archived',
      badge: 'Archived'
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get unique clients for filter
  const uniqueClients = [...new Set(projects.map(p =>
    p.members?.find(m => m.role === 'client')?.name || 'No client'
  ))];

  // Determine which projects to display based on active tab
  let displayProjects = projects;
  if (activeTab === 'my') {
    displayProjects = myProjects;
  } else if (activeTab === 'shared') {
    displayProjects = sharedProjects;
  }

  // Filter projects
  const filteredProjects = displayProjects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.brief?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const projectClient = project.members?.find(m => m.role === 'client')?.name || 'No client';
    const matchesClient = clientFilter === 'all' || projectClient === clientFilter;

    return matchesSearch && matchesStatus && matchesClient;
  });

  // Group projects by status for board view
  const groupedProjects = {
    'active': filteredProjects.filter(p => p.status === 'active'),
    'on-hold': filteredProjects.filter(p => p.status === 'on-hold'),
    'archived': filteredProjects.filter(p => p.status === 'archived'),
    'completed': filteredProjects.filter(p => p.status === 'completed')
  };

  const activeProjects = projects.filter(p => p.status === 'active').length;

  if (loading) {
    return <ShimmerProjects />;
  }

  return (
    <div className="p-4 md:p-8 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Projects</h1>
          <div className="flex items-center gap-4">
            <p className="text-muted-foreground text-sm md:text-base">
              <span className="font-medium text-foreground">{activeProjects}</span> active projects
            </p>
            {subscription?.usage && (
              <p className="text-sm text-muted-foreground">
                <span className={`font-medium ${subscription.usage.projectCount >= subscription.usage.maxProjects
                  ? 'text-destructive'
                  : 'text-primary'
                  }`}>
                  {subscription.usage.projectCount}/{subscription.usage.maxProjects}
                </span>
                {' '}projects used
                {subscription.usage.projectCount >= subscription.usage.maxProjects && (
                  <Button
                    variant="link"
                    size="sm"
                    className="ml-2 h-auto p-0"
                    onClick={() => navigate('/dashboard/subscription')}
                  >
                    Upgrade →
                  </Button>
                )}
              </p>
            )}
          </div>
        </div>
        <Button
          onClick={() => navigate('/dashboard/projects/new')}
          className="gap-2 w-full md:w-auto"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {/* Subscription Alert */}
      <SubscriptionAlert subscription={subscription?.subscription} />

      {/* Category Tabs */}
      <div className="flex gap-4 mb-6 border-b overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 px-1 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'all'
            ? 'border-primary text-primary font-medium'
            : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          All Projects ({projects.length})
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`pb-3 px-1 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'my'
            ? 'border-primary text-primary font-medium'
            : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          My Projects ({myProjects.length})
        </button>
        <button
          onClick={() => setActiveTab('shared')}
          className={`pb-3 px-1 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'shared'
            ? 'border-primary text-primary font-medium'
            : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          Shared with Me ({sharedProjects.length})
        </button>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-6 relative z-10">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 z-10" />
          <Input
            placeholder="Search projects"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>

        <div className="flex w-full md:w-auto gap-3 overflow-x-auto pb-1 md:pb-0">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on-hold">On Hold</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Client" />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              <SelectItem value="all">All Clients</SelectItem>
              {uniqueClients.map(client => (
                <SelectItem key={client} value={client}>{client}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 ml-auto">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setViewMode('table');
              localStorage.setItem('projects-view-mode', 'table');
            }}
          >
            <LayoutList className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'board' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setViewMode('board');
              localStorage.setItem('projects-view-mode', 'board');
            }}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <>
          <div className="rounded-md border relative z-0 overflow-visible">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No projects found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProjects.map((project) => {
                      return (
                        <TableRow
                          key={project._id}
                          className="cursor-pointer"
                          onClick={() => navigate(`/dashboard/projects/${project._id}`)}
                        >
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{project.title}</span>
                                {project.isShared && (
                                  <Badge variant="secondary" className="text-xs">
                                    Shared
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                Owner: {project.ownerName || 'Unknown'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex -space-x-2 overflow-hidden">
                              {project.members?.slice(0, 4).map((member, i) => (
                                <Avatar key={i} className="inline-block border-2 border-background w-8 h-8">
                                  <AvatarImage src={member.avatar} />
                                  <AvatarFallback>{member.name?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar>
                              ))}
                              {project.members?.length > 4 && (
                                <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-background bg-muted text-[10px] font-medium">
                                  +{project.members.length - 4}
                                </div>
                              )}
                              {(!project.members || project.members.length === 0) && (
                                <span className="text-muted-foreground text-sm pl-2">No members</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={statusConfig[project.status]?.color || statusConfig.active.color}
                            >
                              {statusConfig[project.status]?.badge || 'Active'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3 w-[180px]">
                              <Progress
                                value={project.progress || 0}
                                className="h-2.5 flex-1"
                              />
                              <span className="text-sm font-semibold w-12 text-right shrink-0">
                                {project.progress || 0}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(project.dueDate)}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => navigate(`/dashboard/projects/${project._id}`)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Project
                                </DropdownMenuItem>
                                {project.userRole === 'owner' && (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onSelect={async () => {
                                      try {
                                        const token = await getToken();
                                        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                                        const response = await fetch(`${apiUrl}/projects/${project._id}`, {
                                          method: 'DELETE',
                                          headers: {
                                            'Authorization': `Bearer ${token}`
                                          }
                                        });
                                        if (response.ok) {
                                          toast.success('Project moved to trash');
                                          fetchProjects();
                                        } else {
                                          let message = 'Failed to delete project';
                                          try {
                                            const errorData = await response.json();
                                            message = errorData?.error || message;
                                          } catch {
                                            // Ignore parse errors and keep generic message
                                          }
                                          toast.error(message);
                                        }
                                      } catch (err) {
                                        toast.error(err?.message || 'Failed to delete project');
                                      }
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Move to Trash
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4 p-4">
              {filteredProjects.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No projects found.</p>
                </div>
              ) : (
                filteredProjects.map((project) => {
                  const client = project.members?.find(m => m.role === 'client');
                  return (
                    <div
                      key={project._id}
                      className="bg-card border rounded-lg p-4 space-y-3 cursor-pointer hover:border-primary transition-colors"
                      onClick={() => navigate(`/dashboard/projects/${project._id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{project.title}</h3>
                            {project.isShared && (
                              <Badge variant="secondary" className="text-[10px] px-1 h-5">
                                Shared
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Owner: {project.ownerName || 'Unknown'}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={statusConfig[project.status]?.color || statusConfig.active.color}
                        >
                          {statusConfig[project.status]?.badge || 'Active'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Members</p>
                          <div className="flex -space-x-2 overflow-hidden mt-1">
                            {project.members?.slice(0, 3).map((member, i) => (
                              <Avatar key={i} className="inline-block border-2 border-background w-6 h-6">
                                <AvatarImage src={member.avatar} />
                                <AvatarFallback className="text-[10px]">{member.name?.charAt(0) || 'U'}</AvatarFallback>
                              </Avatar>
                            ))}
                            {project.members?.length > 3 && (
                              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-background bg-muted text-[8px] font-medium">
                                +{project.members.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Due Date</p>
                          <p>{formatDate(project.dueDate)}</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{project.progress || 0}%</span>
                        </div>
                        <Progress value={project.progress || 0} className="h-2" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer with pagination */}
          <div className="flex items-center justify-between mt-4 px-1">
            <div className="text-sm text-muted-foreground">
              Showing {filteredProjects.length} project(s)
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Board View */}
      {viewMode === 'board' && (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-medium mb-1">Board view</h2>
            <p className="text-sm text-muted-foreground">Quick glance of statuses</p>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4">
            {/* In Progress Column */}
            <div className="flex-1 min-w-[320px]">
              <div className="border rounded-lg p-4 bg-muted/30 h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    In Progress
                  </h3>
                  <Badge variant="secondary" className="bg-background">
                    {groupedProjects['active'].length}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {groupedProjects['active'].map((project) => (
                    <ProjectCard
                      key={project._id}
                      project={project}
                      onView={(id) => navigate(`/dashboard/projects/${id}`)}
                      onOpenFiles={(id) => navigate(`/dashboard/projects/${id}?tab=files`)}
                      onOpenComments={(id) => navigate(`/dashboard/projects/${id}?tab=comments`)}
                      className="bg-background"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Review Column */}
            <div className="flex-1 min-w-[320px]">
              <div className="border rounded-lg p-4 bg-muted/30 h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    Review
                  </h3>
                  <Badge variant="secondary" className="bg-background">
                    {groupedProjects['on-hold'].length}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {groupedProjects['on-hold'].map((project) => (
                    <ProjectCard
                      key={project._id}
                      project={project}
                      onView={(id) => navigate(`/dashboard/projects/${id}`)}
                      onOpenFiles={(id) => navigate(`/dashboard/projects/${id}?tab=files`)}
                      onOpenComments={(id) => navigate(`/dashboard/projects/${id}?tab=comments`)}
                      className="bg-background"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Blocked/Archived Column */}
            <div className="flex-1 min-w-[320px]">
              <div className="border rounded-lg p-4 bg-muted/30 h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                    Archived
                  </h3>
                  <Badge variant="secondary" className="bg-background">
                    {groupedProjects['archived'].length}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {groupedProjects['archived'].map((project) => (
                    <ProjectCard
                      key={project._id}
                      project={project}
                      onView={(id) => navigate(`/dashboard/projects/${id}`)}
                      onOpenFiles={(id) => navigate(`/dashboard/projects/${id}?tab=files`)}
                      onOpenComments={(id) => navigate(`/dashboard/projects/${id}?tab=comments`)}
                      className="bg-background opacity-75"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Completed Column */}
            <div className="flex-1 min-w-[320px]">
              <div className="border rounded-lg p-4 bg-muted/30 h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    Completed
                  </h3>
                  <Badge variant="secondary" className="bg-background">
                    {groupedProjects['completed'].length}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {groupedProjects['completed'].map((project) => (
                    <ProjectCard
                      key={project._id}
                      project={project}
                      onView={(id) => navigate(`/dashboard/projects/${id}`)}
                      onOpenFiles={(id) => navigate(`/dashboard/projects/${id}?tab=files`)}
                      onOpenComments={(id) => navigate(`/dashboard/projects/${id}?tab=comments`)}
                      className="bg-background"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
