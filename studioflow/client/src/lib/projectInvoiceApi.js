const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Generate invoice for a project
export const generateProjectInvoice = async (projectId, invoiceData, getToken) => {
  const token = await getToken();

  const response = await fetch(`${API_URL}/projects/${projectId}/invoices/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(invoiceData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate invoice');
  }

  return response.json();
};

// Get all invoices for a project
export const getProjectInvoices = async (projectId, getToken) => {
  const token = await getToken();

  const response = await fetch(`${API_URL}/projects/${projectId}/invoices`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch invoices');
  }

  return response.json();
};

// Get invoice details
export const getInvoiceDetails = async (invoiceId, getToken) => {
  const token = await getToken();

  const response = await fetch(`${API_URL}/invoices/project/${invoiceId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch invoice details');
  }

  return response.json();
};

// Create payment order
export const createPaymentOrder = async (invoiceId, getToken) => {
  const token = await getToken();

  const response = await fetch(`${API_URL}/invoices/project/${invoiceId}/pay`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create payment order');
  }

  return response.json();
};

// Verify payment
export const verifyPayment = async (invoiceId, paymentData, getToken) => {
  const token = await getToken();

  const response = await fetch(`${API_URL}/invoices/project/${invoiceId}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(paymentData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Payment verification failed');
  }

  return response.json();
};

// Cancel invoice
export const cancelInvoice = async (invoiceId, getToken) => {
  const token = await getToken();

  const response = await fetch(`${API_URL}/invoices/project/${invoiceId}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to cancel invoice');
  }

  return response.json();
};

// Resend invoice
export const resendInvoice = async (invoiceId, getToken) => {
  const token = await getToken();

  const response = await fetch(`${API_URL}/invoices/project/${invoiceId}/resend`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to resend invoice');
  }

  return response.json();
};
