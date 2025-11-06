import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';
import { useSocket } from '../hooks/useSocket';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
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
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'board'
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'my', 'shared'

  const fetchProjects = useCallback(async () => {
    setLoading(true);
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
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      console.log('📊 Projects data received:', data);
      console.log('📊 First project progress:', data.projects?.[0]?.progress);
      setProjects(data.projects || []);
      setMyProjects(data.myProjects || []);
      setSharedProjects(data.sharedProjects || []);
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
      console.log('📡 New project created');
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
    'completed': { 
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', 
      label: 'Completed', 
      badge: 'Completed' 
    },
    'on-hold': { 
      color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', 
      label: 'Review', 
      badge: 'Review' 
    },
    'archived': { 
      color: 'bg-red-500/10 text-red-600 border-red-500/20', 
      label: 'Blocked', 
      badge: 'Blocked' 
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
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Projects</h1>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">{activeProjects}</span> active projects
          </p>
        </div>
        <Button 
          onClick={() => navigate('/dashboard/projects/new')} 
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 px-1 border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          All Projects ({projects.length})
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`pb-3 px-1 border-b-2 transition-colors ${
            activeTab === 'my'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          My Projects ({myProjects.length})
        </button>
        <button
          onClick={() => setActiveTab('shared')}
          className={`pb-3 px-1 border-b-2 transition-colors ${
            activeTab === 'shared'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Shared with Me ({sharedProjects.length})
        </button>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 z-10" />
          <Input
            placeholder="Search projects"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
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
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent className="z-[200]">
            <SelectItem value="all">All Clients</SelectItem>
            {uniqueClients.map(client => (
              <SelectItem key={client} value={client}>{client}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2 ml-auto">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('table')}
          >
            <LayoutList className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'board' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('board')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <>
          <div className="rounded-md border relative z-0 overflow-visible">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
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
                    const client = project.members?.find(m => m.role === 'client');
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
                          {client?.name || <span className="text-muted-foreground">No client</span>}
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
                              <DropdownMenuItem onClick={() => navigate(`/dashboard/projects/${project._id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Project
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={async () => {
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
                                      toast.error('Failed to delete project');
                                    }
                                  } catch (err) {
                                    toast.error('Failed to delete project');
                                  }
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Move to Trash
                              </DropdownMenuItem>
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
          
          {/* Footer with pagination */}
          <div className="flex items-center justify-between mt-4">
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
            <div className="flex-1 min-w-[300px]">
              <div className="border rounded-lg p-4 bg-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">In Progress</h3>
                  <Badge variant="secondary">
                    {groupedProjects['active'].length}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {groupedProjects['active'].map((project) => {
                    const client = project.members?.find(m => m.role === 'client');
                    return (
                      <div
                        key={project._id}
                        className="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer bg-card"
                        onClick={() => navigate(`/dashboard/projects/${project._id}`)}
                      >
                        <h4 className="font-semibold mb-1">{project.title}</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          {client?.name || 'No client'} • Due {formatDate(project.dueDate)}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-600 border-0">
                            {project.progress || 0}%
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Review Column */}
            <div className="flex-1 min-w-[300px]">
              <div className="border rounded-lg p-4 bg-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Review</h3>
                  <Badge variant="secondary">
                    {groupedProjects['on-hold'].length}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {groupedProjects['on-hold'].map((project) => {
                    const client = project.members?.find(m => m.role === 'client');
                    return (
                      <div
                        key={project._id}
                        className="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer bg-card"
                        onClick={() => navigate(`/dashboard/projects/${project._id}`)}
                      >
                        <h4 className="font-semibold mb-1">{project.title}</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          {client?.name || 'No client'} • Due {formatDate(project.dueDate)}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="bg-orange-500/20 text-orange-600 border-0">
                            {project.progress || 0}%
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Blocked Column */}
            <div className="flex-1 min-w-[300px]">
              <div className="border rounded-lg p-4 bg-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Blocked</h3>
                  <Badge variant="secondary">
                    {groupedProjects['archived'].length}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {groupedProjects['archived'].map((project) => {
                    const client = project.members?.find(m => m.role === 'client');
                    return (
                      <div
                        key={project._id}
                        className="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer bg-card"
                        onClick={() => navigate(`/dashboard/projects/${project._id}`)}
                      >
                        <h4 className="font-semibold mb-1">{project.title}</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          {client?.name || 'No client'} • Due {formatDate(project.dueDate)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Completed Column */}
            <div className="flex-1 min-w-[300px]">
              <div className="border rounded-lg p-4 bg-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Completed</h3>
                  <Badge variant="secondary">
                    {groupedProjects['completed'].length}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {groupedProjects['completed'].map((project) => {
                    const client = project.members?.find(m => m.role === 'client');
                    return (
                      <div
                        key={project._id}
                        className="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer bg-card"
                        onClick={() => navigate(`/dashboard/projects/${project._id}`)}
                      >
                        <h4 className="font-semibold mb-1">{project.title}</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          {client?.name || 'No client'} • Due {formatDate(project.dueDate)}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="bg-green-500/20 text-green-600 border-0">
                            100%
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

