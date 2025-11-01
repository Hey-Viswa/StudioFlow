import { Link, useLocation, Outlet } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { Button } from './ui/button';
import { LayoutDashboard, FolderKanban, Receipt, CreditCard, Settings, Plus } from 'lucide-react';

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
    <div className="flex h-screen bg-[#0a0e1a]">
      {/* Sidebar */}
      <aside className="w-56 bg-[#0f1420] border-r border-[#1e293b] flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-[#1e293b] flex items-center justify-center">
          <img src="/studioflowlogo.png" alt="StudioFlow" className="h-8 w-auto" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6">
          <div className="mb-6">
            <p className="px-3 mb-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Navigation</p>
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'bg-[#1e293b] text-white'
                        : 'text-gray-400 hover:text-white hover:bg-[#1a2332]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Create Section */}
          <div>
            <p className="px-3 mb-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Create</p>
            <Link to="/dashboard/projects/new">
              <Button className="w-full bg-primary hover:bg-primary/90 text-white font-medium">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </Link>
          </div>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-[#1e293b]">
          <div className="flex items-center gap-3">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8',
                },
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Account</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
