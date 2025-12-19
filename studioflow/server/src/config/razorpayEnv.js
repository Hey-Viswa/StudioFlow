// Normalize Razorpay credentials for the current environment.
// Only switch to test when explicitly requested via RAZORPAY_ENV=test.
const useTestKeys = process.env.RAZORPAY_ENV === 'test';

if (useTestKeys) {
  process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID_TEST;
  process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET_TEST;
  if (process.env.RAZORPAY_WEBHOOK_SECRET_TEST || process.env.RAZORPAY_KEY_SECRET_TEST) {
    process.env.RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET_TEST || process.env.RAZORPAY_KEY_SECRET_TEST;
  }
  console.log('ℹ️ Razorpay configured with TEST keys');
}

export const isUsingTestRazorpayKeys = useTestKeys;
