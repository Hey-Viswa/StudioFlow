import mongoose from 'mongoose';

const NotificationPreferenceSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    channels: {
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: false },
        inApp: { type: Boolean, default: true }
    },
    triggers: {
        comments: {
            type: String,
            enum: ['all', 'mentions_only', 'none'],
            default: 'all'
        },
        tasks: {
            type: String,
            enum: ['all_in_project', 'assigned_only', 'none'],
            default: 'assigned_only'
        },
        files: { type: Boolean, default: true },
        project_updates: { type: Boolean, default: true }
    },
    dnd: {
        enabled: { type: Boolean, default: false },
        startTime: { type: String, default: '22:00' }, // 24h format
        endTime: { type: String, default: '08:00' },
        timezone: { type: String, default: 'UTC' },
        bypassForUrgent: { type: Boolean, default: true }
    },
    mutedProjects: [{
        type: String // projectIds
    }]
}, {
    timestamps: true
});

export default mongoose.model('NotificationPreference', NotificationPreferenceSchema);
