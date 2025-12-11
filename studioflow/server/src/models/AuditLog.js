import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
    userId: {
        type: String, // Clerk User ID
        required: true,
        index: true
    },
    action: {
        type: String,
        required: true,
        index: true
    },
    resourceType: {
        type: String,
        enum: ['subscription', 'invoice', 'payment', 'user', 'system', 'project', 'file', 'entitlement', 'comment', 'task'],
        required: true
    },
    resourceId: {
        type: String,
        required: false,
        index: true
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: null,
        index: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ipAddress: {
        type: String,
        default: null
    },
    userAgent: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['success', 'failure'],
        default: 'success'
    },
    metadata: {
        type: Map,
        of: String
    }
}, {
    timestamps: true
});

// TTL index to automatically delete logs after 1 year (optional, good for compliance)
// AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
