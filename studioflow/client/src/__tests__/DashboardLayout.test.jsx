import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import DashboardLayout from '../components/DashboardLayout';

const mockClerkProvider = ({ children }) => (
  <ClerkProvider publishableKey="test">
    {children}
  </ClerkProvider>
);

const renderWithRouter = (ui, { route = '/' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ClerkProvider publishableKey="test">
        {ui}
      </ClerkProvider>
    </MemoryRouter>
  );
};

describe('DashboardLayout - Sidebar Navigation', () => {
  test('Invoices nav item has same active styling as other nav items', () => {
    const { rerender } = renderWithRouter(<DashboardLayout />, { route: '/dashboard/invoices' });
    
    const invoicesLink = screen.getByRole('link', { name: /invoices/i });
    
    // Check that Invoices has active styles
    expect(invoicesLink).toHaveClass('bg-primary/15', 'text-primary');
    expect(invoicesLink).toHaveAttribute('aria-current', 'page');
    
    // Check for active indicator pill
    const pillIndicator = invoicesLink.querySelector('.animate-pulse');
    expect(pillIndicator).toBeInTheDocument();
    expect(pillIndicator).toHaveClass('bg-primary', 'rounded-full');
    
    // Now navigate to Projects and verify similar styling
    rerender(
      <MemoryRouter initialEntries={['/dashboard/projects']}>
        <ClerkProvider publishableKey="test">
          <DashboardLayout />
        </ClerkProvider>
      </MemoryRouter>
    );
    
    const projectsLink = screen.getByRole('link', { name: /projects/i });
    
    // Verify Projects has the exact same active styles
    expect(projectsLink).toHaveClass('bg-primary/15', 'text-primary');
    expect(projectsLink).toHaveAttribute('aria-current', 'page');
    
    const projectsPill = projectsLink.querySelector('.animate-pulse');
    expect(projectsPill).toBeInTheDocument();
    expect(projectsPill).toHaveClass('bg-primary', 'rounded-full');
    
    // Verify Invoices is no longer active
    const invoicesLinkInactive = screen.getByRole('link', { name: /invoices/i });
    expect(invoicesLinkInactive).not.toHaveClass('bg-primary/15', 'text-primary');
    expect(invoicesLinkInactive).not.toHaveAttribute('aria-current');
  });

  test('all nav items have consistent padding, icon size, and spacing', () => {
    renderWithRouter(<DashboardLayout />, { route: '/dashboard' });
    
    const navItems = [
      screen.getByRole('link', { name: /dashboard/i }),
      screen.getByRole('link', { name: /projects/i }),
      screen.getByRole('link', { name: /invoices/i }),
      screen.getByRole('link', { name: /subscription/i }),
      screen.getByRole('link', { name: /settings/i }),
    ];
    
    navItems.forEach(item => {
      // All should have consistent padding
      expect(item).toHaveClass('px-3', 'py-2.5', 'rounded-lg', 'text-sm', 'font-medium');
      
      // All should have gap-3 for spacing between icon and text
      expect(item).toHaveClass('gap-3');
      
      // All icons should be w-5 h-5
      const icon = item.querySelector('svg');
      expect(icon).toHaveClass('w-5', 'h-5', 'flex-shrink-0');
    });
  });

  test('all nav items have proper hover and focus states', () => {
    renderWithRouter(<DashboardLayout />, { route: '/' });
    
    const invoicesLink = screen.getByRole('link', { name: /invoices/i });
    
    // Inactive state should have hover classes
    expect(invoicesLink).toHaveClass('hover:bg-sidebar-accent', 'hover:text-sidebar-accent-foreground');
    
    // Verify transition classes are present
    expect(invoicesLink).toHaveClass('transition-all', 'duration-200');
  });

  test('nav items have aria-current when active for accessibility', () => {
    const routes = [
      { path: '/dashboard', name: /^dashboard$/i },
      { path: '/dashboard/projects', name: /projects/i },
      { path: '/dashboard/invoices', name: /invoices/i },
      { path: '/dashboard/subscription', name: /subscription/i },
      { path: '/dashboard/settings', name: /settings/i },
    ];
    
    routes.forEach(({ path, name }) => {
      const { rerender } = renderWithRouter(<DashboardLayout />, { route: path });
      
      const activeLink = screen.getByRole('link', { name });
      expect(activeLink).toHaveAttribute('aria-current', 'page');
      
      // Verify other links don't have aria-current
      const allLinks = screen.getAllByRole('link');
      const inactiveLinks = allLinks.filter(link => link !== activeLink);
      inactiveLinks.forEach(link => {
        expect(link).not.toHaveAttribute('aria-current', 'page');
      });
    });
  });

  test('icon scaling animation is consistent across all nav items', () => {
    renderWithRouter(<DashboardLayout />, { route: '/dashboard/invoices' });
    
    const invoicesLink = screen.getByRole('link', { name: /invoices/i });
    const icon = invoicesLink.querySelector('svg');
    
    // Active icon should have scale-110
    expect(icon).toHaveClass('scale-110');
    
    // Check inactive item
    const projectsLink = screen.getByRole('link', { name: /projects/i });
    const projectsIcon = projectsLink.querySelector('svg');
    
    // Inactive should have group-hover:scale-110
    expect(projectsIcon).toHaveClass('group-hover:scale-110');
  });
});
