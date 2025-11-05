import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import { Search, Loader2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

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
      active: 'bg-blue-600',
      completed: 'bg-emerald-600',
      'on-hold': 'bg-orange-600',
      archived: 'bg-gray-600'
    };
    return colors[status] || 'bg-blue-600';
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

  // Mock progress for now - you can add this field to your Project model later
  const getMockProgress = (status) => {
    if (status === 'completed') return 100;
    if (status === 'on-hold') return 30;
    if (status === 'archived') return 100;
    return Math.floor(Math.random() * 40) + 40; // 40-80% for active
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome, {user?.firstName || 'User'}
          </h1>
          <p className="text-gray-400">Let's make something amazing today.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search projects"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64 bg-[#1e293b] border-[#334155] text-white placeholder:text-gray-500"
            />
          </div>
          <Link to="/dashboard/projects/new">
            <Button className="bg-primary hover:bg-primary/90 text-white font-medium">
              <Plus className="w-4 h-4 mr-2" />
              Create New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-gray-400">Loading projects...</span>
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

      {/* Empty State */}
      {!loading && !error && filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1e293b] flex items-center justify-center">
            <Plus className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {searchQuery ? 'No projects found' : 'No projects yet'}
          </h3>
          <p className="text-gray-400 mb-6">
            {searchQuery ? 'Try adjusting your search terms' : 'Create your first project to get started'}
          </p>
          {!searchQuery && (
            <Link to="/dashboard/projects/new">
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Create First Project
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Projects Grid */}
      {!loading && !error && filteredProjects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const progress = project.progress !== undefined ? project.progress : getMockProgress(project.status);
            return (
              <Link key={project._id} to={`/dashboard/projects/${project._id}`}>
                <Card className="bg-slate-800/80 border-slate-700 hover:border-primary/50 hover:bg-slate-800 transition-all cursor-pointer group overflow-hidden">
                  <div className="p-5">
                    {/* Header: Title and Status */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors line-clamp-1 flex-1">
                        {project.title}
                      </h3>
                      <Badge
                        className={`${getStatusColor(project.status)} text-white border-none text-xs font-semibold px-2.5 py-0.5 flex-shrink-0`}
                      >
                        {getStatusLabel(project.status)}
                      </Badge>
                    </div>

                    {/* Role */}
                    <p className="text-xs text-slate-400 mb-2">
                      {project.userRole === 'owner' ? 'Your Project' : 'Client Project'}
                    </p>

                    {/* Description */}
                    {project.brief && (
                      <p className="text-sm text-slate-300 mb-4 line-clamp-2 leading-relaxed">
                        {project.brief}
                      </p>
                    )}

                    {/* Progress */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400">Progress</span>
                        <span className="text-sm font-bold text-white">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-1.5 bg-slate-700" />
                    </div>

                    {/* Due Date */}
                    {project.dueDate && (
                      <div className="pt-3 border-t border-slate-700/50">
                        <span className="text-xs text-slate-400">
                          Due: {new Date(project.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
