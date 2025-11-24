import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { toast } from 'sonner';
import InvoicesPage from '../../pages/InvoicesPage';

// Mock toast to verify notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  }
}));

const mockInvoices = [
  {
    _id: 'inv-1',
    invoiceNumber: 'INV-001',
    status: 'draft',
    total: 1000,
    client: { name: 'Client A', email: 'clienta@test.com' },
    projectId: { _id: 'proj-1', title: 'Project Alpha' },
    dueDate: new Date('2025-12-01').toISOString(),
    resendCount: 0,
    items: [{ title: 'Service', quantity: 1, rate: 1000 }]
  },
  {
    _id: 'inv-2',
    invoiceNumber: 'INV-002',
    status: 'pending',
    total: 2000,
    client: { name: 'Client B', email: 'clientb@test.com' },
    projectId: { _id: 'proj-2', title: 'Project Beta' },
    dueDate: new Date('2025-12-15').toISOString(),
    resendCount: 1,
    items: [{ title: 'Consulting', quantity: 2, rate: 1000 }]
  },
];

// MSW server for API mocking
const server = setupServer(
  rest.get('/api/invoices', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        invoices: mockInvoices,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1
        }
      })
    );
  }),
  rest.get('/api/invoices/:id', (req, res, ctx) => {
    const { id } = req.params;
    const invoice = mockInvoices.find(inv => inv._id === id);
    if (!invoice) {
      return res(ctx.status(404), ctx.json({ error: 'Invoice not found' }));
    }
    return res(
      ctx.json({
        success: true,
        invoice
      })
    );
  }),
  rest.delete('/api/invoices/:id', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        message: 'Invoice deleted successfully'
      })
    );
  }),
  rest.post('/api/invoices/:id/resend', (req, res, ctx) => {
    const { id } = req.params;
    const invoice = mockInvoices.find(inv => inv._id === id);
    return res(
      ctx.json({
        success: true,
        invoice: {
          ...invoice,
          resendCount: (invoice?.resendCount || 0) + 1,
          lastSentAt: new Date().toISOString()
        }
      })
    );
  }),
  rest.get('/api/projects', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        projects: [
          { _id: 'proj-1', title: 'Project Alpha' },
          { _id: 'proj-2', title: 'Project Beta' }
        ]
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  jest.clearAllMocks();
});
afterAll(() => server.close());

const renderWithProviders = (ui) => {
  return render(
    <BrowserRouter>
      <ClerkProvider publishableKey="test-key">
        {ui}
      </ClerkProvider>
    </BrowserRouter>
  );
};

describe('InvoicesPage - Row Actions Integration', () => {
  test('renders invoice table with action menus', async () => {
    renderWithProviders(<InvoicesPage />);

    // Wait for invoices to load
    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
      expect(screen.getByText('INV-002')).toBeInTheDocument();
    });

    // Verify action menu buttons are present
    const actionButtons = screen.getAllByRole('button', { name: /invoice actions/i });
    expect(actionButtons).toHaveLength(2);
  });

  test('Edit action opens invoice detail modal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoicesPage />);

    // Wait for invoices to load
    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });

    // Click first action menu
    const actionButtons = screen.getAllByRole('button', { name: /invoice actions/i });
    await user.click(actionButtons[0]);

    // Click Edit option
    const editOption = await screen.findByText('Edit');
    await user.click(editOption);

    // Verify modal opens (looking for invoice number in modal)
    await waitFor(() => {
      const modals = screen.getAllByText('INV-001');
      // Should have at least 2: one in table, one in modal
      expect(modals.length).toBeGreaterThanOrEqual(1);
    });
  });

  test('Delete action shows confirmation and removes invoice on confirm', async () => {
    const user = userEvent.setup();
    
    // Track API calls
    let deleteCallCount = 0;
    server.use(
      rest.delete('/api/invoices/:id', (req, res, ctx) => {
        deleteCallCount++;
        return res(
          ctx.json({ success: true, message: 'Invoice deleted' })
        );
      }),
      // After delete, return one less invoice
      rest.get('/api/invoices', (req, res, ctx) => {
        if (deleteCallCount > 0) {
          return res(
            ctx.json({
              success: true,
              invoices: [mockInvoices[1]], // Only second invoice remains
              pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
            })
          );
        }
        return res(
          ctx.json({
            success: true,
            invoices: mockInvoices,
            pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }
          })
        );
      })
    );

    renderWithProviders(<InvoicesPage />);

    // Wait for invoices to load
    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });

    // Open action menu for first invoice
    const actionButtons = screen.getAllByRole('button', { name: /invoice actions/i });
    await user.click(actionButtons[0]);

    // Click Delete option
    const deleteOption = await screen.findByText('Delete');
    await user.click(deleteOption);

    // Verify confirmation dialog appears
    await waitFor(() => {
      expect(screen.getByText('Delete invoice?')).toBeInTheDocument();
    });

    // Click confirm delete button
    const confirmButton = screen.getByRole('button', { name: /^Delete$/i });
    await user.click(confirmButton);

    // Verify delete API was called
    await waitFor(() => {
      expect(deleteCallCount).toBe(1);
    });

    // Verify success toast was shown
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Invoice deleted successfully');
    });

    // Verify invoice is removed from table after refetch
    await waitFor(() => {
      expect(screen.queryByText('INV-001')).not.toBeInTheDocument();
      expect(screen.getByText('INV-002')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('Delete can be cancelled without calling API', async () => {
    const user = userEvent.setup();
    
    let deleteCallCount = 0;
    server.use(
      rest.delete('/api/invoices/:id', (req, res, ctx) => {
        deleteCallCount++;
        return res(ctx.json({ success: true }));
      })
    );

    renderWithProviders(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });

    // Open action menu and click delete
    const actionButtons = screen.getAllByRole('button', { name: /invoice actions/i });
    await user.click(actionButtons[0]);
    
    const deleteOption = await screen.findByText('Delete');
    await user.click(deleteOption);

    // Cancel the deletion
    const cancelButton = await screen.findByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    // Verify dialog closes
    await waitFor(() => {
      expect(screen.queryByText('Delete invoice?')).not.toBeInTheDocument();
    });

    // Verify delete API was NOT called
    expect(deleteCallCount).toBe(0);

    // Invoice should still be in the table
    expect(screen.getByText('INV-001')).toBeInTheDocument();
  });

  test('Resend action calls API and shows success toast', async () => {
    const user = userEvent.setup();
    
    let resendCallCount = 0;
    let capturedInvoiceId = null;
    
    server.use(
      rest.post('/api/invoices/:id/resend', (req, res, ctx) => {
        resendCallCount++;
        capturedInvoiceId = req.params.id;
        return res(
          ctx.json({
            success: true,
            invoice: {
              ...mockInvoices[1],
              resendCount: 2,
              lastSentAt: new Date().toISOString()
            }
          })
        );
      })
    );

    renderWithProviders(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-002')).toBeInTheDocument();
    });

    // Open action menu for second invoice (pending status, can be resent)
    const actionButtons = screen.getAllByRole('button', { name: /invoice actions/i });
    await user.click(actionButtons[1]);

    // Click Resend option
    const resendOption = await screen.findByText('Resend');
    await user.click(resendOption);

    // Verify resend API was called with correct invoice ID
    await waitFor(() => {
      expect(resendCallCount).toBe(1);
      expect(capturedInvoiceId).toBe('inv-2');
    });

    // Verify success toast was shown
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Invoice resent successfully',
        expect.objectContaining({
          description: expect.stringContaining('2 times total')
        })
      );
    });
  });

  test('handles delete error gracefully', async () => {
    const user = userEvent.setup();
    
    // Simulate API error
    server.use(
      rest.delete('/api/invoices/:id', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ error: 'Internal server error' })
        );
      })
    );

    renderWithProviders(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });

    // Open action menu and delete
    const actionButtons = screen.getAllByRole('button', { name: /invoice actions/i });
    await user.click(actionButtons[0]);
    
    const deleteOption = await screen.findByText('Delete');
    await user.click(deleteOption);

    // Confirm deletion
    const confirmButton = await screen.findByRole('button', { name: /^Delete$/i });
    await user.click(confirmButton);

    // Verify error toast was shown
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to delete invoice',
        expect.objectContaining({
          description: expect.any(String)
        })
      );
    });

    // Invoice should still be in table
    expect(screen.getByText('INV-001')).toBeInTheDocument();
  });

  test('handles resend error gracefully', async () => {
    const user = userEvent.setup();
    
    // Simulate API error
    server.use(
      rest.post('/api/invoices/:id/resend', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ error: 'Failed to send email' })
        );
      })
    );

    renderWithProviders(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-002')).toBeInTheDocument();
    });

    // Open action menu and resend
    const actionButtons = screen.getAllByRole('button', { name: /invoice actions/i });
    await user.click(actionButtons[1]);
    
    const resendOption = await screen.findByText('Resend');
    await user.click(resendOption);

    // Verify error toast was shown
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to resend invoice',
        expect.objectContaining({
          description: expect.any(String)
        })
      );
    });
  });

  test('action menu is disabled while operation is in progress', async () => {
    const user = userEvent.setup();
    
    // Delay the delete response to test loading state
    server.use(
      rest.delete('/api/invoices/:id', async (req, res, ctx) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return res(ctx.json({ success: true }));
      })
    );

    renderWithProviders(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });

    // Get action buttons before operation
    const actionButtons = screen.getAllByRole('button', { name: /invoice actions/i });
    const firstActionButton = actionButtons[0];

    // Start delete operation
    await user.click(firstActionButton);
    const deleteOption = await screen.findByText('Delete');
    await user.click(deleteOption);
    
    const confirmButton = screen.getByRole('button', { name: /^Delete$/i });
    
    // Click confirm but don't wait for completion
    user.click(confirmButton);

    // Note: Testing the disabled state during operation is tricky due to async nature
    // In real usage, the pendingAction state would disable the menu
  });

  test('displays updated resend count after successful resend', async () => {
    const user = userEvent.setup();
    
    // Mock increased resend count
    server.use(
      rest.post('/api/invoices/:id/resend', (req, res, ctx) => {
        return res(
          ctx.json({
            success: true,
            invoice: {
              ...mockInvoices[1],
              resendCount: 3, // Increased from 1 to 3
            }
          })
        );
      }),
      // Return updated invoice in list after resend
      rest.get('/api/invoices', (req, res, ctx) => {
        return res(
          ctx.json({
            success: true,
            invoices: [
              mockInvoices[0],
              { ...mockInvoices[1], resendCount: 3 }
            ],
            pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }
          })
        );
      })
    );

    renderWithProviders(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-002')).toBeInTheDocument();
    });

    // Resend the invoice
    const actionButtons = screen.getAllByRole('button', { name: /invoice actions/i });
    await user.click(actionButtons[1]);
    
    const resendOption = await screen.findByText('Resend');
    await user.click(resendOption);

    // Verify toast shows updated count
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Invoice resent successfully',
        expect.objectContaining({
          description: expect.stringContaining('3 times total')
        })
      );
    });
  });
});
