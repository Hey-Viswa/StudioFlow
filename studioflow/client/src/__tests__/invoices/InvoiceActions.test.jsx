import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import InvoicesPage from '../../pages/InvoicesPage';

const API_URL = 'http://localhost:5000/api';

// Mock invoice data
const mockInvoices = [
  {
    _id: '1',
    invoiceNumber: 'INV-001',
    status: 'draft',
    projectId: { _id: 'p1', title: 'Test Project' },
    client: { name: 'John Doe', email: 'john@example.com' },
    items: [{ title: 'Service', quantity: 1, rate: 1000 }],
    subtotal: 1000,
    total: 1000,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    tax: { percentage: 0, amount: 0 },
    discount: { percentage: 0, amount: 0 },
    resendCount: 0,
  },
  {
    _id: '2',
    invoiceNumber: 'INV-002',
    status: 'pending',
    projectId: { _id: 'p2', title: 'Another Project' },
    client: { name: 'Jane Smith', email: 'jane@example.com' },
    items: [{ title: 'Design Work', quantity: 5, rate: 500 }],
    subtotal: 2500,
    total: 2500,
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    tax: { percentage: 0, amount: 0 },
    discount: { percentage: 0, amount: 0 },
    resendCount: 1,
  },
];

// MSW server setup
const server = setupServer(
  rest.get(`${API_URL}/invoices`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        invoices: mockInvoices,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      })
    );
  }),

  rest.delete(`${API_URL}/invoices/:id`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true, message: 'Invoice deleted' }));
  }),

  rest.post(`${API_URL}/invoices/:id/resend`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true, message: 'Invoice resent' }));
  }),

  rest.get(`${API_URL}/invoices/:id/pdf`, (req, res, ctx) => {
    const pdfBuffer = new ArrayBuffer(8);
    return res(
      ctx.status(200),
      ctx.set('Content-Type', 'application/pdf'),
      ctx.body(pdfBuffer)
    );
  }),

  rest.put(`${API_URL}/invoices/:id`, (req, res, ctx) => {
    const updatedInvoice = { ...mockInvoices[0], ...req.body };
    return res(ctx.status(200), ctx.json({ success: true, invoice: updatedInvoice }));
  }),

  rest.put(`${API_URL}/invoices/:id/status`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true, message: 'Status updated' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock Clerk
const mockClerk = {
  getToken: jest.fn().mockResolvedValue('mock-token'),
  user: { id: 'user-123', primaryEmailAddress: { emailAddress: 'test@example.com' } },
};

const renderWithProviders = (component) => {
  return render(
    <ClerkProvider publishableKey="test-key">
      <BrowserRouter>{component}</BrowserRouter>
    </ClerkProvider>
  );
};

describe('Invoice Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should display invoices list', async () => {
    renderWithProviders(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
      expect(screen.getByText('INV-002')).toBeInTheDocument();
    });
  });

  test('should delete invoice and remove from table', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });

    // Find the actions dropdown for first invoice
    const actionsButtons = screen.getAllByLabelText('Invoice actions');
    await user.click(actionsButtons[0]);

    // Click delete
    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);

    // Confirm deletion in dialog
    const confirmButton = screen.getByRole('button', { name: /delete/i });
    await user.click(confirmButton);

    // Verify invoice is removed
    await waitFor(() => {
      expect(screen.queryByText('INV-001')).not.toBeInTheDocument();
    });

    // Verify success toast (you may need to mock toast)
    await waitFor(() => {
      expect(screen.getByText(/deleted successfully/i)).toBeInTheDocument();
    });
  });

  test('should resend invoice and show toast', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-002')).toBeInTheDocument();
    });

    // Open actions dropdown
    const actionsButtons = screen.getAllByLabelText('Invoice actions');
    await user.click(actionsButtons[1]);

    // Click resend
    const resendButton = screen.getByText('Resend');
    await user.click(resendButton);

    // Verify success message
    await waitFor(() => {
      expect(screen.getByText(/resent successfully/i)).toBeInTheDocument();
    });
  });

  test('should download invoice PDF', async () => {
    const user = userEvent.setup();
    const mockCreateObjectURL = jest.fn();
    const mockRevokeObjectURL = jest.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    renderWithProviders(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });

    // Open actions dropdown
    const actionsButtons = screen.getAllByLabelText('Invoice actions');
    await user.click(actionsButtons[0]);

    // Click download
    const downloadButton = screen.getByText('Download PDF');
    await user.click(downloadButton);

    // Verify download initiated
    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalled();
    });
  });

  test('should update status optimistically', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });

    // Find and click status badge
    const draftBadge = screen.getByText('Draft');
    await user.click(draftBadge);

    // Select new status
    const pendingOption = screen.getByText('Sent');
    await user.click(pendingOption);

    // Verify status updated (optimistically)
    await waitFor(() => {
      expect(screen.getByText('Sent')).toBeInTheDocument();
      expect(screen.queryByText('Draft')).not.toBeInTheDocument();
    });
  });

  test('should open edit modal with prefilled data', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });

    // Open actions dropdown
    const actionsButtons = screen.getAllByLabelText('Invoice actions');
    await user.click(actionsButtons[0]);

    // Click edit
    const editButton = screen.getByText('Edit');
    await user.click(editButton);

    // Verify modal opens with invoice data
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Project')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Service')).toBeInTheDocument();
    });
  });
});
