import mongoose from 'mongoose';

const ShadowPaymentRecordSchema = new mongoose.Schema({
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectInvoice', index: true, required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  wouldUseRail: { type: String, enum: ['v2'], default: 'v2' },
  reason: { type: String, required: true },
  amount: { type: Number, required: false },
  currency: { type: String, required: false },
  ownerShare: { type: Number, required: false },
  platformFee: { type: Number, required: false },
  missing: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 14 }
});

const ShadowPaymentRecord = mongoose.model('ShadowPaymentRecord', ShadowPaymentRecordSchema);
export default ShadowPaymentRecord;
