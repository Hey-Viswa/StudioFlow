import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        default: null,
        index: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    userName: {
        type: String,
        default: ''
    },
    userEmail: {
        type: String,
        default: ''
    },
    content: {
        type: String,
        required: true
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null,
        index: true
    },
    category: {
        type: String,
        enum: ['general', 'important', 'feedback', 'client_note', 'internal'],
        default: 'general'
    },
    reactions: {
        type: Map,
        of: [String],
        default: () => new Map()
    },
    attachments: [{
        filename: String,
        url: String,
        mimeType: String,
        size: Number
    }],
    mentions: [{
        userId: String,
        userName: String
    }],
    isResolved: {
        type: Boolean,
        default: false
    },
    resolvedBy: {
        type: String,
        default: null
    },
    resolvedAt: {
        type: Date,
        default: null
    },
    isSystemMessage: {
        type: Boolean,
        default: false
    },
    edited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Indexes for performance
CommentSchema.index({ projectId: 1, createdAt: -1 }); // Fetch project comments
CommentSchema.index({ taskId: 1, createdAt: -1 }); // Fetch task comments


export default mongoose.model('Comment', CommentSchema);
