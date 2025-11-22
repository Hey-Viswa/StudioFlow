import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Button } from './ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createPaymentOrder, verifyPayment } from '../lib/projectInvoiceApi';

export default function PayInvoiceButton({ invoice, onPaymentSuccess }) {
  const { getToken } = useAuth();
  const [processing, setProcessing] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setProcessing(true);

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Failed to load payment gateway');
        setProcessing(false);
        return;
      }

      // Create order
      const { orderId, amount, currency, invoiceNumber } = await createPaymentOrder(
        invoice._id,
        getToken
      );

      // Initialize Razorpay
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: amount * 100, // Convert to paise
        currency: currency,
        name: 'StudioFlow',
        description: `Payment for ${invoiceNumber}`,
        order_id: orderId,
        
        handler: async function (response) {
          try {
            // Verify payment
            await verifyPayment(
              invoice._id,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              },
              getToken
            );

            toast.success('Payment successful!');
            onPaymentSuccess?.();

          } catch (error) {
            toast.error('Payment verification failed');
          } finally {
            setProcessing(false);
          }
        },

        prefill: {
          email: invoice.client.email || '',
          name: invoice.client.name || ''
        },

        theme: {
          color: '#6366f1'
        },

        modal: {
          ondismiss: function() {
            setProcessing(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

      razorpay.on('payment.failed', function (response) {
        toast.error(`Payment failed: ${response.error.description}`);
        setProcessing(false);
      });

    } catch (error) {
      toast.error(error.message || 'Failed to initiate payment');
      setProcessing(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={processing || invoice.status === 'paid'}
      className="w-full sm:w-auto"
    >
      {processing ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4 mr-2" />
          Pay ₹{invoice.total.toFixed(2)}
        </>
      )}
    </Button>
  );
}
