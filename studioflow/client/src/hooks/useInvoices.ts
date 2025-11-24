import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';
import type {
  CreateInvoicePayload,
  Invoice,
  InvoiceFilters,
  InvoiceStatus,
  Pagination,
  ProjectMetrics,
} from '../lib/api/invoices';
import {
  createInvoice as apiCreateInvoice,
  createPaymentOrder as apiCreatePaymentOrder,
  deleteInvoice as apiDeleteInvoice,
  downloadInvoicePdf as apiDownloadInvoicePdf,
  getInvoice as apiGetInvoice,
  getInvoices as apiGetInvoices,
  resendInvoice as apiResendInvoice,
  sendInvoice as apiSendInvoice,
  setAuthToken,
  updateInvoice as apiUpdateInvoice,
  updateInvoiceStatus as apiUpdateInvoiceStatus,
  verifyInvoicePayment as apiVerifyInvoicePayment,
  getProjectMetrics as apiGetProjectMetrics,
} from '../lib/api/invoices';

const defaultPagination: Pagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
};

interface UseInvoicesOptions {
  initialFilters?: InvoiceFilters;
  autoFetch?: boolean;
}

export const useInvoices = (options: UseInvoicesOptions = {}) => {
  const { initialFilters, autoFetch = true } = options;
  const { getToken } = useAuth();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InvoiceFilters>({ status: 'all', ...initialFilters });
  const [pagination, setPagination] = useState<Pagination>(defaultPagination);

  const ensureAuth = useCallback(async () => {
    await setAuthToken(getToken);
  }, [getToken]);

  const fetchInvoices = useCallback(
    async (override?: Partial<InvoiceFilters>) => {
      setLoading(true);
      const nextFilters = override ? { ...filters, ...override } : filters;

      try {
        await ensureAuth();
        const response = await apiGetInvoices(nextFilters);
        setInvoices(response.invoices || []);
        setPagination(response.pagination || defaultPagination);
        setError(null);
        if (override) {
          setFilters(nextFilters);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load invoices';
        setError(message);
        setInvoices([]);
        toast.error('Failed to load invoices', {
          description: message,
        });
      } finally {
        setLoading(false);
      }
    },
    [ensureAuth, filters]
  );

  useEffect(() => {
    if (!autoFetch) return;
    fetchInvoices();
  }, [autoFetch, fetchInvoices]);

  const mutate = useCallback(async () => {
    await fetchInvoices();
  }, [fetchInvoices]);

  const createInvoice = useCallback(
    async (projectId: string, invoiceData: CreateInvoicePayload) => {
      try {
        await ensureAuth();
        await apiCreateInvoice({ ...invoiceData, projectId });
        toast.success('Invoice created successfully');
        await fetchInvoices();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create invoice';
        toast.error('Failed to create invoice', { description: message });
        throw err;
      }
    },
    [ensureAuth, fetchInvoices]
  );

  const sendInvoice = useCallback(
    async (invoiceId: string, emailData: Record<string, unknown>) => {
      try {
        await ensureAuth();
        await apiSendInvoice(invoiceId, emailData);
        toast.success('Invoice sent successfully');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send invoice';
        toast.error('Failed to send invoice', { description: message });
        throw err;
      }
    },
    [ensureAuth]
  );

  const createPaymentOrder = useCallback(
    async (invoiceId: string) => {
      try {
        await ensureAuth();
        return await apiCreatePaymentOrder(invoiceId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Payment unavailable';
        toast.error('Payment unavailable', { description: message });
        throw err;
      }
    },
    [ensureAuth]
  );

  const verifyPayment = useCallback(
    async (invoiceId: string, paymentData: Record<string, unknown>) => {
      try {
        await ensureAuth();
        const response = await apiVerifyInvoicePayment(invoiceId, paymentData);
        await fetchInvoices();
        toast.success('Payment verified successfully');
        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Payment verification failed';
        toast.error('Payment verification failed', { description: message });
        throw err;
      }
    },
    [ensureAuth, fetchInvoices]
  );

  const downloadInvoice = useCallback(
    async (invoiceId: string, invoiceNumber?: string) => {
      try {
        await ensureAuth();
        await apiDownloadInvoicePdf(invoiceId, invoiceNumber);
        toast.success('Invoice downloaded');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to download invoice';
        toast.error('Download failed', { description: message });
        throw err;
      }
    },
    [ensureAuth]
  );

  const deleteInvoice = useCallback(
    async (invoiceId: string) => {
      let snapshot: Invoice[] = [];
      setInvoices((prev) => {
        snapshot = prev;
        return prev.filter((invoice) => invoice._id !== invoiceId);
      });

      try {
        await ensureAuth();
        await apiDeleteInvoice(invoiceId);
        toast.success('Invoice deleted');
        await fetchInvoices();
      } catch (err) {
        setInvoices(snapshot);
        const message = err instanceof Error ? err.message : 'Failed to delete invoice';
        toast.error('Failed to delete invoice', { description: message });
        throw err;
      }
    },
    [ensureAuth, fetchInvoices]
  );

  const resendInvoice = useCallback(
    async (invoiceId: string) => {
      try {
        await ensureAuth();
        const response = await apiResendInvoice(invoiceId);
        toast.success('Invoice resent to client');
        await fetchInvoices();
        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to resend invoice';
        toast.error('Failed to resend invoice', { description: message });
        throw err;
      }
    },
    [ensureAuth, fetchInvoices]
  );

  const updateInvoice = useCallback(
    async (invoiceId: string, payload: Partial<CreateInvoicePayload>) => {
      try {
        await ensureAuth();
        await apiUpdateInvoice(invoiceId, payload);
        toast.success('Invoice updated');
        await fetchInvoices();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update invoice';
        toast.error('Failed to update invoice', { description: message });
        throw err;
      }
    },
    [ensureAuth, fetchInvoices]
  );

  const updateStatus = useCallback(
    async (invoiceId: string, status: InvoiceStatus) => {
      let snapshot: Invoice[] = [];
      setInvoices((prev) => {
        snapshot = prev;
        return prev.map((invoice) =>
          invoice._id === invoiceId ? { ...invoice, status } : invoice
        );
      });

      try {
        await ensureAuth();
        await apiUpdateInvoiceStatus(invoiceId, status);
        toast.success('Invoice status updated');
      } catch (err) {
        setInvoices(snapshot);
        const message = err instanceof Error ? err.message : 'Failed to update status';
        toast.error('Failed to update status', { description: message });
        throw err;
      }
    },
    [ensureAuth]
  );

  const getInvoice = useCallback(
    async (invoiceId: string) => {
      try {
        await ensureAuth();
        return await apiGetInvoice(invoiceId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load invoice';
        toast.error('Failed to load invoice', { description: message });
        throw err;
      }
    },
    [ensureAuth]
  );

  const getProjectMetrics = useCallback(
    async (projectId: string): Promise<ProjectMetrics> => {
      await ensureAuth();
      return apiGetProjectMetrics(projectId);
    },
    [ensureAuth]
  );

  const getStats = useCallback(() => {
    const stats = {
      totalBilled: 0,
      totalPaid: 0,
      totalPending: 0,
      totalOverdue: 0,
      countPaid: 0,
      countPending: 0,
      countOverdue: 0,
      countDraft: 0,
    };

    const today = Date.now();

    invoices.forEach((invoice) => {
      const amount = invoice.total || 0;
      stats.totalBilled += amount;

      switch (invoice.status) {
        case 'paid':
          stats.totalPaid += amount;
          stats.countPaid += 1;
          break;
        case 'pending':
          if (invoice.dueDate && new Date(invoice.dueDate).getTime() < today) {
            stats.totalOverdue += amount;
            stats.countOverdue += 1;
          } else {
            stats.totalPending += amount;
            stats.countPending += 1;
          }
          break;
        case 'draft':
          stats.countDraft += 1;
          break;
        default:
          stats.totalPending += amount;
          stats.countPending += 1;
      }
    });

    return stats;
  }, [invoices]);

  return {
    invoices,
    loading,
    error,
    filters,
    pagination,
    setFilters,
    fetchInvoices,
    mutate,
    getInvoice,
    createInvoice,
    sendInvoice,
    createPaymentOrder,
    verifyPayment,
    downloadInvoice,
    deleteInvoice,
    resendInvoice,
    updateInvoice,
    updateStatus,
    getStats,
    getProjectMetrics,
  };
};

export type { Invoice, InvoiceStatus, ProjectMetrics };
