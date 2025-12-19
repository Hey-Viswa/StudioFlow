import Razorpay from 'razorpay';
import './razorpayEnv.js';

// Initialize Razorpay instance
let razorpayInstance = null;

try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('✓ Razorpay initialized successfully');
  } else {
    console.warn('⚠️  Razorpay credentials not configured');
  }
} catch (error) {
  console.error('✗ Razorpay initialization failed:', error);
}

export const razorpay = razorpayInstance;
