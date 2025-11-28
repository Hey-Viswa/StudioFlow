import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // All hooks MUST be called at the top level before any conditional logic or early returns
  // This prevents "Rendered more hooks than during the previous render" error

  // Local UI state for modals
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailModalMode, setDetailModalMode] = useState('view'); // 'view' | 'edit'
  const [showSendModal, setShowSendModal] = useState(false);

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
    setSearchFilter,
    refreshInvoices,
  } = useInvoices();

  // Check for invoice ID in URL on mount or when invoices load
  useEffect(() => {
    const invoiceId = searchParams.get('id');
    if (invoiceId && invoices.length > 0 && !showDetailModal) {
      const invoice = invoices.find(inv => inv._id === invoiceId);
      if (invoice) {
        setSelectedInvoice(invoice);
        setDetailModalMode('view');
        setShowDetailModal(true);
      }
    }
  }, [searchParams, invoices, showDetailModal]);

  const stats = getStats();

  // Handle status filter change - updates the hook's filter state
  // The hook will automatically refetch when status changes
  const handleStatusFilterChange = (newStatus) => {
    setStatusFilter(newStatus);
  };

  // Handle search filter change - updates the hook's search filter
  // The hook will automatically refetch when search term changes (debounced)
  const handleSearchChange = (searchTerm) => {
    setSearchFilter(searchTerm);
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
    setDetailModalMode('view');
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
      setSelectedInvoice(invoice);
      setDetailModalMode('edit');
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to open invoice for editing:', error);
      toast.error('Failed to open invoice', {
        description: error.message
      });
    }
  };

  // Handle inline updates (date/amount) - updates directly without modal
  const handleInlineUpdate = async (updates) => {
    try {
      // Extract the invoice ID and pass only the changed fields
      const { _id, ...fieldsToUpdate } = updates;
      await updateInvoice(_id, fieldsToUpdate);
      toast.success('Invoice updated successfully');
    } catch (error) {
      console.error('Failed to update invoice:', error);
      toast.error('Failed to update invoice', {
        description: error.message
      });
      throw error;
    }
  };

  // Handle delete invoice - removes invoice after confirmation
  const handleDeleteInvoice = async (invoiceId) => {
    try {
      await deleteInvoice(invoiceId);
      // Don't show toast here - InvoiceDetailModal handles it
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      throw error; // Rethrow to let modal handle error display
    }
  };

  // Handle resend invoice - resends invoice email to client
  const handleResendInvoice = async (invoiceId) => {
    try {
      const result = await resendInvoice(invoiceId);
      // Don't show toast here - modal handles it
      return result;
    } catch (error) {
      console.error('Failed to resend invoice:', error);
      throw error;
    }
  };

  // Handle save invoice edits
  const handleSaveInvoice = async (invoiceId, updatedData) => {
    try {
      await updateInvoice(invoiceId, updatedData);
      // Close modal and refresh
      setShowDetailModal(false);
      setSelectedInvoice(null);
      await refreshInvoices();
      toast.success('Invoice updated successfully');
    } catch (error) {
      console.error('Failed to update invoice:', error);
      throw error;
    }
  };

  // Handle status update
  const handleStatusUpdate = async (invoiceId, newStatus) => {
    try {
      await updateInvoiceStatus(invoiceId, newStatus);
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
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Invoices</h1>
            <p className="text-muted-foreground">
              Manage project invoices and payments
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate('/dashboard/invoices/new')}
              className="bg-primary text-primary-foreground"
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
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-destructive font-semibold mb-1">Failed to load invoices</p>
              <p className="text-sm">
                {error.includes('network') || error.includes('fetch')
                  ? 'Check your network connection and try again.'
                  : error}
              </p>
            </div>
            <Button
              onClick={() => refreshInvoices()}
              variant="outline"
              size="sm"
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
          onSearchChange={handleSearchChange}
          onViewInvoice={handleViewInvoice}
          onDownloadInvoice={handleDownloadInvoice}
          onSendInvoice={handleSendInvoice}
          onPayInvoice={handlePayInvoice}
          onEditInvoice={handleEditInvoice}
          onInlineUpdate={handleInlineUpdate}
          onDeleteInvoice={handleDeleteInvoice}
          onResendInvoice={handleResendInvoice}
          onStatusUpdate={handleStatusUpdate}
          onRefresh={refreshInvoices}
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
          mode={detailModalMode}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedInvoice(null);
            setDetailModalMode('view');
            // Clear the URL query parameter
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('id');
            navigate({ search: newParams.toString() }, { replace: true });
          }}
          onSave={handleSaveInvoice}
          onDelete={handleDeleteInvoice}
          onResend={handleResendInvoice}
          onDownload={downloadInvoice}
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
