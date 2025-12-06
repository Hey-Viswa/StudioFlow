import mongoose from 'mongoose';

const projectInvoiceSchema = new mongoose.Schema({
  // User who created the invoice (video editor/project owner)
  userId: {
    type: String,
    required: true,
    index: true
  },

  // Project this invoice belongs to
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    required: true,
    index: true
  },

  // Link to Payment Thread (Milestone/Hourly request)
  paymentThreadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentThread',
    default: null,
    index: true
  },

  // Entitlement Key: If true, client has access to deliverables
  accessGranted: {
    type: Boolean,
    default: false
  },

  // Access Scope
  accessType: {
    type: String,
    enum: ['all', 'specific_files'],
    default: 'all'
  },

  // Linked Files (for specific_files access)
  linkedFileIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectFile'
  }],

  // Versioning and Finalization
  version: {
    type: Number,
    default: 1
  },

  revisionHistory: [{
    version: Number,
    changedBy: String, // User ID
    changedAt: { type: Date, default: Date.now },
    changes: mongoose.Schema.Types.Mixed // Diff or summary of changes
  }],

  immutableSnapshot: {
    type: mongoose.Schema.Types.Mixed, // Stores the full invoice object at the time of sending
    default: null
  },

  isFinalized: {
    type: Boolean,
    default: false
  },

  projectTitle: {
    type: String,
    default: ''
  },

  // Auto-generated invoice number
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true
  },

  // Client details (from project members)
  client: {
    userId: String,
    name: String,
    email: String,
    gstin: String // Client's GSTIN
  },

  // Sender's GSTIN (Optional, for this specific invoice)
  gstin: {
    type: String,
    default: ''
  },

  // Invoice items (tasks/services)
  items: [{
    title: {
      type: String,
      required: true
    },
    description: String,
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    rate: {
      type: Number,
      required: true,
      min: 0
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    }
  }],

  // Financial details
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },

  // Amount tracking
  amountPaid: {
    type: Number,
    default: 0,
    min: 0
  },

  tax: {
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    amount: {
      type: Number,
      default: 0
    }
  },

  discount: {
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    amount: {
      type: Number,
      default: 0
    }
  },

  total: {
    type: Number,
    required: true,
    default: 0
  },

  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP']
  },

  // Payment status
  status: {
    type: String,
    enum: ['draft', 'pending', 'sent', 'partially_paid', 'paid', 'overdue', 'failed', 'cancelled', 'refunded'],
    default: 'draft'
  },

  // Immutability + idempotency
  isImmutable: {
    type: Boolean,
    default: false
  },

  lastTransitionId: {
    type: String,
    default: null
  },

  sentAt: {
    type: Date,
    default: null
  },

  accessDurationDays: {
    type: Number,
    default: 90 // 3 months default access
  },

  // Razorpay integration
  razorpayOrderId: {
    type: String,
    default: null
  },

  razorpayPaymentId: {
    type: String,
    default: null
  },

  razorpaySignature: {
    type: String,
    default: null
  },

  // Dates
  issueDate: {
    type: Date,
    default: Date.now
  },

  dueDate: {
    type: Date,
    required: true
  },

  paidAt: {
    type: Date,
    default: null
  },

  // Notes
  notes: {
    type: String,
    default: ''
  },

  // PDF
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

  emailSentAt: {
    type: Date,
    default: null
  },

  resendCount: {
    type: Number,
    default: 0
  },

  lastResentAt: {
    type: Date,
    default: null
  },

  autoSentAt: {
    type: Date,
    default: null
  },

  statusHistory: [{
    from: String,
    to: String,
    at: { type: Date, default: Date.now },
    reason: String,
    actorId: String,
    source: String,
    idempotencyKey: String
  }],

  auditLog: [{
    eventType: String,
    actorId: String,
    fromStatus: String,
    toStatus: String,
    payload: mongoose.Schema.Types.Mixed,
    source: String,
    reason: String,
    at: { type: Date, default: Date.now },
    idempotencyKey: String
  }]

}, {
  timestamps: true
});

// Indexes for performance
projectInvoiceSchema.index({ 'client.userId': 1, projectId: 1, status: 1 }); // Optimized for client dashboard
projectInvoiceSchema.index({ userId: 1, status: 1 }); // Optimized for owner dashboard

// Auto-generate invoice number: PINV-{timestamp}-{count}
projectInvoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const count = await this.constructor.countDocuments();
    const timestamp = Date.now().toString().slice(-6);
    this.invoiceNumber = `PINV-${timestamp}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Calculate totals before saving
projectInvoiceSchema.pre('save', function (next) {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);

  // Calculate tax amount
  this.tax.amount = (this.subtotal * (this.tax.percentage || 0)) / 100;

  // Calculate discount amount
  this.discount.amount = (this.subtotal * (this.discount.percentage || 0)) / 100;

  // Calculate total
  this.total = this.subtotal + this.tax.amount - this.discount.amount;

  next();
});

const ProjectInvoice = mongoose.model('ProjectInvoice', projectInvoiceSchema);
export default ProjectInvoice;
