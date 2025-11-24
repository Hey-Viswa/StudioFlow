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
    index: true
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
    email: String
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
    enum: ['draft', 'pending', 'paid', 'failed', 'cancelled'],
    default: 'draft'
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
  }
  
}, {
  timestamps: true
});

// Auto-generate invoice number: PINV-{timestamp}-{count}
projectInvoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const count = await this.constructor.countDocuments();
    const timestamp = Date.now().toString().slice(-6);
    this.invoiceNumber = `PINV-${timestamp}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Calculate totals before saving
projectInvoiceSchema.pre('save', function(next) {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
  
  // Calculate tax amount
  if (this.tax.percentage > 0) {
    this.tax.amount = (this.subtotal * this.tax.percentage) / 100;
  }
  
  // Calculate discount amount
  if (this.discount.percentage > 0) {
    this.discount.amount = (this.subtotal * this.discount.percentage) / 100;
  }
  
  // Calculate total
  this.total = this.subtotal + this.tax.amount - this.discount.amount;
  
  next();
});

const ProjectInvoice = mongoose.model('ProjectInvoice', projectInvoiceSchema);
export default ProjectInvoice;
