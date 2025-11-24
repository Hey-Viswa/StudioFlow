import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { toast } from 'sonner';
import NewInvoiceModal from '../../components/invoices/NewInvoiceModal';

// Mock toast to verify notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  }
}));

const mockProjects = [
  {
    _id: 'proj-1',
    title: 'Project Alpha',
    status: 'completed',
    budget: 50000,
    agreedPrice: 50000,
    brief: 'Website redesign',
    members: [
      { role: 'client', name: 'John Doe', userId: 'user-1' }
    ],
    deliverables: [
      { title: 'Homepage', description: 'Redesigned homepage' }
    ]
  },
  {
    _id: 'proj-2',
    title: 'Project Beta',
    status: 'active',
    budget: 30000,
    members: [
      { role: 'client', name: 'Jane Smith', userId: 'user-2' }
    ],
    deliverables: []
  },
];

// MSW server for API mocking
const server = setupServer(
  rest.get('/api/projects', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        projects: mockProjects
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

describe('NewInvoiceModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  afterEach(() => {
    mockOnClose.mockClear();
    mockOnSuccess.mockClear();
  });

  test('renders modal when open', async () => {
    renderWithProviders(
      <NewInvoiceModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    expect(screen.getByText('Create New Invoice')).toBeInTheDocument();
    expect(screen.getByText(/Generate an invoice for a project/i)).toBeInTheDocument();
  });

  test('does not render when closed', () => {
    renderWithProviders(
      <NewInvoiceModal isOpen={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    expect(screen.queryByText('Create New Invoice')).not.toBeInTheDocument();
  });

  test('loads projects on mount', async () => {
    renderWithProviders(
      <NewInvoiceModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.queryByText('Loading projects...')).not.toBeInTheDocument();
    });
  });

  test('displays validation error for required fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <NewInvoiceModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    // Wait for modal to be ready
    await waitFor(() => {
      expect(screen.queryByText('Loading projects...')).not.toBeInTheDocument();
    });

    // Try to submit without filling required fields
    const createButton = screen.getByRole('button', { name: /Create Invoice/i });
    await user.click(createButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/Project is required/i)).toBeInTheDocument();
    });
  });

  test('auto-populates invoice items when project selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <NewInvoiceModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.queryByText('Loading projects...')).not.toBeInTheDocument();
    });

    // Select a project
    const projectSelect = screen.getByRole('combobox');
    await user.click(projectSelect);

    // Select Project Alpha
    const projectOption = await screen.findByText('Project Alpha');
    await user.click(projectOption);

    // Should auto-populate client info
    await waitFor(() => {
      expect(screen.getByText(/Client: John Doe/i)).toBeInTheDocument();
    });
  });

  test('allows adding and removing invoice items', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <NewInvoiceModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    // Wait for modal
    await waitFor(() => {
      expect(screen.queryByText('Loading projects...')).not.toBeInTheDocument();
    });

    // Should have 1 item row initially
    expect(screen.getAllByPlaceholderText('Item title *')).toHaveLength(1);

    // Add a new item
    const addButton = screen.getByRole('button', { name: /Add Item/i });
    await user.click(addButton);

    // Should now have 2 item rows
    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('Item title *')).toHaveLength(2);
    });
  });

  test('calculates totals correctly', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <NewInvoiceModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    // Wait for modal
    await waitFor(() => {
      expect(screen.queryByText('Loading projects...')).not.toBeInTheDocument();
    });

    // Fill in item details
    const titleInput = screen.getByPlaceholderText('Item title *');
    await user.type(titleInput, 'Test Service');

    const quantityInput = screen.getByDisplayValue('1');
    await user.clear(quantityInput);
    await user.type(quantityInput, '2');

    const rateInputs = screen.getAllByRole('spinbutton');
    const rateInput = rateInputs.find(input => input.type === 'number' && input.step === '0.01');
    await user.clear(rateInput);
    await user.type(rateInput, '1000');

    // Verify total is calculated (2 * 1000 = 2000)
    await waitFor(() => {
      expect(screen.getByText(/₹2,000\.00/)).toBeInTheDocument();
    });
  });

  test('applies tax and discount correctly', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <NewInvoiceModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading projects...')).not.toBeInTheDocument();
    });

    // Fill item with 1000 rupees
    const titleInput = screen.getByPlaceholderText('Item title *');
    await user.type(titleInput, 'Test');

    const rateInputs = screen.getAllByRole('spinbutton');
    const rateInput = rateInputs.find(input => input.step === '0.01');
    await user.type(rateInput, '1000');

    // Add 10% tax
    const taxInput = screen.getByPlaceholderText('0');
    await user.type(taxInput, '10');

    // Should show tax amount
    await waitFor(() => {
      expect(screen.getByText(/Tax \(10%\):/)).toBeInTheDocument();
    });
  });

  test('closes modal on cancel', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <NewInvoiceModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('calls onSuccess with correct data on submit', async () => {
    const user = userEvent.setup();
    mockOnSuccess.mockResolvedValue({});

    renderWithProviders(
      <NewInvoiceModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.queryByText('Loading projects...')).not.toBeInTheDocument();
    });

    // Fill form
    const projectSelect = screen.getByRole('combobox');
    await user.click(projectSelect);
    const projectOption = await screen.findByText('Project Alpha');
    await user.click(projectOption);

    const titleInput = screen.getByPlaceholderText('Item title *');
    await user.type(titleInput, 'Service');

    // Submit
    const createButton = screen.getByRole('button', { name: /Create Invoice/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});
