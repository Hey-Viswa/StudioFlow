import mongoose from 'mongoose';

const EntitlementSchema = new mongoose.Schema({
    userId: {
        type: String, // Clerk ID
        required: true,
        index: true
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    paymentThreadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PaymentThread',
        required: false
    },
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProjectInvoice',
        default: null
    },
    scope: {
        type: String,
        enum: ['project_download', 'source_files', 'view_only'],
        default: 'project_download'
    },
    grantedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: false
    },
    revokedAt: {
        type: Date,
        default: null
    },
    revocationReason: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Index for quick access checks
EntitlementSchema.index({ userId: 1, projectId: 1, revokedAt: 1 });

export default mongoose.model('Entitlement', EntitlementSchema);
