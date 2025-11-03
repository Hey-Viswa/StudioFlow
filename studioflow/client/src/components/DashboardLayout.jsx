import { Link, useLocation, Outlet } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { Button } from './ui/button';
import { LayoutDashboard, FolderKanban, Receipt, CreditCard, Settings, Plus, Trash2 } from 'lucide-react';

export default function DashboardLayout() {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', path: '/dashboard/projects', icon: FolderKanban },
    { name: 'Invoices', path: '/dashboard/invoices', icon: Receipt },
    { name: 'Subscription', path: '/dashboard/subscription', icon: CreditCard },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border flex items-center justify-center">
          <img src="/studioflowlogo.svg" alt="StudioFlow" className="h-8 w-auto" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-6">
          {/* Main Navigation */}
          <div>
            <p className="px-3 mb-3 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
              Navigation
            </p>
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                      active
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Trash Section */}
          <div>
            <p className="px-3 mb-3 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
              More
            </p>
            <div className="space-y-1">
              <Link
                to="/dashboard/trash"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive('/dashboard/trash')
                    ? 'bg-destructive/20 text-destructive shadow-lg'
                    : 'text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive'
                }`}
              >
                <Trash2 className={`w-5 h-5 transition-transform duration-200 ${isActive('/dashboard/trash') ? 'scale-110' : 'group-hover:scale-110'}`} />
                Trash
              </Link>
            </div>
          </div>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer group">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-9 h-9',
                },
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">Account</p>
              <p className="text-xs text-sidebar-foreground/60 group-hover:text-sidebar-foreground transition-colors">Manage profile</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background">
        <Outlet />
      </main>
    </div>
  );
}