import { z } from 'zod';

/**
 * Validation schema for invoice items
 */
export const invoiceItemSchema = z.object({
  title: z.string().min(1, 'Item title is required'),
  description: z.string().optional(),
  quantity: z.number().positive('Quantity must be greater than 0'),
  rate: z.number().nonnegative('Rate must be 0 or greater'),
});

/**
 * Validation schema for new invoice form
 */
export const newInvoiceSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  tax: z.object({
    percentage: z.number().min(0).max(100).optional(),
  }),
  discount: z.object({
    percentage: z.number().min(0).max(100).optional(),
  }),
  notes: z.string().optional(),
});

/**
 * Default values for new invoice form
 */
export const defaultInvoiceValues = {
  projectId: '',
  items: [{ title: '', description: '', quantity: 1, rate: 0 }],
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  tax: { percentage: 0 },
  discount: { percentage: 0 },
  notes: '',
};
