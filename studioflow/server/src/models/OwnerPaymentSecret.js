import mongoose from 'mongoose';

const OwnerPaymentSecretSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
    unique: true
  },
  secretType: {
    type: String,
    enum: ['razorpay_api_secret'],
    required: true,
    default: 'razorpay_api_secret'
  },
  keyIdMasked: {
    type: String,
    default: null
  },
  encryptedSecret: {
    type: String,
    required: true
  },
  iv: {
    type: String,
    required: true
  },
  authTag: {
    type: String,
    required: true
  },
  fingerprint: {
    type: String,
    required: true
  },
  rotatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: String,
    default: 'system'
  },
  updatedBy: {
    type: String,
    default: 'system'
  },
  createdFromIp: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

OwnerPaymentSecretSchema.index({ ownerId: 1, secretType: 1 }, { unique: true });

export default mongoose.models.OwnerPaymentSecret || mongoose.model('OwnerPaymentSecret', OwnerPaymentSecretSchema);
