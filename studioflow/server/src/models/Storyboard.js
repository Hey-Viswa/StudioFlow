import mongoose from 'mongoose';

const StoryboardSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        unique: true, // One storyboard per project
        index: true
    },
    createdBy: {
        type: String, // Clerk User ID
        required: true
    },
    settings: {
        defaultZoom: {
            type: Number,
            default: 1.0
        },
        backgroundColor: {
            type: String,
            default: '#1e1e1e' 
        },
        gridEnabled: {
            type: Boolean,
            default: true
        }
    },
    activeUsers: [{
        userId: String,
        lastActiveAt: Date
    }]
}, {
    timestamps: true
});

export default mongoose.model('Storyboard', StoryboardSchema);
