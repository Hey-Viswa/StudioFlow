import mongoose from 'mongoose';

const NotificationSnapshotSchema = new mongoose.Schema({
    notificationId: mongoose.Schema.Types.ObjectId,
    type: String,
    title: String,
    message: String,
    link: String,
    createdAt: Date,
    data: mongoose.Schema.Types.Mixed
}, { _id: false });

const NotificationBatchSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    processAfter: {
        type: Date,
        required: true
    },
    // We store a simplified snapshot of the notifications to be sent
    notifications: [NotificationSnapshotSchema],
    retryCount: {
        type: Number,
        default: 0
    },
    error: String
}, {
    timestamps: true
});

// Index to find batches ready for processing
NotificationBatchSchema.index({ status: 1, processAfter: 1 });
NotificationBatchSchema.index({ userId: 1, status: 1 }); // To find pending batch for a user

const NotificationBatch = mongoose.model('NotificationBatch', NotificationBatchSchema);

export default NotificationBatch;
