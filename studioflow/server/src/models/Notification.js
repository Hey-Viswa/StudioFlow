import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  recipientId: {
    type: String,
    required: true
  },
  actorId: {
    type: String,
    required: true
  },
  resourceId: {
    type: String,
    required: true,
    index: true
  },
  resourceType: {
    type: String,
    enum: ['project', 'task', 'comment', 'invoice', 'file'],
    required: true
  },
  type: {
    type: String,
    enum: ['mention', 'assigned', 'status_change', 'comment_created', 'file_uploaded', 'invoice_created', 'invoice_paid', 'project_needs_revision', 'project_finalized', 'ownership_transfer_request', 'ownership_transfer_accepted'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    url: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  category: {
    type: String,
    enum: ['urgent', 'action', 'info', 'system'],
    default: 'info'
  },
  groupId: {
    type: String, // For collapsing similar notifications
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 30 // Auto-delete after 30 days
  }
}, {
  timestamps: true
});

// Indexes for common queries
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, category: 1 });

export default mongoose.model('Notification', NotificationSchema);
