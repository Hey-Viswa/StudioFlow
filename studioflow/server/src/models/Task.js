import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: [100, 'Title must be 100 characters or less']
    },
    description: {
        type: String,
        default: ''
    },

    // Assignment
    assigneeId: {
        type: String,
        required: false,
        index: true
    },
    assigneeName: {
        type: String, // Cached for display
        default: ''
    },
    assignedBy: {
        type: String, // User ID who created/assigned
        required: true
    },

    // Status & Approval Workflow
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'in-review', 'changes-requested', 'approved', 'completed'],
        default: 'pending',
        index: true
    },
    approvalStatus: {
        type: String,
        enum: ['none', 'pending', 'changes_requested', 'approved'],
        default: 'none'
    },
    reviewers: [{
        userId: String,
        name: String,
        status: {
            type: String,
            enum: ['pending', 'approved', 'changes_requested'],
            default: 'pending'
        },
        comment: String,
        reviewedAt: Date
    }],

    // Revision Management
    isRevisionTask: {
        type: Boolean,
        default: false
    },
    revisionOf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task', // Links back to the original task that requested changes
        default: null
    },
    linkedFileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProjectFile',
        default: null
    },

    // Metadata
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    dueDate: {
        type: Date
    },
    tags: [String],

    // Integrations
    googleCalendarEventId: {
        type: String,
        default: null
    },

    completedAt: {
        type: Date
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Indexes
TaskSchema.index({ projectId: 1, status: 1 });
TaskSchema.index({ assigneeId: 1, status: 1 });
TaskSchema.index({ revisionOf: 1 }); // For finding revision chains

export default mongoose.model('Task', TaskSchema);
