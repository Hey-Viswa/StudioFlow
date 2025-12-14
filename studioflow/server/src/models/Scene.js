import mongoose from 'mongoose';

const SceneSchema = new mongoose.Schema({
    storyboardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Storyboard',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['note', 'image', 'file_ref', 'container', 'shape'],
        required: true,
        default: 'note'
    },
    // Position on infinite canvas
    position: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 }
    },
    // Dimensions
    dimensions: {
        width: { type: Number, default: 200 },
        height: { type: Number, default: 150 }
    },
    // Content depends on type
    content: {
        type: mongoose.Schema.Types.Mixed, // Text for notes, File URL for images, etc
        default: ''
    },
    // Reference to a ProjectFile if type === 'file_ref'
    fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProjectFile',
        default: null
    },
    metadata: {
        color: { type: String, default: '#ffffff' },
        label: { type: String, default: '' },
        tags: [String]
    },
    createdBy: {
        type: String, // Clerk ID
        required: true
    },
    updatedBy: {
        type: String // Clerk ID
    },
    // Ephemeral locking (Last-write-wins usually suffices, but this helps UI)
    lockedBy: {
        type: String,
        default: null
    },
    // Embedded comments for the scene
    comments: [{
        userId: String,
        userName: String,
        content: String,
        createdAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

// Index for fetching all scenes in a storyboard
SceneSchema.index({ storyboardId: 1 });

export default mongoose.model('Scene', SceneSchema);
