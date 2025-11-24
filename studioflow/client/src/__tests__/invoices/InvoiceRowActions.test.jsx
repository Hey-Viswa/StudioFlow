import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { toast } from 'sonner';
import InvoiceRowActions from '../../components/invoices/InvoiceRowActions';

// Mock toast to verify notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  }
}));

const mockInvoice = {
  _id: 'invoice-123',
  invoiceNumber: 'INV-001',
  status: 'pending',
  total: 1000,
  client: { name: 'Test Client' },
  projectId: { title: 'Test Project' },
  dueDate: new Date('2025-12-01'),
  resendCount: 2
};

// MSW server for API mocking
const server = setupServer(
  rest.delete('/api/invoices/:id', (req, res, ctx) => {
    return res(
      ctx.json({ success: true, message: 'Invoice deleted' })
    );
  }),
  rest.post('/api/invoices/:id/resend', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        invoice: {
          ...mockInvoice,
          resendCount: 3,
          lastSentAt: new Date().toISOString()
        }
      })
    );
  }),
  rest.get('/api/invoices/:id', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        invoice: mockInvoice
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

describe('InvoiceRowActions', () => {
  const mockHandlers = {
    onView: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onResend: jest.fn(),
    onDownload: jest.fn(),
    onSend: jest.fn(),
    onPay: jest.fn()
  };

  beforeEach(() => {
    Object.values(mockHandlers).forEach(fn => fn.mockClear());
  });

  test('renders action menu trigger button', () => {
    render(
      <InvoiceRowActions
        invoice={mockInvoice}
        {...mockHandlers}
        pendingAction={null}
      />
    );

    const trigger = screen.getByRole('button', { name: /invoice actions/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).not.toBeDisabled();
  });

  test('opens menu and shows all action items', async () => {
    const user = userEvent.setup();
    
    render(
      <InvoiceRowActions
        invoice={mockInvoice}
        {...mockHandlers}
        pendingAction={null}
      />
    );

    const trigger = screen.getByRole('button', { name: /invoice actions/i });
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Download PDF')).toBeInTheDocument();
      expect(screen.getByText('Send to Client')).toBeInTheDocument();
      expect(screen.getByText('Resend')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  test('Edit action calls onEdit with invoice', async () => {
    const user = userEvent.setup();
    
    render(
      <InvoiceRowActions
        invoice={mockInvoice}
        {...mockHandlers}
        pendingAction={null}
      />
    );

    const trigger = screen.getByRole('button', { name: /invoice actions/i });
    await user.click(trigger);

    const editButton = await screen.findByText('Edit');
    await user.click(editButton);

    expect(mockHandlers.onEdit).toHaveBeenCalledTimes(1);
    expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockInvoice);
  });

  test('Delete action opens confirmation dialog', async () => {
    const user = userEvent.setup();
    
    render(
      <InvoiceRowActions
        invoice={mockInvoice}
        {...mockHandlers}
        pendingAction={null}
      />
    );

    const trigger = screen.getByRole('button', { name: /invoice actions/i });
    await user.click(trigger);

    const deleteButton = await screen.findByText('Delete');
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Delete invoice?')).toBeInTheDocument();
      expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument();
    });
  });

  test('Delete confirmation calls onDelete and closes dialog on success', async () => {
    const user = userEvent.setup();
    mockHandlers.onDelete.mockResolvedValueOnce();
    
    render(
      <InvoiceRowActions
        invoice={mockInvoice}
        {...mockHandlers}
        pendingAction={null}
      />
    );

    // Open menu and click delete
    const trigger = screen.getByRole('button', { name: /invoice actions/i });
    await user.click(trigger);
    
    const deleteButton = await screen.findByText('Delete');
    await user.click(deleteButton);

    // Confirm deletion
    const confirmButton = await screen.findByRole('button', { name: /^Delete$/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockHandlers.onDelete).toHaveBeenCalledTimes(1);
      expect(mockHandlers.onDelete).toHaveBeenCalledWith(mockInvoice);
    });

    // Dialog should close after successful delete
    await waitFor(() => {
      expect(screen.queryByText('Delete invoice?')).not.toBeInTheDocument();
    });
  });

  test('Delete dialog stays open on error', async () => {
    const user = userEvent.setup();
    const deleteError = new Error('Delete failed');
    mockHandlers.onDelete.mockRejectedValueOnce(deleteError);
    
    render(
      <InvoiceRowActions
        invoice={mockInvoice}
        {...mockHandlers}
        pendingAction={null}
      />
    );

    // Open menu and click delete
    const trigger = screen.getByRole('button', { name: /invoice actions/i });
    await user.click(trigger);
    
    const deleteButton = await screen.findByText('Delete');
    await user.click(deleteButton);

    // Confirm deletion
    const confirmButton = await screen.findByRole('button', { name: /^Delete$/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockHandlers.onDelete).toHaveBeenCalledTimes(1);
    });

    // Dialog should remain open on error
    expect(screen.getByText('Delete invoice?')).toBeInTheDocument();
  });

  test('Resend action calls onResend with invoice', async () => {
    const user = userEvent.setup();
    mockHandlers.onResend.mockResolvedValueOnce({
      invoice: { ...mockInvoice, resendCount: 3 }
    });
    
    render(
      <InvoiceRowActions
        invoice={mockInvoice}
        {...mockHandlers}
        pendingAction={null}
      />
    );

    const trigger = screen.getByRole('button', { name: /invoice actions/i });
    await user.click(trigger);

    const resendButton = await screen.findByText('Resend');
    await user.click(resendButton);

    await waitFor(() => {
      expect(mockHandlers.onResend).toHaveBeenCalledTimes(1);
      expect(mockHandlers.onResend).toHaveBeenCalledWith(mockInvoice);
    });
  });

  test('Resend shows loading state during operation', async () => {
    const user = userEvent.setup();
    
    render(
      <InvoiceRowActions
        invoice={mockInvoice}
        {...mockHandlers}
        pendingAction={{ invoiceId: mockInvoice._id, type: 'resend' }}
      />
    );

    const trigger = screen.getByRole('button', { name: /invoice actions/i });
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('Resending...')).toBeInTheDocument();
    });

    // Resend button should be disabled during operation
    const resendItem = screen.getByText('Resending...').closest('div[role="menuitem"]');
    expect(resendItem).toHaveClass('disabled:opacity-50');
  });

  test('Action menu is disabled when any action is pending', () => {
    render(
      <InvoiceRowActions
        invoice={mockInvoice}
        {...mockHandlers}
        pendingAction={{ invoiceId: mockInvoice._id, type: 'delete' }}
      />
    );

    const trigger = screen.getByRole('button', { name: /invoice actions/i });
    expect(trigger).toBeDisabled();
  });

  test('Delete button shows loading text when deleting', async () => {
    const user = userEvent.setup();
    
    // Render with delete pending
    const { rerender } = render(
      <InvoiceRowActions
        invoice={mockInvoice}
        {...mockHandlers}
        pendingAction={null}
      />
    );

    // Open delete dialog
    const trigger = screen.getByRole('button', { name: /invoice actions/i });
    await user.click(trigger);
    const deleteButton = await screen.findByText('Delete');
    await user.click(deleteButton);

    // Rerender with delete pending
    rerender(
      <InvoiceRowActions
        invoice={mockInvoice}
        {...mockHandlers}
        pendingAction={{ invoiceId: mockInvoice._id, type: 'delete' }}
      />
    );

    // Confirm button should show "Deleting…"
    const confirmButton = screen.getByRole('button', { name: /Deleting/i });
    expect(confirmButton).toBeInTheDocument();
    expect(confirmButton).toBeDisabled();
  });

  test('handles cancelled delete operation', async () => {
    const user = userEvent.setup();
    
    render(
      <InvoiceRowActions
        invoice={mockInvoice}
        {...mockHandlers}
        pendingAction={null}
      />
    );

    // Open menu and click delete
    const trigger = screen.getByRole('button', { name: /invoice actions/i });
    await user.click(trigger);
    
    const deleteButton = await screen.findByText('Delete');
    await user.click(deleteButton);

    // Cancel deletion
    const cancelButton = await screen.findByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    // Dialog should close and delete should not be called
    await waitFor(() => {
      expect(screen.queryByText('Delete invoice?')).not.toBeInTheDocument();
    });
    expect(mockHandlers.onDelete).not.toHaveBeenCalled();
  });

  test('handles resend error gracefully', async () => {
    const user = userEvent.setup();
    const resendError = new Error('Network error');
    mockHandlers.onResend.mockRejectedValueOnce(resendError);
    
    render(
      <InvoiceRowActions
        invoice={mockInvoice}
        {...mockHandlers}
        pendingAction={null}
      />
    );

    const trigger = screen.getByRole('button', { name: /invoice actions/i });
    await user.click(trigger);

    const resendButton = await screen.findByText('Resend');
    await user.click(resendButton);

    await waitFor(() => {
      expect(mockHandlers.onResend).toHaveBeenCalledTimes(1);
    });

    // Error is handled by parent component, menu just logs it
    expect(console.error).toHaveBeenCalled();
  });
});
