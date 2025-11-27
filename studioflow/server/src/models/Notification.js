import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'payment_success',
      'payment_failed',
      'invoice_created',
      'invoice_paid',
      'comment_added',
      'comment_reply',
      'comment_mention',
      'project_created',
      'project_updated',
      'project_revision',
      'project_approved',
      'project_completed',
      'member_joined',
      'task_assigned',
      'task_completed',
      'file_uploaded',
      'subscription_expiring',
      'subscription_expired',
      'system'
    ]
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  link: {
    type: String,
    default: null
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  icon: {
    type: String,
    default: 'bell'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  category: {
    type: String,
    enum: ['project', 'task', 'comment', 'invoice', 'payment', 'subscription', 'system', 'general'],
    default: 'general'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  idempotencyKey: {
    type: String,
    sparse: true, // Allow null but create index for non-null values
    index: true
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for performance
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ idempotencyKey: 1, createdAt: -1 }, { sparse: true });

// Auto-delete old read notifications after 90 days
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60, partialFilterExpression: { read: true } }
);

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
