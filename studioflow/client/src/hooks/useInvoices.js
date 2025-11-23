import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import invoiceApi from '../api/invoiceApi';
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

  /**
   * Fetch invoices from API
   */
  const fetchInvoices = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);

    try {
      await invoiceApi.setAuthToken(getToken);
      const response = await invoiceApi.getInvoices(options);

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
      setError(err.message);
      setInvoices([]);
      toast.error('Failed to load invoices', {
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  /**
   * Create invoice
   */
  const createInvoice = useCallback(async (projectId, invoiceData) => {
    try {
      console.log('Creating invoice for project:', projectId);
      console.log('Invoice data:', invoiceData);
      
      await invoiceApi.setAuthToken(getToken);
      const response = await invoiceApi.generateInvoice(projectId, invoiceData);
      
      console.log('Invoice created successfully:', response);
      
      // Refresh list
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
      await invoiceApi.setAuthToken(getToken);
      const response = await invoiceApi.sendInvoice(invoiceId, emailData);
      
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
      await invoiceApi.setAuthToken(getToken);
      const response = await invoiceApi.createPaymentOrder(invoiceId);
      
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
      await invoiceApi.setAuthToken(getToken);
      const response = await invoiceApi.verifyPayment(invoiceId, paymentData);
      
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
  const downloadInvoice = useCallback(async (invoiceNumber) => {
    try {
      await invoiceApi.setAuthToken(getToken);
      await invoiceApi.downloadInvoicePDF(invoiceNumber);
      
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
      await invoiceApi.setAuthToken(getToken);
      return await invoiceApi.getInvoice(invoiceId);
    } catch (err) {
      console.error('Failed to get invoice:', err);
      throw err;
    }
  }, [getToken]);

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

  // Initial load
  useEffect(() => {
    fetchInvoices();
  }, []);

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
    getStats
  };
};
