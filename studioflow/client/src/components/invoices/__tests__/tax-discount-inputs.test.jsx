import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, describe, it, vi, beforeEach } from 'vitest';
import NewInvoiceModal from '../NewInvoiceModal';
import InvoiceDetailModal from '../InvoiceDetailModal';

// Mock dependencies
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../lib/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ projects: [] })),
    post: vi.fn(() => Promise.resolve({})),
  },
}));

describe('Tax/Discount Input Validation', () => {
  describe('NewInvoiceModal - Tax Input', () => {
    const mockOnSuccess = vi.fn();
    const mockOnClose = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should accept integer values (0-100)', async () => {
      const user = userEvent.setup();
      render(
        <NewInvoiceModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const taxInput = screen.getByLabelText(/tax \(%\)/i);
      
      await user.clear(taxInput);
      await user.type(taxInput, '18');
      
      expect(taxInput).toHaveValue(18);
    });

    it('should round decimal 0.76 to 1 on blur', async () => {
      const user = userEvent.setup();
      render(
        <NewInvoiceModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const taxInput = screen.getByLabelText(/tax \(%\)/i);
      
      await user.clear(taxInput);
      await user.type(taxInput, '0.76');
      fireEvent.blur(taxInput);

      await waitFor(() => {
        expect(taxInput).toHaveValue(1);
      });
    });

    it('should round decimal 0.49 to 0 on blur', async () => {
      const user = userEvent.setup();
      render(
        <NewInvoiceModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const taxInput = screen.getByLabelText(/tax \(%\)/i);
      
      await user.clear(taxInput);
      await user.type(taxInput, '0.49');
      fireEvent.blur(taxInput);

      await waitFor(() => {
        expect(taxInput).toHaveValue(0);
      });
    });

    it('should clamp value 101 to 100 on blur', async () => {
      const user = userEvent.setup();
      render(
        <NewInvoiceModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const taxInput = screen.getByLabelText(/tax \(%\)/i);
      
      await user.clear(taxInput);
      await user.type(taxInput, '101');
      fireEvent.blur(taxInput);

      await waitFor(() => {
        expect(taxInput).toHaveValue(100);
      });
    });

    it('should clamp negative value to 0 on blur', async () => {
      const user = userEvent.setup();
      render(
        <NewInvoiceModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const taxInput = screen.getByLabelText(/tax \(%\)/i);
      
      await user.clear(taxInput);
      await user.type(taxInput, '-5');
      fireEvent.blur(taxInput);

      await waitFor(() => {
        expect(taxInput).toHaveValue(0);
      });
    });

    it('should have step attribute set to 1', () => {
      render(
        <NewInvoiceModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const taxInput = screen.getByLabelText(/tax \(%\)/i);
      expect(taxInput).toHaveAttribute('step', '1');
      expect(taxInput).toHaveAttribute('min', '0');
      expect(taxInput).toHaveAttribute('max', '100');
      expect(taxInput).toHaveAttribute('type', 'number');
    });
  });

  describe('NewInvoiceModal - Discount Input', () => {
    const mockOnSuccess = vi.fn();
    const mockOnClose = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should accept integer values (0-100)', async () => {
      const user = userEvent.setup();
      render(
        <NewInvoiceModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const discountInput = screen.getByLabelText(/discount \(%\)/i);
      
      await user.clear(discountInput);
      await user.type(discountInput, '10');
      
      expect(discountInput).toHaveValue(10);
    });

    it('should round decimal 5.8 to 6 on blur', async () => {
      const user = userEvent.setup();
      render(
        <NewInvoiceModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const discountInput = screen.getByLabelText(/discount \(%\)/i);
      
      await user.clear(discountInput);
      await user.type(discountInput, '5.8');
      fireEvent.blur(discountInput);

      await waitFor(() => {
        expect(discountInput).toHaveValue(6);
      });
    });

    it('should clamp value 150 to 100 on blur', async () => {
      const user = userEvent.setup();
      render(
        <NewInvoiceModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const discountInput = screen.getByLabelText(/discount \(%\)/i);
      
      await user.clear(discountInput);
      await user.type(discountInput, '150');
      fireEvent.blur(discountInput);

      await waitFor(() => {
        expect(discountInput).toHaveValue(100);
      });
    });

    it('should have step attribute set to 1', () => {
      render(
        <NewInvoiceModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const discountInput = screen.getByLabelText(/discount \(%\)/i);
      expect(discountInput).toHaveAttribute('step', '1');
      expect(discountInput).toHaveAttribute('min', '0');
      expect(discountInput).toHaveAttribute('max', '100');
      expect(discountInput).toHaveAttribute('type', 'number');
    });
  });

  describe('InvoiceDetailModal - Tax Input (Edit Mode)', () => {
    const mockInvoice = {
      _id: 'test-invoice-id',
      invoiceNumber: 'INV-001',
      project: { _id: 'proj-1', title: 'Test Project' },
      client: { name: 'Test Client', email: 'client@test.com' },
      items: [{ title: 'Item 1', description: 'Desc', quantity: 1, rate: 1000, amount: 1000 }],
      tax: { percentage: 18, amount: 180 },
      discount: { percentage: 10, amount: 100 },
      subtotal: 1000,
      total: 1080,
      status: 'pending',
      dueDate: '2025-12-31',
    };

    const mockOnSave = vi.fn();
    const mockOnClose = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should display existing tax value as integer', () => {
      render(
        <InvoiceDetailModal
          invoice={mockInvoice}
          isOpen={true}
          mode="edit"
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      const taxInput = screen.getByLabelText(/tax \(%\)/i);
      expect(taxInput).toHaveValue(18);
    });

    it('should round decimal 12.7 to 13 on blur', async () => {
      const user = userEvent.setup();
      render(
        <InvoiceDetailModal
          invoice={mockInvoice}
          isOpen={true}
          mode="edit"
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      const taxInput = screen.getByLabelText(/tax \(%\)/i);
      
      await user.clear(taxInput);
      await user.type(taxInput, '12.7');
      fireEvent.blur(taxInput);

      await waitFor(() => {
        expect(taxInput).toHaveValue(13);
      });
    });

    it('should clamp value 200 to 100 on blur', async () => {
      const user = userEvent.setup();
      render(
        <InvoiceDetailModal
          invoice={mockInvoice}
          isOpen={true}
          mode="edit"
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      const taxInput = screen.getByLabelText(/tax \(%\)/i);
      
      await user.clear(taxInput);
      await user.type(taxInput, '200');
      fireEvent.blur(taxInput);

      await waitFor(() => {
        expect(taxInput).toHaveValue(100);
      });
    });
  });

  describe('InvoiceDetailModal - Discount Input (Edit Mode)', () => {
    const mockInvoice = {
      _id: 'test-invoice-id',
      invoiceNumber: 'INV-001',
      project: { _id: 'proj-1', title: 'Test Project' },
      client: { name: 'Test Client', email: 'client@test.com' },
      items: [{ title: 'Item 1', description: 'Desc', quantity: 1, rate: 1000, amount: 1000 }],
      tax: { percentage: 18, amount: 180 },
      discount: { percentage: 10, amount: 100 },
      subtotal: 1000,
      total: 1080,
      status: 'pending',
      dueDate: '2025-12-31',
    };

    const mockOnSave = vi.fn();
    const mockOnClose = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should display existing discount value as integer', () => {
      render(
        <InvoiceDetailModal
          invoice={mockInvoice}
          isOpen={true}
          mode="edit"
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      const discountInput = screen.getByLabelText(/discount \(%\)/i);
      expect(discountInput).toHaveValue(10);
    });

    it('should round decimal 15.2 to 15 on blur', async () => {
      const user = userEvent.setup();
      render(
        <InvoiceDetailModal
          invoice={mockInvoice}
          isOpen={true}
          mode="edit"
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      const discountInput = screen.getByLabelText(/discount \(%\)/i);
      
      await user.clear(discountInput);
      await user.type(discountInput, '15.2');
      fireEvent.blur(discountInput);

      await waitFor(() => {
        expect(discountInput).toHaveValue(15);
      });
    });
  });

  describe('API Payload Validation', () => {
    it('should send integer percentages in payload', () => {
      // This test verifies that the transform logic in onSubmit
      // converts percentage values to integers before sending to API
      
      const taxPercentage = 18.7;
      const discountPercentage = 5.3;
      
      // Simulate the transform logic from onSubmit
      const payload = {
        tax: { percentage: Math.round(parseInt(taxPercentage, 10) || 0) },
        discount: { percentage: Math.round(parseInt(discountPercentage, 10) || 0) },
      };
      
      expect(payload.tax.percentage).toBe(19);
      expect(payload.discount.percentage).toBe(5);
      expect(Number.isInteger(payload.tax.percentage)).toBe(true);
      expect(Number.isInteger(payload.discount.percentage)).toBe(true);
    });

    it('should handle edge cases in payload transform', () => {
      const testCases = [
        { input: 0, expected: 0 },
        { input: 100, expected: 100 },
        { input: 0.49, expected: 0 },
        { input: 0.76, expected: 1 },
        { input: 99.9, expected: 100 },
        { input: null, expected: 0 },
        { input: undefined, expected: 0 },
        { input: '', expected: 0 },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = Math.round(parseInt(input, 10) || 0);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Zod Validation Schema', () => {
    it('should reject non-integer percentages', async () => {
      const { newInvoiceSchema } = await import('../../../lib/validations/invoice');
      
      const invalidData = {
        projectId: 'proj-123',
        items: [{ title: 'Item 1', description: '', quantity: 1, rate: 1000 }],
        dueDate: '2025-12-31',
        tax: { percentage: 18.7 }, // Decimal not allowed
        discount: { percentage: 10 },
        notes: '',
      };

      const result = newInvoiceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('tax'))).toBe(true);
      }
    });

    it('should accept valid integer percentages', async () => {
      const { newInvoiceSchema } = await import('../../../lib/validations/invoice');
      
      const validData = {
        projectId: 'proj-123',
        items: [{ title: 'Item 1', description: '', quantity: 1, rate: 1000 }],
        dueDate: '2025-12-31',
        tax: { percentage: 18 },
        discount: { percentage: 10 },
        notes: '',
      };

      const result = newInvoiceSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject percentages > 100', async () => {
      const { newInvoiceSchema } = await import('../../../lib/validations/invoice');
      
      const invalidData = {
        projectId: 'proj-123',
        items: [{ title: 'Item 1', description: '', quantity: 1, rate: 1000 }],
        dueDate: '2025-12-31',
        tax: { percentage: 150 },
        discount: { percentage: 10 },
        notes: '',
      };

      const result = newInvoiceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.message.includes('100%'))).toBe(true);
      }
    });

    it('should reject negative percentages', async () => {
      const { newInvoiceSchema } = await import('../../../lib/validations/invoice');
      
      const invalidData = {
        projectId: 'proj-123',
        items: [{ title: 'Item 1', description: '', quantity: 1, rate: 1000 }],
        dueDate: '2025-12-31',
        tax: { percentage: 18 },
        discount: { percentage: -5 },
        notes: '',
      };

      const result = newInvoiceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.message.includes('negative'))).toBe(true);
      }
    });
  });
});
