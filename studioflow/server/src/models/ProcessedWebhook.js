import mongoose from 'mongoose';

const processedWebhookSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  eventType: {
    type: String,
    required: true
  },
  processedAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 7 // Auto-delete after 7 days
  }
});

const ProcessedWebhook = mongoose.model('ProcessedWebhook', processedWebhookSchema);

export default ProcessedWebhook;
