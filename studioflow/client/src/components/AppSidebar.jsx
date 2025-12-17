import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserButton, useUser } from '@clerk/clerk-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import {
  LayoutDashboard,
  CreditCard,
  Settings,
  Map,
  ChevronRight,
  ChevronsUpDown,
  Command,
  PanelLeft, // Import standard toggle icon
  CornerDownRight
} from 'lucide-react';
import { ModeToggle } from './ModeToggle';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useReviewFeatureFlag } from '@/context/FeatureFlagContext';

// --- Sub-Components ---

const SidebarHeader = ({ collapsed, setCollapsed, mobile }) => (
    <div className={cn(
        "h-16 flex items-center px-4 border-b border-sidebar-border shrink-0 transition-all duration-300 group-data-[collapsible=icon]:h-12",
        collapsed ? "justify-center" : "justify-between"
    )}>
         {(!collapsed || mobile) && (
            <Link to="/" className="flex items-center gap-2 overflow-hidden transition-all duration-300">
                {/* Expanded: Full Logo */}
                <img src="/studioflowlogo.svg" alt="StudioFlow" className="h-8 w-auto hidden dark:block" />
                <img src="/studioflow-black.svg" alt="StudioFlow" className="h-8 w-auto block dark:hidden" />
            </Link>
         )}
        
        {/* Toggle Button */}
        {!mobile && (
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCollapsed(!collapsed)}
                title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                <PanelLeft className="h-4 w-4" />
            </Button>
        )}
    </div>
);

const NavMain = ({ items, collapsed, mobile, isActivePath }) => {
    // Independent state for each collapsible item
    const [openItems, setOpenItems] = useState(() => {
        try {
            const saved = localStorage.getItem('sidebar-state');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    });

    const toggle = (title, currentEffectiveState) => {
        setOpenItems(prev => {
            const newState = { ...prev, [title]: !currentEffectiveState };
            localStorage.setItem('sidebar-state', JSON.stringify(newState));
            return newState;
        });
    };

    return (
        <div className="flex flex-col gap-1 py-2">
             {(!collapsed || mobile) && (
                <h4 className="px-4 text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-2 mt-2">Platform</h4>
            )}
            {items.map((item) => {
                const active = isActivePath(item.url);
                const isCollapsible = item.items && item.items.length > 0;
                // Logic: Use explicit state if set, otherwise default to active (auto-open)
                const isOpen = openItems[item.title] !== undefined ? openItems[item.title] : active;

                if (collapsed && !mobile && isCollapsible) {
                    return (
                        <DropdownMenu key={item.title}>
                            <DropdownMenuTrigger asChild>
                                <div 
                                    className={cn(
                                        "flex items-center justify-center h-9 w-9 mx-auto rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer transition-colors",
                                        active && "bg-primary text-primary-foreground hover:bg-primary/90"
                                    )}
                                    title={item.title}
                                >
                                    {item.icon && <item.icon className="h-5 w-5" />}
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="right" align="start" className="w-48 ml-2">
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                                    {item.title}
                                </div>
                                {item.items.map(subItem => (
                                    <DropdownMenuItem key={subItem.title} asChild>
                                        <Link 
                                            to={subItem.url}
                                            className={cn("w-full cursor-pointer", isActivePath(subItem.url) && "bg-primary text-primary-foreground")}
                                            onClick={(e) => {
                                                if (subItem.url === '#') {
                                                    e.preventDefault();
                                                    toast.error("Please open a project to view its storyboard.");
                                                }
                                            }}
                                        >
                                            {subItem.title}
                                        </Link>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                }

                // If collapsible, use div/button. If link, use Link.
                const Wrapper = isCollapsible ? 'div' : Link;
                
                // Top-level item click (mostly for toggling groups)
                const handleItemClick = (e) => {
                    if (isCollapsible) {
                         toggle(item.title, isOpen);
                    }
                    // No top-level storyboard item anymore, so removed that branch
                };

                const wrapperProps = isCollapsible ? {} : { to: item.url };

                return (
                    <div key={item.title}>
                        <Wrapper
                            {...wrapperProps}
                            onClick={handleItemClick}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md mx-2 cursor-pointer group/item",
                                active && !isCollapsible && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
                                collapsed && !mobile && "justify-center px-2 mx-0"
                            )}
                            title={collapsed ? item.title : undefined}
                        >
                            {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                            
                            {(!collapsed || mobile) && (
                                <>
                                    <span className="truncate flex-1">{item.title}</span>
                                    {isCollapsible && (
                                        <ChevronRight className={cn(
                                            "ml-auto h-4 w-4 transition-transform duration-200",
                                            isOpen && "rotate-90"
                                        )} />
                                    )}
                                </>
                            )}
                        </Wrapper>
                        
                        {/* Submenu */}
                        {isCollapsible && (!collapsed || mobile) && isOpen && (
                            <div className="ml-4 pl-4 border-l border-sidebar-border mt-1 mb-1 space-y-1">
                                {item.items.map(subItem => (
                                    <Link
                                        key={subItem.title}
                                        to={subItem.url}
                                        className={cn(
                                            "flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-sidebar-accent/50 rounded-md",
                                            isActivePath(subItem.url) && "bg-primary text-primary-foreground font-medium hover:bg-primary/90",
                                            subItem.url === '#' && "opacity-50 cursor-not-allowed text-muted-foreground",
                                            // Visual nesting for Storyboard
                                            subItem.title === 'Storyboard' && "ml-4 border-l border-sidebar-border pl-2 h-7"
                                        )}
                                        onClick={(e) => {
                                            if (subItem.url === '#') {
                                                e.preventDefault();
                                                 toast.error("Please open a project to view its storyboard.");
                                            }
                                        }}
                                    >
                                        {subItem.title === 'Storyboard' && (
                                            <subItem.icon className="h-3 w-3 mr-1" />
                                        )}
                                        <span>{subItem.title}</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

const NavUser = ({ user, collapsed, mobile }) => {
    return (
        <div className="mt-auto p-4 border-t border-sidebar-border">
             {(!collapsed || mobile) && (
                <div className="flex items-center justify-between mb-4 animate-in fade-in slide-in-from-bottom-2">
                    <ModeToggle />
                </div>
             )}

            <div className={cn(
                "flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer group",
                collapsed && !mobile && "justify-center px-0"
            )}>
                  <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "h-8 w-8" }}}/>
                 {(!collapsed || mobile) && (
                    <div className="grid flex-1 text-left text-sm leading-tight ml-1">
                        <span className="truncate font-semibold">{user?.fullName || 'User'}</span>
                        <span className="truncate text-xs text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</span>
                    </div>
                )}
                 {(!collapsed || mobile) && <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />}
            </div>
        </div>
    )
}


// --- Main AppSidebar Component ---

export function AppSidebar({ collapsed, setCollapsed, mobile, setMobileOpen }) {
  const location = useLocation();
  const { user } = useUser();
  
  // Detect project context
  const projectMatch = location.pathname.match(/\/dashboard\/projects\/([^\/]+)/);
  const currentProjectId = projectMatch ? projectMatch[1] : null;
  const isProjectContext = !!currentProjectId && currentProjectId !== 'new';

  const isActive = (path) => {
      // Special case for Projects vs Storyboard to avoid collision
    if (path === '/dashboard/projects' && location.pathname.includes('/projects/')) {
         return location.pathname === path;
    }
    return location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
  }

  // Data Mapping (Lifecycle Flow)
  const { features } = useReviewFeatureFlag();

  const data = {
    user: user,
    navMain: [
      {
        title: 'Workspace',
        url: '#', // Group header
        icon: LayoutDashboard,
        items: [
           { title: 'Overview', url: '/dashboard' },
           { title: 'Projects', url: '/dashboard/projects' },
           ...(features?.storyboard ? [{ 
               title: 'Storyboard', 
               url: isProjectContext ? `/dashboard/projects/${currentProjectId}/storyboard` : '#',
               icon: CornerDownRight,
           }] : []),
        ]
      },
      {
         title: 'Business',
         url: '#',
         icon: CreditCard,
         items: [
            { title: 'Invoices', url: '/dashboard/invoices' },
            { title: 'Subscription', url: '/dashboard/subscription' }
         ]
      },
      {
          title: 'System',
          url: '#',
          icon: Settings,
          items: [
              { title: 'Analytics', url: '/dashboard/analytics' },
              { title: 'Notifications', url: '/dashboard/notifications' },
              { title: 'Trash', url: '/dashboard/trash' },
              { title: 'Settings', url: '/dashboard/settings' },
          ]
      }
    ]
  }

  return (
    <aside
      className={cn(
        "group/sidebar h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ease-in-out relative z-50",
        collapsed ? "w-[70px]" : "w-[240px]",
        mobile && "w-full"
      )}
      data-collapsible={collapsed ? "icon" : ""}
    >
        <SidebarHeader collapsed={collapsed} setCollapsed={setCollapsed} mobile={mobile} />
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
             {/* Workspace Group (Expanded by default) */}
             <NavMain items={data.navMain} collapsed={collapsed} mobile={mobile} isActivePath={isActive} />
        </div>

        <NavUser user={user} collapsed={collapsed} mobile={mobile} />
    </aside>
  );
}
