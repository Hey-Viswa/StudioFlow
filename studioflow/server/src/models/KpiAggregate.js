import mongoose from 'mongoose';

const kpiAggregateSchema = new mongoose.Schema({
    // Users involved
    userId: {
        type: String, // Clerk User ID
        required: true,
        index: true
    },

    // Role Context: 'owner' (Revenue) or 'client' (Spending)
    role: {
        type: String,
        enum: ['owner', 'client'],
        required: true
    },

    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },

    // Time Period
    periodType: {
        type: String,
        enum: ['day', 'month', 'year', 'all_time'],
        required: true
    },

    periodStart: {
        type: Date,
        required: true
    },

    // Metrics
    revenueIncoming: {
        type: Number,
        default: 0
    },

    expenseOutgoing: {
        type: Number,
        default: 0
    },

    revenueRefunded: {
        type: Number,
        default: 0
    },

    revenueNet: {
        type: Number,
        default: 0
    },

    invoiceCount: {
        type: Number,
        default: 0
    },

    lastUpdatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index for fast lookups and unique constraints
kpiAggregateSchema.index({ userId: 1, projectId: 1, role: 1, periodType: 1, periodStart: 1 }, { unique: true });

const KpiAggregate = mongoose.model('KpiAggregate', kpiAggregateSchema);

export default KpiAggregate;
