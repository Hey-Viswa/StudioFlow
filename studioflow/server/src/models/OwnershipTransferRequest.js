import mongoose from 'mongoose';

const OwnershipTransferRequestSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    currentOwnerId: {
        type: String,
        required: true
    },
    newOwnerId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'cancelled'],
        default: 'pending'
    },
    expiresAt: {
        type: Date,
        required: true
    }
}, {
    timestamps: true
});

// Index to find pending requests for a user
OwnershipTransferRequestSchema.index({ newOwnerId: 1, status: 1 });

export default mongoose.model('OwnershipTransferRequest', OwnershipTransferRequestSchema);
