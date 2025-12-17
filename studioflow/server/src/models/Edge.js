import mongoose from 'mongoose';

const EdgeSchema = new mongoose.Schema({
    storyboardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Storyboard',
        required: true,
        index: true
    },
    sourceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Scene',
        required: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Scene',
        required: true
    },
    type: {
        type: String,
        enum: ['default', 'dashed', 'conditional', 'return'],
        default: 'default'
    },
    label: {
        type: String,
        default: ''
    },
    // Control points for curved arrows
    points: [{
        x: Number,
        y: Number
    }],
    animated: {
        type: Boolean,
        default: false
    },
    zIndex: {
        type: Number,
        default: 0
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: String, // Clerk ID
        required: true
    }
}, {
    timestamps: true
});

// Index for efficiently fetching potential broken links if scenes are deleted
EdgeSchema.index({ sourceId: 1 });
EdgeSchema.index({ targetId: 1 });
EdgeSchema.index({ storyboardId: 1 });

export default mongoose.model('Edge', EdgeSchema);
