import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  subscriptionId: {
    type: String,
    required: true
  },
  planId: {
    type: String,
    required: true,
    enum: ['free', 'pro', 'studio']
  },
  planName: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  type: {
    type: String,
    enum: ['payment', 'refund', 'upgrade', 'downgrade'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending'
  },
  razorpayPaymentId: String,
  razorpayRefundId: String,
  billingPeriodStart: Date,
  billingPeriodEnd: Date,
  description: String,
  pdfUrl: {
    type: String,
    default: null
  },
  pdfGenerated: {
    type: Boolean,
    default: false
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date,
  metadata: {
    prorated: Boolean,
    unusedDays: Number,
    totalDays: Number,
    refundReason: String,
    userEmail: String,
    userName: String
  }
}, {
  timestamps: true
});

// Generate invoice number
invoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const count = await this.constructor.countDocuments();
    const timestamp = Date.now().toString().slice(-6);
    this.invoiceNumber = `INV-${timestamp}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
