import mongoose from 'mongoose';

const TimeEntrySchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },

    description: {
        type: String,
        required: true,
        trim: true
    },

    startTime: {
        type: Date,
        required: true
    },

    endTime: {
        type: Date,
        required: true
    },

    // Cached duration in minutes to avoid constant recalculation
    durationMinutes: {
        type: Number,
        required: true,
        min: 0
    },

    billable: {
        type: Boolean,
        default: true
    },

    // Status workflow
    status: {
        type: String,
        enum: ['pending', 'invoiced', 'archived'],
        default: 'pending',
        index: true
    },

    // Link to generated invoice (once invoiced)
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProjectInvoice',
        default: null
    }
}, {
    timestamps: true
});

// Calculate duration before validation/saving if not provided (optional helper)
TimeEntrySchema.pre('validate', function (next) {
    if (this.startTime && this.endTime && !this.durationMinutes) {
        const diffMs = this.endTime - this.startTime;
        this.durationMinutes = Math.max(0, Math.floor(diffMs / 60000));
    }
    next();
});

const TimeEntry = mongoose.model('TimeEntry', TimeEntrySchema);
export default TimeEntry;
