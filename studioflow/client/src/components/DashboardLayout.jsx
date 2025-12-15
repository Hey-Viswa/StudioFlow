import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { UserButton } from '@clerk/clerk-react';
import { Button } from './ui/button';
import {
  LayoutDashboard,
  FolderKanban,
  Receipt,
  CreditCard,
  Settings,
  Plus,
  Trash2,
  Menu,
  ChevronLeft,
  Bell,
  BarChart3,
  Map
} from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useSocket } from '../hooks/useSocket';
import { toast } from 'sonner';
import { ModeToggle } from './ModeToggle'; // Needed for mobile header
import NotificationBell from './NotificationBell'; // Needed for mobile header

export default function DashboardLayout() {
  // Layout for the dashboard with sidebar and header
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initialize push notifications
  usePushNotifications();

  // Global socket listener for notifications
  const socket = useSocket();

  useEffect(() => {
    if (socket) {
      const handleNotification = (data) => {
        console.log('🔔 Real-time notification received:', data);
        toast(data.title || 'New Notification', {
          description: data.message,
          action: {
            label: 'View',
            onClick: () => window.location.href = data.data?.url || '/dashboard/notifications'
          }
        });
      };

      socket.on('notification', handleNotification);

      return () => {
        socket.off('notification', handleNotification);
      };
    }
  }, [socket]);

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Mobile Sidebar Wrapper */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform lg:hidden transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <AppSidebar 
            mobile={true} 
            setMobileOpen={setMobileMenuOpen} 
            collapsed={false} 
            setCollapsed={() => {}} 
          />
      </div>

      {/* Desktop Sidebar */}
      <div className={`hidden lg:block h-full shrink-0 transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-[70px]' : 'w-[240px]'}`}>
         <AppSidebar 
            mobile={false} 
            collapsed={sidebarCollapsed} 
            setCollapsed={setSidebarCollapsed} 
         />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 transition-all duration-300"> 

        {/* Mobile Header */}
        <header className="lg:hidden border-b border-sidebar-border bg-sidebar p-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="relative">
            <img src="/studioflowlogo.svg" alt="StudioFlow" className="h-6 w-auto hidden dark:block" />
            <img src="/studioflow-black.svg" alt="StudioFlow" className="h-6 w-auto block dark:hidden" />
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <NotificationBell />
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8',
                },
              }}
            />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}