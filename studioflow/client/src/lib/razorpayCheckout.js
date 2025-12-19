/**
 * Open Razorpay Checkout
 * @param {Object} options - Razorpay options
 * @param {string} options.orderId - Razorpay order ID
 * @param {number} options.amount - Amount in rupees
 * @param {string} options.currency - Currency code
 * @param {string} options.description - Payment description
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onFailure - Failure callback
 * @param {Object} options.prefill - Prefill data
 */
export const getRazorpayKey = () => {
  const useTest = import.meta.env.VITE_RAZORPAY_ENV === 'test';
  if (useTest) {
    return import.meta.env.VITE_RAZORPAY_KEY_ID_TEST || import.meta.env.VITE_RAZORPAY_KEY_ID;
  }
  return import.meta.env.VITE_RAZORPAY_KEY_ID || import.meta.env.VITE_RAZORPAY_KEY_ID_TEST;
};

export const openRazorpayCheckout = ({
  orderId,
  amount,
  currency = 'INR',
  description,
  onSuccess,
  onFailure,
  prefill = {}
}) => {
  const key = getRazorpayKey();

  if (!key) {
    onFailure?.({ message: 'Payment gateway not configured' });
    return;
  }

  const options = {
    key,
    amount: amount * 100, // Convert to paise
    currency: currency,
    name: 'StudioFlow',
    description: description,
    order_id: orderId,
    
    handler: function (response) {
      onSuccess?.(response);
    },
    
    prefill: {
      email: prefill.email || '',
      name: prefill.name || '',
      contact: prefill.contact || ''
    },
    
    theme: {
      color: '#6366f1'
    },
    
    modal: {
      ondismiss: function() {
        onFailure?.({ dismissed: true });
      }
    }
  };

  const razorpay = new window.Razorpay(options);
  razorpay.open();

  razorpay.on('payment.failed', function (response) {
    onFailure?.(response.error);
  });
};

/**
 * Load Razorpay script dynamically
 * @returns {Promise<boolean>}
 */
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    // Check if already loaded
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};
