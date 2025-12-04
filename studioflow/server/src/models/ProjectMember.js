import mongoose from 'mongoose';

const ProjectMemberSchema = new mongoose.Schema({
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
    email: {
        type: String,
        default: ''
    },
    role: {
        type: String,
        enum: ['owner', 'team_member', 'client'],
        required: true
    },
    permissions: [{
        type: String
    }],
    status: {
        type: String,
        enum: ['invited', 'active', 'removed'],
        default: 'invited'
    },
    joinedAt: {
        type: Date,
        default: null
    },
    invitedBy: {
        type: String, // Clerk ID
        required: true
    }
}, {
    timestamps: true
});

// Compound index to ensure a user is only added once per project
ProjectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });
ProjectMemberSchema.index({ userId: 1, role: 1 }); // Added for querying user's projects by role

export default mongoose.model('ProjectMember', ProjectMemberSchema);
