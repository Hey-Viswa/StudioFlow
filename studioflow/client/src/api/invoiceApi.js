import axios from 'axios';
import { downloadBlob } from '../utils/downloadBlob';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Invoice API client with Clerk authentication
 * Throws errors for network failures to enable fallback to localStorage
 */
class InvoiceAPI {
  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 10000,
    });
  }

  /**
   * Set authorization token for requests
   */
  async setAuthToken(getToken) {
    try {
      const token = await getToken();
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return token;
    } catch (error) {
      throw new Error('Authentication failed');
    }
  }

  /**
   * Get paginated invoices list (PROJECT INVOICES)
   */
  async getInvoices({ page = 1, limit = 20, status, search } = {}) {
    try {
      const params = { page, limit };
      if (status && status !== 'all') params.status = status;
      if (search) params.search = search;

      console.log('🔍 Fetching project invoices with params:', params);
      const response = await this.client.get('/invoices', { params });
      console.log('✅ Invoices fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch invoices:', error);
      this.handleError(error, 'Failed to fetch invoices');
    }
  }

  /**
   * Get single invoice details (PROJECT INVOICE)
   */
  async getInvoice(invoiceId) {
    try {
      console.log('🔍 Fetching invoice details for:', invoiceId);
      const response = await this.client.get(`/invoices/${invoiceId}`);
      console.log('✅ Invoice details fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch invoice:', error);
      this.handleError(error, 'Failed to fetch invoice details');
    }
  }

  /**
   * Generate invoice from project
   */
  async generateInvoice(projectId, invoiceData) {
    try {
      console.log('Generating invoice - Project ID:', projectId);
      console.log('Generating invoice - Data:', JSON.stringify(invoiceData, null, 2));
      
      const response = await this.client.post(
        projectId
          ? `/projects/${projectId}/invoices/generate`
          : '/invoices',
        projectId ? invoiceData : { ...invoiceData, projectId: invoiceData.projectId }
      );
      
      console.log('Invoice generated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Generate invoice error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      this.handleError(error, 'Failed to generate invoice');
    }
  }

  /**
   * Create payment order for invoice
   */
  async createPaymentOrder(invoiceId) {
    try {
      const response = await this.client.post(`/invoices/project/${invoiceId}/pay`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to create payment order');
    }
  }

  /**
   * Verify payment after successful transaction
   */
  async verifyPayment(invoiceId, paymentData) {
    try {
      const response = await this.client.post(
        `/invoices/project/${invoiceId}/verify`,
        paymentData
      );
      return response.data;
    } catch (error) {
      this.handleError(error, 'Payment verification failed');
    }
  }

  /**
   * Send invoice via email
   */
  async sendInvoice(invoiceId, emailData) {
    try {
      const response = await this.client.post(
        `/invoices/project/${invoiceId}/send`,
        emailData
      );
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to send invoice');
    }
  }

  /**
   * Cancel invoice
   */
  async cancelInvoice(invoiceId) {
    try {
      const response = await this.client.post(`/invoices/project/${invoiceId}/cancel`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to cancel invoice');
    }
  }

  /**
   * Get all projects (for invoice generation)
   */
  async getProjects() {
    try {
      const response = await this.client.get('/projects');
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to fetch projects');
    }
  }

  /**
   * Download invoice PDF (PROJECT INVOICE)
   */
  async downloadInvoicePDF(invoiceId) {
    try {
      console.log('📥 Downloading PDF for invoice:', invoiceId);
      const response = await this.client.get(
        `/invoices/${invoiceId}/pdf`,
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      downloadBlob(blob, `invoice-${invoiceId}.pdf`);
      console.log('✅ PDF downloaded successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to download PDF:', error);
      this.handleError(error, 'Failed to download invoice PDF');
    }
  }

  async createInvoice(invoiceData) {
    try {
      const response = await this.client.post('/invoices', invoiceData);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to create invoice');
    }
  }

  async updateInvoice(invoiceId, payload) {
    try {
      const response = await this.client.put(`/invoices/${invoiceId}`, payload);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to update invoice');
    }
  }

  async updateInvoiceStatus(invoiceId, status) {
    try {
      const response = await this.client.patch(`/invoices/${invoiceId}/status`, { status });
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to update invoice status');
    }
  }

  async deleteInvoice(invoiceId) {
    try {
      const response = await this.client.delete(`/invoices/${invoiceId}`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to delete invoice');
    }
  }

  async resendInvoice(invoiceId) {
    try {
      const response = await this.client.post(`/invoices/${invoiceId}/resend`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to resend invoice');
    }
  }

  async fetchProjectMetrics(projectId) {
    try {
      const response = await this.client.get(`/projects/${projectId}/metrics`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to fetch project metrics');
    }
  }

  /**
   * Handle API errors and throw with context
   */
  handleError(error, defaultMessage) {
    console.error('InvoiceAPI Error:', error);
    console.error('Error response:', error.response?.data);
    
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
      throw new Error('NETWORK_ERROR: ' + (error.message || 'Connection failed'));
    }
    
    if (error.response) {
      const message = error.response.data?.error || error.response.data?.message || defaultMessage;
      throw new Error(message);
    }
    
    throw new Error(defaultMessage);
  }
}

export default new InvoiceAPI();
