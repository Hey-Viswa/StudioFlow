import mongoose from 'mongoose';

const trashSchema = new mongoose.Schema({
  // Original project data
  originalProjectId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  brief: String,
  ownerId: {
    type: String,
    required: true
  },
  members: [{
    userId: String,
    email: String,
    name: String,
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'client'],
      default: 'client'
    },
    joinedAt: Date
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'on-hold', 'cancelled'],
    default: 'active'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  dueDate: Date,

  // Razorpay payment info (if any)
  paymentInfo: {
    orderId: String,
    amount: Number,
    currency: String,
    status: String,
    paidAt: Date
  },

  // Trash-specific fields
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

  // Store full project data as backup
  fullProjectData: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
trashSchema.index({ ownerId: 1 });
trashSchema.index({ deletedBy: 1 });
// trashSchema.index({ deletedAt: 1 }); // Defined in schema (TTL)
trashSchema.index({ originalProjectId: 1 });

// Helper method to check if user can restore
trashSchema.methods.canRestore = function (userId) {
  return this.ownerId === userId || this.deletedBy === userId;
};

// Helper method to get days remaining before auto-deletion
trashSchema.methods.getDaysRemaining = function () {
  const now = new Date();
  const deleteDate = new Date(this.deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  const daysLeft = Math.ceil((deleteDate - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, daysLeft);
};

const Trash = mongoose.model('Trash', trashSchema);

export default Trash;
