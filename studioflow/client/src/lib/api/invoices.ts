import axios from 'axios';
import { downloadBlob } from '../../utils/downloadBlob';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const client = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

export type InvoiceStatus = 'draft' | 'pending' | 'sent' | 'paid' | 'partially_paid' | 'failed' | 'cancelled' | 'overdue';

export interface InvoiceItem {
  _id?: string;
  title: string;
  description?: string;
  quantity: number;
  rate: number;
  amount?: number;
}

export interface InvoiceClient {
  userId?: string | null;
  name: string;
  email?: string;
}

export interface InvoiceProject {
  _id: string;
  title: string;
  status?: string;
}

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

const normalizeError = (error: unknown, fallback = 'Something went wrong'): Error => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error || error.response?.data?.message || error.message;
    return new Error(message || fallback);
  }
  if (error instanceof Error) return error;
  return new Error(fallback);
};

export type GetTokenFn = (() => Promise<string | null>) | undefined;

export const setAuthToken = async (getToken: GetTokenFn) => {
  if (!getToken) return;
  const token = await getToken();
  if (token) {
    client.defaults.headers.common.Authorization = `Bearer ${token}`;
  }
};

const isInvoiceOverdue = (invoice: Invoice) => {
  if (!invoice.dueDate) return false;

  if (invoice.status === 'overdue') {
    return true;
  }

  if (invoice.status === 'pending') {
    return new Date(invoice.dueDate).getTime() < Date.now();
  }

  return false;
};

const coerceStatusParam = (status?: InvoiceStatus | 'all') => {
  if (!status || status === 'all') return undefined;
  // Backend accepts both 'pending' and 'sent'; keep payload consistent
  if (status === 'sent') return 'sent';
  return status;
};

export const getInvoices = async (filters: InvoiceFilters = {}): Promise<InvoiceListResponse> => {
  const params: Record<string, string | number> = {};
  if (filters.page) params.page = filters.page;
  if (filters.limit) params.limit = filters.limit;
  if (filters.search) params.search = filters.search;
  if (filters.projectId) params.projectId = filters.projectId;

  const statusParam = coerceStatusParam(filters.status);
  if (statusParam) params.status = statusParam;

  try {
    const { data } = await client.get<InvoiceListResponse>('/invoices', { params });
    if (filters.status === 'overdue') {
      return {
        ...data,
        invoices: (data.invoices || []).filter(isInvoiceOverdue),
      };
    }
    return data;
  } catch (error) {
    throw normalizeError(error, 'Failed to fetch invoices');
  }
};

export const getInvoice = async (invoiceId: string): Promise<Invoice> => {
  try {
    const { data } = await client.get<{ success: boolean; invoice: Invoice }>(`/invoices/${invoiceId}`);
    return data.invoice;
  } catch (error) {
    // Legacy fallback path
    const legacy = await client.get<{ success: boolean; invoice: Invoice }>(`/invoices/project/${invoiceId}`).catch((err) => {
      throw normalizeError(err, 'Failed to fetch invoice details');
    });
    return legacy.data.invoice;
  }
};

export const createInvoice = async (payload: CreateInvoicePayload) => {
  try {
    const { data } = await client.post('/invoices', payload);
    return data;
  } catch (error) {
    if (payload.projectId) {
      const fallback = await client
        .post(`/projects/${payload.projectId}/invoices/generate`, payload)
        .catch((err) => {
          throw normalizeError(err, 'Failed to create invoice');
        });
      return fallback.data;
    }
    throw normalizeError(error, 'Failed to create invoice');
  }
};

export const updateInvoice = async (invoiceId: string, payload: Partial<CreateInvoicePayload>) => {
  try {
    const { data } = await client.put(`/invoices/${invoiceId}`, payload);
    return data;
  } catch (error) {
    throw normalizeError(error, 'Failed to update invoice');
  }
};

export const updateInvoiceStatus = async (invoiceId: string, status: InvoiceStatus) => {
  try {
    const { data } = await client.patch(`/invoices/${invoiceId}/status`, { status });
    return data;
  } catch (error) {
    throw normalizeError(error, 'Failed to update invoice status');
  }
};

export const deleteInvoice = async (invoiceId: string) => {
  try {
    await client.delete(`/invoices/${invoiceId}`);
  } catch (error) {
    const normalized = normalizeError(error, 'Failed to delete invoice');
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      await client.post(`/invoices/project/${invoiceId}/cancel`).catch(() => {
        throw normalized;
      });
      return;
    }
    throw normalized;
  }
};

export const resendInvoice = async (invoiceId: string) => {
  try {
    const { data } = await client.post(`/invoices/${invoiceId}/resend`);
    return data;
  } catch (error) {
    throw normalizeError(error, 'Failed to resend invoice');
  }
};

export const downloadInvoicePdf = async (invoiceId: string, invoiceNumber?: string) => {
  try {
    const response = await client.get(`/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
    downloadBlob(response.data, `invoice-${invoiceNumber || invoiceId}.pdf`);
  } catch (error) {
    if (invoiceNumber) {
      const legacy = await client
        .get(`/invoices/project/${invoiceNumber}/download`, { responseType: 'blob' })
        .catch((err) => {
          throw normalizeError(err, 'Failed to download invoice');
        });
      downloadBlob(legacy.data, `${invoiceNumber}.pdf`);
      return;
    }
    throw normalizeError(error, 'Failed to download invoice');
  }
};

export const resendInvoiceToClient = resendInvoice;

export const getProjectMetrics = async (projectId: string): Promise<ProjectMetrics> => {
  try {
    const { data } = await client.get<{ success: boolean; metrics: ProjectMetrics }>(
      `/projects/${projectId}/metrics`
    );
    return data.metrics;
  } catch (error) {
    throw normalizeError(error, 'Failed to fetch project metrics');
  }
};

export const sendInvoice = async (invoiceId: string, payload: Record<string, unknown>) => {
  try {
    const { data } = await client.post(`/invoices/${invoiceId}/send`, payload);
    return data;
  } catch (error) {
    const legacy = await client
      .post(`/invoices/project/${invoiceId}/send`, payload)
      .catch((err) => {
        throw normalizeError(err, 'Failed to send invoice');
      });
    return legacy.data;
  }
};

export const createPaymentOrder = async (invoiceId: string) => {
  try {
    const { data } = await client.post(`/invoices/${invoiceId}/pay`);
    return data;
  } catch (error) {
    const legacy = await client.post(`/invoices/project/${invoiceId}/pay`).catch((err) => {
      throw normalizeError(err, 'Failed to create payment order');
    });
    return legacy.data;
  }
};

export const verifyInvoicePayment = async (invoiceId: string, payload: Record<string, unknown>) => {
  try {
    const { data } = await client.post(`/invoices/${invoiceId}/verify`, payload);
    return data;
  } catch (error) {
    const legacy = await client
      .post(`/invoices/project/${invoiceId}/verify`, payload)
      .catch((err) => {
        throw normalizeError(err, 'Failed to verify payment');
      });
    return legacy.data;
  }
};
export const checkOverdueInvoices = async () => {
  try {
    const { data } = await client.post('/invoices/check-overdue');
    return data;
  } catch (error) {
    // Don't throw, just log, as this is a background maintenance task
    console.error('Failed to check overdue invoices:', error);
    return null;
  }
};
