import { useState } from 'react';
import { useUser, useAuth, UserButton } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { LayoutDashboard, FolderKanban, Users, Receipt, Settings, Menu, X, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [apiResponse, setApiResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const callProtectedAPI = async () => {
    setLoading(true);
    setError(null);
    setApiResponse(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('No session token available');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/protected`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      setApiResponse(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
              <img src="/studioflowlogo.png" alt="StudioFlow" className="h-5 w-auto" />
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
                <img src="/studioflowlogo.png" alt="StudioFlow" className="h-5 w-auto" />
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
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Welcome back, {user?.firstName || 'there'}! </h2>
              <p className="text-muted-foreground">Here's what's happening with your projects today.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Active Projects</CardTitle><FolderKanban className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">12</div><p className="text-xs text-muted-foreground">+2 from last month</p></CardContent></Card>
              <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Clients</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">24</div><p className="text-xs text-muted-foreground">+4 this week</p></CardContent></Card>
              <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Revenue</CardTitle><Receipt className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">$12,450</div><p className="text-xs text-muted-foreground">+18% from last month</p></CardContent></Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Projects</CardTitle>
                <CardDescription>Your active video editing projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div 
                    onClick={() => navigate('/project/1')} 
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FolderKanban className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium group-hover:text-primary transition-colors">Product Promo Reel</p>
                        <p className="text-sm text-muted-foreground">Nimbus Co. • Due Sep 30</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                      Active
                    </span>
                  </div>
                  
                  <div 
                    onClick={() => navigate('/project/2')} 
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FolderKanban className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium group-hover:text-primary transition-colors">Corporate Training Video</p>
                        <p className="text-sm text-muted-foreground">TechCorp • Due Oct 15</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-500 border border-orange-500/30">
                      At Risk
                    </span>
                  </div>
                  
                  <div 
                    onClick={() => navigate('/project/3')} 
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FolderKanban className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium group-hover:text-primary transition-colors">Social Media Content Pack</p>
                        <p className="text-sm text-muted-foreground">BrandFlow • Due Oct 5</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                      On Track
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader><CardTitle>Protected API Test</CardTitle><CardDescription>Test the Clerk JWT authentication with the backend</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={callProtectedAPI} disabled={loading}>{loading ? 'Calling API...' : 'Call Protected API'}</Button>
                {error && (<div className="p-4 border border-destructive/50 bg-destructive/10 rounded-lg"><p className="text-sm font-medium text-destructive">Error:</p><p className="text-sm text-destructive/90 mt-1">{error}</p></div>)}
                {apiResponse && (<div className="p-4 border border-primary/50 bg-primary/10 rounded-lg"><p className="text-sm font-medium text-primary mb-2"> Success!</p><pre className="text-xs bg-background p-3 rounded overflow-auto">{JSON.stringify(apiResponse, null, 2)}</pre></div>)}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
