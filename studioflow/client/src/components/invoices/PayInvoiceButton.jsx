import { useState } from 'react';
import { Button } from '../ui/button';
import { CreditCard, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { loadRazorpayScript } from '../../lib/razorpayCheckout';

export default function PayInvoiceButton({ invoice, onPaymentSuccess, className }) {
  const [processing, setProcessing] = useState(false);

  const handlePayment = async () => {
    setProcessing(true);

    try {
      // Check if Razorpay is configured
      const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
      
      if (!razorpayKeyId) {
        toast.error('Payment gateway not configured', {
          description: 'Please contact support to enable online payments'
        });
        setProcessing(false);
        return;
      }

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Failed to load payment gateway');
        setProcessing(false);
        return;
      }

      // Call onPaymentSuccess which will create payment order and open Razorpay
      await onPaymentSuccess?.(invoice);

    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed', {
        description: error.message || 'Unable to process payment'
      });
    } finally {
      setProcessing(false);
    }
  };

  const canPay = invoice?.status === 'pending' && !invoice?.isLocal;

  if (!canPay) {
    return (
      <Button
        disabled
        variant="outline"
        className={`opacity-50 cursor-not-allowed ${className}`}
        title={
          invoice?.isLocal 
            ? 'Cannot pay local invoices' 
            : invoice?.status === 'paid' 
            ? 'Invoice already paid' 
            : 'Payment not available'
        }
      >
        <CreditCard className="w-4 h-4 mr-2" />
        Pay Invoice
      </Button>
    );
  }

  return (
    <Button
      onClick={handlePayment}
      disabled={processing}
      className={`bg-indigo-600 hover:bg-indigo-700 text-white ${className}`}
    >
      {processing ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4 mr-2" />
          Pay ₹{invoice?.total?.toFixed(2)}
          <ExternalLink className="w-3 h-3 ml-2 opacity-70" />
        </>
      )}
    </Button>
  );
}
