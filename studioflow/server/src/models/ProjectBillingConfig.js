import mongoose from 'mongoose';

const ProjectBillingConfigSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        unique: true,
        index: true
    },

    // Feature Flags for this specific project (Granular Rollout)
    features: {
        hourlyBilling: { type: Boolean, default: false },
        hybridBilling: { type: Boolean, default: false },
        autoDiscounts: { type: Boolean, default: false }
    },

    // Hourly Billing Settings
    hourlyRate: {
        type: Number,
        default: 0,
        min: 0
    },

    // Discount Rules (Applied at Invoice Generation)
    discounts: [{
        code: { type: String, required: true }, // e.g., "RETURNING_CLIENT"
        type: {
            type: String,
            enum: ['percentage', 'fixed'],
            default: 'percentage'
        },
        value: {
            type: Number,
            required: true,
            min: 0
        },
        active: { type: Boolean, default: true }
    }]
}, {
    timestamps: true
});

const ProjectBillingConfig = mongoose.model('ProjectBillingConfig', ProjectBillingConfigSchema);
export default ProjectBillingConfig;
