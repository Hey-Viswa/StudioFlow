/**
 * Invoice Type Definitions
 * Centralized type exports for invoice-related functionality
 */

export type InvoiceStatus = 'draft' | 'pending' | 'sent' | 'paid' | 'partially_paid' | 'failed' | 'cancelled' | 'overdue';

export interface InvoiceItem {
  _id?: string;
  title: string;
  description?: string;
  quantity: number;
  rate: number;
  amount?: number;
}

export interface Customer {
  userId?: string | null;
  name: string;
  email?: string;
}

export interface InvoiceClient extends Customer {}

export interface ProjectSummary {
  _id: string;
  title: string;
  status?: string;
}

export interface InvoiceProject extends ProjectSummary {}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  projectId?: InvoiceProject | string;
  projectTitle?: string;
  client: InvoiceClient;
  items: InvoiceItem[];
  subtotal: number;
  total: number;
  currency?: string;
  tax?: {
    percentage: number;
    amount: number;
  };
  discount?: {
    percentage: number;
    amount: number;
  };
  notes?: string;
  issueDate?: string;
  dueDate?: string;
  paidAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  resendCount?: number;
  lastSentAt?: string;
  pdfGenerated?: boolean;
}

export interface InvoiceFilters {
  status?: InvoiceStatus | 'all';
  search?: string;
  projectId?: string;
  page?: number;
  limit?: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface InvoiceListResponse {
  success: boolean;
  invoices: Invoice[];
  pagination: Pagination;
}

export interface CreateInvoicePayload {
  projectId?: string;
  clientUserId?: string;
  items: InvoiceItem[];
  dueDate: string;
  notes?: string;
  tax?: { percentage?: number };
  discount?: { percentage?: number };
}

export interface ProjectMetrics {
  hoursWorked: number;
  billableHours: number;
  rate: number;
  expenses: number;
  completedTasks: number;
  projectName?: string;
}

export interface InvoiceStats {
  totalBilled: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  countPaid: number;
  countPending: number;
  countOverdue: number;
  countDraft: number;
}
