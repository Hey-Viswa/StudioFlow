import mongoose from 'mongoose';

const WebhookEventSchema = new mongoose.Schema({
    eventId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    provider: {
        type: String,
        enum: ['razorpay', 'stripe'],
        default: 'razorpay',
        required: true
    },
    eventType: {
        type: String,
        required: true
    },
    payload: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processed', 'failed', 'ignored'],
        default: 'pending',
        index: true
    },
    processingError: {
        type: String,
        default: null
    },
    processedAt: {
        type: Date,
        default: null
    },
    attempts: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for finding pending events to retry
WebhookEventSchema.index({ status: 1, createdAt: 1 });

export default mongoose.models.WebhookEvent || mongoose.model('WebhookEvent', WebhookEventSchema);
