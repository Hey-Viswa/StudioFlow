import mongoose from 'mongoose';

const deletedInvoiceSchema = new mongoose.Schema({
  // Original invoice data
  originalInvoiceId: {
    type: String,
    required: true,
    index: true
  },
  invoiceNumber: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  projectTitle: String,
  client: {
    userId: String,
    name: String,
    email: String
  },
  items: [{
    title: String,
    description: String,
    quantity: Number,
    rate: Number,
    amount: Number
  }],
  subtotal: Number,
  tax: {
    percentage: Number,
    amount: Number
  },
  discount: {
    percentage: Number,
    amount: Number
  },
  total: Number,
  currency: String,
  status: String,
  issueDate: Date,
  dueDate: Date,
  paidAt: Date,
  notes: String,

  // Deletion metadata
  deletedBy: {
    type: String,
    required: true
  },
  deletedByName: String,
  deletedAt: {
    type: Date,
    default: Date.now,
    required: true,
    // TTL index - MongoDB will auto-delete documents 30 days after deletedAt
    expires: 2592000 // 30 days in seconds (30 * 24 * 60 * 60)
  },
  deleteReason: String,

  // Store full invoice data as backup
  fullInvoiceData: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
// deletedInvoiceSchema.index({ userId: 1 }); // Defined in schema
deletedInvoiceSchema.index({ deletedBy: 1 });
// deletedInvoiceSchema.index({ deletedAt: 1 }); // Defined in schema (TTL)
// deletedInvoiceSchema.index({ originalInvoiceId: 1 }); // Defined in schema

// Helper method to check if user can restore
deletedInvoiceSchema.methods.canRestore = function (userId) {
  return this.userId === userId || this.deletedBy === userId;
};

// Helper method to get days remaining before auto-deletion
deletedInvoiceSchema.methods.getDaysRemaining = function () {
  const now = new Date();
  const deleteDate = new Date(this.deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  const daysLeft = Math.ceil((deleteDate - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, daysLeft);
};

const DeletedInvoice = mongoose.model('DeletedInvoice', deletedInvoiceSchema);

export default DeletedInvoice;
