import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  source: {
    type: String,
    default: 'direct',
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'subscribed', 'unsubscribed'],
    default: 'pending'
  },
  verificationToken: {
    type: String,
    default: null
  },
  marketingConsent: {
    type: Boolean,
    required: true,
    default: false
  },
  ip: {
    type: String,
    select: false // Privacy: Don't return by default
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

leadSchema.index({ email: 1 });
leadSchema.index({ status: 1 });

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
