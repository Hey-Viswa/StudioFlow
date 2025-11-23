import { useState } from 'react';
import { Plus } from 'lucide-react';
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
  const {
    invoices,
    loading,
    createInvoice,
    sendInvoice,
    createPaymentOrder,
    verifyPayment,
    downloadInvoice,
    getStats
  } = useInvoices();

  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  const stats = getStats();

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

        {/* Invoice Table */}
        <InvoiceTable
          invoices={invoices}
          loading={loading}
          onViewInvoice={handleViewInvoice}
          onDownloadInvoice={handleDownloadInvoice}
          onSendInvoice={handleSendInvoice}
          onPayInvoice={handlePayInvoice}
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
          onDownload={() => handleDownloadInvoice(selectedInvoice)}
          onSend={() => {
            setShowDetailModal(false);
            setShowSendModal(true);
          }}
          onPay={() => {
            setShowDetailModal(false);
            handlePayInvoice(selectedInvoice);
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
