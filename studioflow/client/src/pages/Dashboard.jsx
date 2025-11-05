import { useState, useEffect } from 'react';
import { useUser, UserButton } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { LayoutDashboard, FolderKanban, Users, Receipt, Settings, Menu, X, Home, Plus, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [apiResponse, setApiResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects();
    
    // Poll for updates every 10 seconds
    const interval = setInterval(() => {
      fetchProjects();
    }, 10000);
    
    return () => clearInterval(interval);
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
      console.log('📊 Dashboard - Projects data received:', data);
      console.log('📊 Dashboard - First project progress:', data.projects?.[0]?.progress);
      setProjects(data.projects || []);
    } catch (err) {
      console.error('Fetch projects error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const callProtectedAPI = async () => {
    const tempLoading = true;
    const tempError = null;
    setApiResponse(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/protected`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      setApiResponse(data);
    } catch (err) {
      console.error('Protected API error:', err);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
      completed: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
      'on-hold': 'bg-orange-500/20 text-orange-500 border-orange-500/30',
      archived: 'bg-gray-500/20 text-gray-500 border-gray-500/30'
    };
    return colors[status] || colors.active;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: FolderKanban, label: 'Projects', active: false },
    { icon: Users, label: 'Clients', active: false },
    { icon: Receipt, label: 'Invoices', active: false },
    { icon: Settings, label: 'Settings', active: false },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={`fixed left-0 top-0 h-full bg-card border-r border-border transition-all duration-300 z-40 ${sidebarOpen ? 'w-64' : 'w-0 -translate-x-full'} lg:translate-x-0 lg:w-64`}>
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center justify-between px-6 border-b border-border">
            <div className="flex items-center gap-2">
              <img src="/studioflowlogo.svg" alt="StudioFlow" className="h-5 w-auto" />
              <span className="font-bold text-lg bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">StudioFlow</span>
            </div>
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></Button>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => (
              <button key={item.label} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${item.active ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-border">
            <Button variant="outline" className="w-full justify-start gap-3" onClick={() => navigate('/')}><Home className="w-5 h-5" /><span>Back to Home</span></Button>
          </div>
        </div>
      </aside>
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-xl border-b border-border/40">
          <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden"><Menu className="w-5 h-5" /></Button>
              <div className="lg:hidden flex items-center gap-2">
                <img src="/studioflowlogo.svg" alt="StudioFlow" className="h-5 w-auto" />
                <span className="font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">StudioFlow</span>
              </div>
              <h1 className="hidden lg:block text-2xl font-bold">Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium">{user?.firstName || 'User'} {user?.lastName || ''}</p>
                <p className="text-xs text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
              </div>
              <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-10 h-10" } }} />
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight">Welcome back, {user?.firstName || 'there'}! </h2>
                <p className="text-muted-foreground">Let's make something amazing today.</p>
              </div>
              <Button 
                onClick={() => navigate('/dashboard/create-project')} 
                size="lg"
                className="gap-2"
              >
                <Plus className="w-5 h-5" />
                Create New Project
              </Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{projects.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {projects.filter(p => p.status === 'active').length} active
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Your Role</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {projects.filter(p => p.userRole === 'owner').length}
                  </div>
                  <p className="text-xs text-muted-foreground">projects owned</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Client Access</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {projects.filter(p => p.userRole === 'client').length}
                  </div>
                  <p className="text-xs text-muted-foreground">as client</p>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Your Projects</CardTitle>
                <CardDescription>Manage and track your video editing projects</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading projects...</span>
                  </div>
                ) : error ? (
                  <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-lg">
                    <p className="text-sm font-medium text-destructive">Error loading projects</p>
                    <p className="text-sm text-destructive/90 mt-1">{error}</p>
                    <Button onClick={fetchProjects} variant="outline" size="sm" className="mt-3">
                      Retry
                    </Button>
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderKanban className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-2">No projects yet</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first project to get started
                    </p>
                    <Button onClick={() => navigate('/dashboard/create-project')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Project
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {projects.map((project) => (
                      <Card
                        key={project._id}
                        onClick={() => navigate(`/dashboard/projects/${project._id}`)}
                        className="cursor-pointer hover:shadow-xl transition-all duration-300 border-border/50 hover:border-primary/50 group relative overflow-hidden bg-gradient-to-br from-card to-card/50"
                      >
                        {/* Hover gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        <CardHeader className="pb-4 relative">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-xl leading-tight group-hover:text-primary transition-colors mb-2 line-clamp-1">
                                {project.title}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {project.brief || 'No description provided'}
                              </p>
                            </div>
                            <div className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(project.status)}`}>
                              {project.status === 'active' ? 'In Progress' : 
                               project.status === 'on-hold' ? 'On Hold' :
                               project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-4 relative">
                          {/* Progress Section */}
                          {project.progress !== undefined && (
                            <div className="space-y-2.5 bg-muted/30 rounded-lg p-4 border border-border/50">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-foreground">Progress</span>
                                <span className="text-lg font-bold text-primary">{project.progress}%</span>
                              </div>
                              <Progress value={project.progress} className="h-2.5" />
                            </div>
                          )}
                          
                          {/* Footer Info */}
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2">
                              {project.userRole === 'owner' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                  Owner
                                </span>
                              )}
                              {project.userRole === 'client' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                  Client
                                </span>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground font-medium">
                              Due {formatDate(project.dueDate)}
                            </span>
                          </div>
                          
                          {/* View Button */}
                          <Button 
                            variant="ghost" 
                            className="w-full mt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:bg-primary/10 text-primary font-semibold"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/projects/${project._id}`);
                            }}
                          >
                            View Project
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
