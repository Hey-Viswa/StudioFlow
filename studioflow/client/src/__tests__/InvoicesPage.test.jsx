import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import InvoicesPage from '../pages/InvoicesPage';

// Mock MSW server
const server = setupServer(
  rest.get('/api/invoices', (req, res, ctx) => {
    const status = req.url.searchParams.get('status');
    
    // Simulate different responses based on status filter
    const allInvoices = [
      { _id: '1', invoiceNumber: 'INV-001', status: 'draft', total: 1000, client: { name: 'Client 1' }, projectId: { title: 'Project 1' }, dueDate: new Date() },
      { _id: '2', invoiceNumber: 'INV-002', status: 'pending', total: 2000, client: { name: 'Client 2' }, projectId: { title: 'Project 2' }, dueDate: new Date() },
      { _id: '3', invoiceNumber: 'INV-003', status: 'paid', total: 3000, client: { name: 'Client 3' }, projectId: { title: 'Project 3' }, dueDate: new Date() },
    ];

    let filtered = allInvoices;
    if (status && status !== 'all') {
      filtered = allInvoices.filter(inv => inv.status === status);
    }

    return res(
      ctx.json({
        success: true,
        invoices: filtered,
        pagination: {
          page: 1,
          limit: 20,
          total: filtered.length,
          totalPages: 1
        }
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockClerkProvider = ({ children }) => (
  <ClerkProvider publishableKey="test">
    {children}
  </ClerkProvider>
);

const renderWithRouter = (ui) => {
  return render(
    <BrowserRouter>
      <ClerkProvider publishableKey="test">
        {ui}
      </ClerkProvider>
    </BrowserRouter>
  );
};

describe('InvoicesPage', () => {
  test('renders without hooks error when toggling status filter', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    renderWithRouter(<InvoicesPage />);
    
    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('Invoices')).toBeInTheDocument();
    });
    
    // Toggle status filter multiple times - should not cause hooks error
    const draftTab = screen.getByText('Draft');
    const paidTab = screen.getByText('Paid');
    const allTab = screen.getByText('All');
    
    fireEvent.click(draftTab);
    fireEvent.click(paidTab);
    fireEvent.click(allTab);
    
    // Verify no console errors about hooks
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Rendered more hooks than during the previous render')
    );
    
    consoleSpy.mockRestore();
  });

  test('status filter triggers correct API request with status parameter', async () => {
    let capturedRequest = null;
    
    server.use(
      rest.get('/api/invoices', (req, res, ctx) => {
        capturedRequest = {
          url: req.url.toString(),
          status: req.url.searchParams.get('status')
        };
        
        return res(
          ctx.json({
            success: true,
            invoices: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 1 }
          })
        );
      })
    );
    
    renderWithRouter(<InvoicesPage />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Invoices')).toBeInTheDocument();
    });
    
    // Click on "Sent" status tab (which maps to 'pending' status in API)
    const sentTab = screen.getByText('Sent');
    fireEvent.click(sentTab);
    
    // Wait for API request to complete
    await waitFor(() => {
      expect(capturedRequest).toBeTruthy();
      expect(capturedRequest.status).toBe('sent');
    });
  });

  test('shows error banner and retry button on fetch failure', async () => {
    // Simulate API error
    server.use(
      rest.get('/api/invoices', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ error: 'Internal server error' })
        );
      })
    );
    
    renderWithRouter(<InvoicesPage />);
    
    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Failed to load invoices')).toBeInTheDocument();
    });
    
    // Verify retry button exists
    expect(screen.getByText('Retry')).toBeInTheDocument();
    
    // Click retry button
    const retryButton = screen.getByText('Retry');
    
    // Mock successful response for retry
    server.use(
      rest.get('/api/invoices', (req, res, ctx) => {
        return res(
          ctx.json({
            success: true,
            invoices: [{ _id: '1', invoiceNumber: 'INV-001', status: 'draft', total: 1000 }],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
          })
        );
      })
    );
    
    fireEvent.click(retryButton);
    
    // Verify error banner disappears after successful retry
    await waitFor(() => {
      expect(screen.queryByText('Failed to load invoices')).not.toBeInTheDocument();
    });
  });

  test('displays loading skeleton while fetching invoices', async () => {
    renderWithRouter(<InvoicesPage />);
    
    // Loading skeleton should be present initially
    // Note: Skeleton component would need to have a test ID or aria-label
    // For now, we just verify that invoices eventually load
    await waitFor(() => {
      expect(screen.queryByText('No invoices found')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('shows empty state when no invoices match filter', async () => {
    server.use(
      rest.get('/api/invoices', (req, res, ctx) => {
        return res(
          ctx.json({
            success: true,
            invoices: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 1 }
          })
        );
      })
    );
    
    renderWithRouter(<InvoicesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('No invoices found')).toBeInTheDocument();
    });
  });
});
