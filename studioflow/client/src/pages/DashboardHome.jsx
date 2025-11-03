import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import { Search, Loader2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardHome() {
  const { user } = useUser();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/projects`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
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
      active: 'bg-blue-500',
      completed: 'bg-emerald-500',
      'on-hold': 'bg-orange-500',
      archived: 'bg-gray-500'
    };
    return colors[status] || 'bg-blue-500';
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
      {!loading && !error && projects.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1e293b] flex items-center justify-center">
            <Plus className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
          <p className="text-gray-400 mb-6">Create your first project to get started</p>
          <Link to="/dashboard/projects/new">
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Create First Project
            </Button>
          </Link>
        </div>
      )}

      {/* Projects Grid */}
      {!loading && !error && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const progress = getMockProgress(project.status);
            return (
              <Link key={project._id} to={`/dashboard/projects/${project._id}`}>
                <Card className="bg-[#1e293b] border-[#334155] hover:border-primary/50 transition-all cursor-pointer group">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-primary transition-colors truncate">
                          {project.title}
                        </h3>
                        <p className="text-sm text-gray-400 truncate">
                          {project.userRole === 'owner' ? 'Your Project' : `Client: ${project.ownerId}`}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`${getStatusColor(project.status)} text-white border-none ml-2 flex-shrink-0`}
                      >
                        {getStatusLabel(project.status)}
                      </Badge>
                    </div>

                    {project.brief && (
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2">{project.brief}</p>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-white font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {project.dueDate && (
                      <div className="mt-4 pt-4 border-t border-[#334155]">
                        <span className="text-xs text-gray-400">
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
