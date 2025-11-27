// Example integration for Payment Notifications
// Add this to your payment webhook handler

import { createNotification } from '../services/notificationService.js';

// Example: Razorpay Payment Webhook Handler
export const handleRazorpayWebhook = async (req, res) => {
  try {
    const { event, payload } = req.body;
    
    switch (event) {
      case 'payment.captured':
      case 'subscription.charged':
        await handlePaymentSuccess(payload);
        break;
        
      case 'payment.failed':
        await handlePaymentFailed(payload);
        break;
        
      case 'subscription.activated':
        await handleSubscriptionActivated(payload);
        break;
        
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(payload);
        break;
    }
    
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Handle successful payment
async function handlePaymentSuccess(payload) {
  const { payment, subscription } = payload;
  const amount = (payment.amount / 100).toFixed(2); // Convert paise to rupees
  
  // Get user from subscription
  const sub = await Subscription.findOne({ razorpaySubscriptionId: subscription.id });
  
  // ✅ NOTIFICATION: Payment received
  await createNotification({
    userId: sub.userId,
    type: 'payment-received',
    title: '💰 Payment Successful',
    message: `Your payment of ₹${amount} has been processed successfully`,
    link: '/dashboard/subscription',
    priority: 'high',
    sendEmail: true,
    meta: {
      amount,
      paymentId: payment.id,
      subscriptionId: subscription.id
    }
  });
}

// Handle failed payment
async function handlePaymentFailed(payload) {
  const { payment, subscription } = payload;
  const amount = (payment.amount / 100).toFixed(2);
  
  const sub = await Subscription.findOne({ razorpaySubscriptionId: subscription.id });
  
  // ✅ NOTIFICATION: Payment failed
  await createNotification({
    userId: sub.userId,
    type: 'payment-failed',
    title: '❌ Payment Failed',
    message: `Your payment of ₹${amount} could not be processed. Please update your payment method.`,
    link: '/dashboard/subscription',
    priority: 'urgent',
    sendEmail: true,
    meta: {
      amount,
      reason: payment.error_description,
      paymentId: payment.id
    }
  });
}

// Handle subscription activation
async function handleSubscriptionActivated(payload) {
  const { subscription } = payload;
  
  const sub = await Subscription.findOne({ razorpaySubscriptionId: subscription.id });
  
  // ✅ NOTIFICATION: Subscription activated
  await createNotification({
    userId: sub.userId,
    type: 'subscription-created',
    title: '🎉 Subscription Activated',
    message: `Welcome! Your ${sub.planName} plan is now active`,
    link: '/dashboard',
    priority: 'high',
    sendEmail: true,
    meta: {
      planName: sub.planName,
      subscriptionId: subscription.id
    }
  });
}

// Handle subscription cancellation
async function handleSubscriptionCancelled(payload) {
  const { subscription } = payload;
  
  const sub = await Subscription.findOne({ razorpaySubscriptionId: subscription.id });
  
  // ✅ NOTIFICATION: Subscription cancelled
  await createNotification({
    userId: sub.userId,
    type: 'subscription-expired',
    title: '⏰ Subscription Cancelled',
    message: 'Your subscription has been cancelled. We hope to see you again!',
    link: '/dashboard/subscription',
    priority: 'high',
    sendEmail: true,
    meta: {
      planName: sub.planName,
      cancelledAt: new Date()
    }
  });
}

// Example: Manual subscription renewal check
export async function checkExpiredSubscriptions() {
  const expiredSubs = await Subscription.find({
    status: 'active',
    expiryDate: { $lt: new Date() }
  });
  
  for (const sub of expiredSubs) {
    // Update status
    sub.status = 'expired';
    await sub.save();
    
    // ✅ NOTIFICATION: Subscription expired
    await createNotification({
      userId: sub.userId,
      type: 'subscription-expired',
      title: '⏰ Subscription Expired',
      message: `Your ${sub.planName} subscription has expired. Renew to continue using premium features.`,
      link: '/dashboard/subscription',
      priority: 'urgent',
      sendEmail: true
    });
  }
}

// Example: Invoice generation notification
export const generateInvoice = async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    
    // ... your invoice generation logic ...
    const invoice = await Invoice.create({ /* ... */ });
    
    // ✅ NOTIFICATION: Invoice generated
    await createNotification({
      userId: invoice.userId,
      type: 'invoice-generated',
      title: '📄 New Invoice',
      message: `Invoice #${invoice.invoiceNumber} has been generated`,
      link: `/dashboard/invoices/${invoice._id}`,
      priority: 'normal',
      sendEmail: true,
      meta: {
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount
      }
    });
    
    res.json({ success: true, invoice });
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ error: error.message });
  }
};
