import { useState } from 'react';
import { Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import InvoicesKPI from '../components/invoices/InvoicesKPI';
import InvoiceTable from '../components/invoices/InvoiceTable';
import NewInvoiceModal from '../components/invoices/NewInvoiceModal';
import InvoiceDetailModal from '../components/invoices/InvoiceDetailModal';
import SendInvoiceModal from '../components/invoices/SendInvoiceModal';
import { useInvoices } from '../hooks/useInvoices';
import { loadRazorpayScript, openRazorpayCheckout } from '../lib/razorpayCheckout';

export default function InvoicesPage() {
  // All hooks MUST be called at the top level before any conditional logic or early returns
  // This prevents "Rendered more hooks than during the previous render" error
  
  // Local UI state for modals
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // useInvoices hook - called exactly once per render
  const {
    invoices,
    loading,
    error,
    createInvoice,
    sendInvoice,
    createPaymentOrder,
    verifyPayment,
    downloadInvoice,
    deleteInvoice,
    resendInvoice,
    updateInvoice,
    updateInvoiceStatus,
    getStats,
    filters,
    setStatusFilter,
    refreshInvoices,
  } = useInvoices();

  const stats = getStats();

  // Handle status filter change - updates the hook's filter state
  // The hook will automatically refetch when status changes
  const handleStatusFilterChange = (newStatus) => {
    setStatusFilter(newStatus);
  };

  // Handle create invoice
  const handleCreateInvoice = async (projectId, invoiceData) => {
    try {
      const result = await createInvoice(projectId, invoiceData);
      console.log('Invoice created, result:', result);
      toast.success('Invoice created successfully');
      setShowNewInvoiceModal(false);
      // The createInvoice already calls fetchInvoices, so list will refresh automatically
    } catch (error) {
      console.error('Failed to create invoice:', error);
      // Error toast already shown in the hook
    }
  };

  // Handle view invoice
  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
  };

  // Handle download invoice
  const handleDownloadInvoice = async (invoice) => {
    try {
      await downloadInvoice(invoice.invoiceNumber);
    } catch (error) {
      // Error already toasted in hook
      console.error('Download failed:', error);
    }
  };

  // Handle send invoice
  const handleSendInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowSendModal(true);
  };

  const handleSendSubmit = async (emailData) => {
    try {
      await sendInvoice(selectedInvoice._id, emailData);
      toast.success('Invoice sent successfully');
    } catch (error) {
      console.error('Failed to send invoice:', error);
      throw error;
    }
  };

  // Handle edit invoice - opens detail modal in edit mode
  const handleEditInvoice = async (invoice) => {
    try {
      // Prefetch invoice data for faster modal loading
      setEditingInvoiceId(invoice._id);
      setSelectedInvoice(invoice);
      setIsEditModalOpen(true);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to open invoice for editing:', error);
      toast.error('Failed to open invoice', {
        description: error.message
      });
    }
  };

  // Handle delete invoice - removes invoice after confirmation
  const handleDeleteInvoice = async (invoice) => {
    try {
      await deleteInvoice(invoice._id);
      toast.success('Invoice deleted successfully');
      // Hook already calls refreshInvoices internally
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      toast.error('Failed to delete invoice', {
        description: error.message || 'Please try again'
      });
      throw error; // Rethrow to let RowActions handle UI state
    }
  };

  // Handle resend invoice - resends invoice email to client
  const handleResendInvoice = async (invoice) => {
    try {
      const result = await resendInvoice(invoice._id);
      const resendCount = result?.invoice?.resendCount || result?.resendCount || 1;
      toast.success('Invoice resent successfully', {
        description: `Sent ${resendCount} time${resendCount > 1 ? 's' : ''} total`
      });
      // Hook already calls refreshInvoices internally
      return result;
    } catch (error) {
      console.error('Failed to resend invoice:', error);
      toast.error('Failed to resend invoice', {
        description: error.message || 'Please try again'
      });
      throw error; // Rethrow to let RowActions handle UI state
    }
  };

  // Handle status update
  const handleStatusUpdate = async (invoice, newStatus) => {
    try {
      await updateInvoiceStatus(invoice._id, newStatus);
      // Success toast already shown in hook
    } catch (error) {
      console.error('Failed to update status:', error);
      // Error toast already shown in hook
    }
  };

  // Handle pay invoice
  const handlePayInvoice = async (invoice) => {
    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Failed to load payment gateway');
        return;
      }

      // Create payment order
      const { orderId, amount, currency, invoiceNumber } = await createPaymentOrder(invoice._id);

      // Open Razorpay checkout
      openRazorpayCheckout({
        orderId,
        amount,
        currency,
        description: `Payment for ${invoiceNumber}`,
        prefill: {
          email: invoice.client?.email || '',
          name: invoice.client?.name || ''
        },
        onSuccess: async (response) => {
          try {
            await verifyPayment(invoice._id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            
            toast.success('Payment successful!');
          } catch (error) {
            toast.error('Payment verification failed');
          }
        },
        onFailure: (error) => {
          if (!error.dismissed) {
            toast.error('Payment failed', {
              description: error.description || 'Please try again'
            });
          }
        }
      });
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed', {
        description: error.message
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Invoices</h1>
            <p className="text-slate-400">
              Manage project invoices and payments
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowNewInvoiceModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <InvoicesKPI stats={stats} loading={loading} />

        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 font-semibold mb-1">Failed to load invoices</p>
              <p className="text-sm text-slate-300">
                {error.includes('network') || error.includes('fetch') 
                  ? 'Check your network connection and try again.'
                  : error}
              </p>
            </div>
            <Button
              onClick={() => refreshInvoices()}
              variant="outline"
              size="sm"
              className="border-red-500/30 text-red-400 hover:bg-red-500/20"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {/* Invoice Table */}
        <InvoiceTable
          invoices={invoices}
          loading={loading}
          statusFilter={filters.status}
          onStatusFilterChange={handleStatusFilterChange}
          onViewInvoice={handleViewInvoice}
          onDownloadInvoice={handleDownloadInvoice}
          onSendInvoice={handleSendInvoice}
          onPayInvoice={handlePayInvoice}
          onEditInvoice={handleEditInvoice}
          onDeleteInvoice={handleDeleteInvoice}
          onResendInvoice={handleResendInvoice}
          onStatusUpdate={handleStatusUpdate}
        />

        {/* Modals */}
        <NewInvoiceModal
          isOpen={showNewInvoiceModal}
          onClose={() => setShowNewInvoiceModal(false)}
          onSuccess={handleCreateInvoice}
        />

        <InvoiceDetailModal
          invoice={selectedInvoice}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedInvoice(null);
          }}
          onSend={() => {
            setShowDetailModal(false);
            setShowSendModal(true);
          }}
          onPay={() => {
            setShowDetailModal(false);
            handlePayInvoice(selectedInvoice);
          }}
          actions={{
            updateInvoice,
            deleteInvoice,
            resendInvoice,
            refreshInvoices,
          }}
        />

        <SendInvoiceModal
          invoice={selectedInvoice}
          isOpen={showSendModal}
          onClose={() => {
            setShowSendModal(false);
            setSelectedInvoice(null);
          }}
          onSend={handleSendSubmit}
        />
      </div>
    </div>
  );
}
