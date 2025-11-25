import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import * as invoicesApi from '../lib/api/invoices';
import { toast } from 'sonner';

/**
 * Custom hook for managing invoices
 */
export const useInvoices = () => {
  const { getToken } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });

  /**
   * Fetch invoices from API
   */
  const fetchInvoices = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);

    try {
      await invoicesApi.setAuthToken(getToken);
      
      // Build query parameters
      const queryParams = {
        ...filters,
        ...options
      };
      
      const response = await invoicesApi.getInvoices(queryParams);

      console.log('Fetched invoices response:', response);

      setInvoices(response.invoices || []);
      setPagination(response.pagination || {
        page: response.page || 1,
        limit: response.limit || 20,
        total: response.total || 0,
        totalPages: response.totalPages || 0
      });
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
      const errorMessage = err.message || 'Unknown error occurred';
      setError(errorMessage);
      setInvoices([]);
      
      // Only show toast for non-network errors to avoid duplicate error UI
      if (!errorMessage.toLowerCase().includes('network') && !errorMessage.toLowerCase().includes('fetch')) {
        toast.error('Failed to load invoices', {
          description: errorMessage
        });
      }
    } finally {
      setLoading(false);
    }
  }, [getToken, filters]);

  /**
   * Create invoice (project-based)
   * Always posts full payload to POST /api/invoices
   */
  const createInvoice = useCallback(async (invoiceData) => {
    try {
      console.log('Creating invoice with payload:', invoiceData);
      
      await invoicesApi.setAuthToken(getToken);
      const response = await invoicesApi.createInvoice(invoiceData);
      
      console.log('Invoice created successfully:', response);
      
      // Refresh list so InvoiceTable includes the new invoice
      await fetchInvoices();
      
      toast.success('Invoice created successfully');
      return response;
    } catch (err) {
      console.error('Failed to create invoice:', err);
      toast.error('Failed to create invoice', {
        description: err.message
      });
      throw err;
    }
  }, [getToken, fetchInvoices]);

  /**
   * Send invoice via email
   */
  const sendInvoice = useCallback(async (invoiceId, emailData) => {
    try {
      await invoicesApi.setAuthToken(getToken);
      const response = await invoicesApi.sendInvoice(invoiceId, emailData);
      
      toast.success('Invoice sent successfully');
      return response;
    } catch (err) {
      console.error('Failed to send invoice:', err);
      toast.error('Failed to send invoice', {
        description: err.message
      });
      throw err;
    }
  }, [getToken]);

  /**
   * Create payment order and return orderId
   */
  const createPaymentOrder = useCallback(async (invoiceId) => {
    try {
      await invoicesApi.setAuthToken(getToken);
      const response = await invoicesApi.createPaymentOrder(invoiceId);
      
      return response;
    } catch (err) {
      console.error('Failed to create payment order:', err);
      toast.error('Payment unavailable', {
        description: err.message
      });
      throw err;
    }
  }, [getToken]);

  /**
   * Verify payment after successful transaction
   */
  const verifyPayment = useCallback(async (invoiceId, paymentData) => {
    try {
      await invoicesApi.setAuthToken(getToken);
      const response = await invoicesApi.verifyInvoicePayment(invoiceId, paymentData);
      
      // Refresh invoices to show updated status
      await fetchInvoices();
      
      toast.success('Payment verified successfully');
      return response;
    } catch (err) {
      console.error('Failed to verify payment:', err);
      toast.error('Payment verification failed', {
        description: err.message
      });
      throw err;
    }
  }, [getToken, fetchInvoices]);

  /**
   * Download invoice PDF
   */
  const downloadInvoice = useCallback(async (invoiceId, invoiceNumber) => {
    try {
      await invoicesApi.setAuthToken(getToken);
      await invoicesApi.downloadInvoicePDF(invoiceId, invoiceNumber);
      
      toast.success('Invoice downloaded');
    } catch (err) {
      console.error('Failed to download invoice:', err);
      toast.error('Download failed', {
        description: err.message
      });
      throw err;
    }
  }, [getToken]);

  /**
   * Get single invoice
   */
  const getInvoice = useCallback(async (invoiceId) => {
    try {
      await invoicesApi.setAuthToken(getToken);
      return await invoicesApi.getInvoice(invoiceId);
    } catch (err) {
      console.error('Failed to get invoice:', err);
      throw err;
    }
  }, [getToken]);

  // Optional helper for opening invoice in edit mode (used by pages/modals)
  const openEditInvoice = useCallback(async (invoiceId) => {
    try {
      // Reuse getInvoice so the implementation stays in one place
      const data = await getInvoice(invoiceId);
      return data;
    } catch (err) {
      // Error toast is not shown here to let callers decide UX
      console.error('Failed to open invoice for editing:', err);
      throw err;
    }
  }, [getInvoice]);

  const deleteInvoice = useCallback(async (invoiceId) => {
    try {
      await invoicesApi.setAuthToken(getToken);
      await invoicesApi.deleteInvoice(invoiceId);
      // Success toast shown in page component to avoid duplication
      await fetchInvoices();
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      // Let page component handle error toast
      throw err;
    }
  }, [getToken, fetchInvoices]);

  const resendInvoice = useCallback(async (invoiceId) => {
    try {
      await invoicesApi.setAuthToken(getToken);
      const response = await invoicesApi.resendInvoice(invoiceId);
      // Success toast shown in page component to avoid duplication
      await fetchInvoices();
      return response; // Return response so page can show resend count
    } catch (err) {
      console.error('Failed to resend invoice:', err);
      // Let page component handle error toast
      throw err;
    }
  }, [getToken, fetchInvoices]);

  const updateInvoice = useCallback(async (invoiceId, payload) => {
    try {
      await invoicesApi.setAuthToken(getToken);
      const response = await invoicesApi.updateInvoice(invoiceId, payload);
      toast.success('Invoice updated');
      await fetchInvoices();
      return response;
    } catch (err) {
      console.error('Failed to update invoice:', err);
      toast.error('Failed to update invoice', { description: err.message });
      throw err;
    }
  }, [getToken, fetchInvoices]);

  const updateInvoiceStatus = useCallback(async (invoiceId, status) => {
    const previousInvoices = invoices;

    // Optimistic update
    setInvoices((current) => current.map((invoice) =>
      invoice._id === invoiceId ? { ...invoice, status } : invoice
    ));

    try {
      await invoicesApi.setAuthToken(getToken);
      await invoicesApi.updateInvoiceStatus(invoiceId, status);
      await fetchInvoices(); // Refresh to get accurate stats
      toast.success('Status updated');
    } catch (err) {
      console.error('Failed to update invoice status:', err);
      setInvoices(previousInvoices);
      toast.error('Failed to update status', { description: err.message });
      throw err;
    }
  }, [getToken, invoices]);

  const setStatusFilter = useCallback((status) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const setSearchFilter = useCallback((search) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const refreshInvoices = useCallback(() => fetchInvoices(), [fetchInvoices]);

  /**
   * Get invoice statistics
   */
  const getStats = useCallback(() => {
    const stats = {
      totalBilled: 0,
      totalPaid: 0,
      totalPending: 0,
      totalOverdue: 0,
      countPaid: 0,
      countPending: 0,
      countOverdue: 0,
      countDraft: 0
    };

    const today = new Date();

    invoices.forEach(invoice => {
      const amount = invoice.total || 0;
      stats.totalBilled += amount;

      switch (invoice.status) {
        case 'paid':
          stats.totalPaid += amount;
          stats.countPaid++;
          break;
        case 'pending':
          if (new Date(invoice.dueDate) < today) {
            stats.totalOverdue += amount;
            stats.countOverdue++;
          } else {
            stats.totalPending += amount;
            stats.countPending++;
          }
          break;
        case 'overdue':
          stats.totalOverdue += amount;
          stats.countOverdue++;
          break;
        case 'draft':
          stats.countDraft++;
          break;
        default:
          stats.totalPending += amount;
          stats.countPending++;
      }
    });

    return stats;
  }, [invoices]);

  // Debounce filter changes to avoid rapid API calls (200ms)
  useEffect(() => {
    const handle = setTimeout(() => {
      fetchInvoices();
    }, 200);

    return () => clearTimeout(handle);
  }, [filters]);

  return {
    invoices,
    loading,
    error,
    pagination,
    fetchInvoices,
    getInvoice,
    createInvoice,
    sendInvoice,
    createPaymentOrder,
    verifyPayment,
    downloadInvoice,
    getStats,
    deleteInvoice,
    resendInvoice,
    updateInvoice,
    updateInvoiceStatus,
    openEditInvoice,
    setStatusFilter,
    setSearchFilter,
    filters,
    refreshInvoices
  };
};
