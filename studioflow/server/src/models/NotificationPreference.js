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
    // Phase 3: Automation & Productivity Additions
    // Global Mute Settings
    mutes: {
        marketing: { type: Boolean, default: false },
        system: { type: Boolean, default: false }
    },

    // Digest Configuration
    digest: {
        emailFrequency: {
            type: String,
            enum: ['realtime', 'daily', 'weekly'],
            default: 'realtime'
        },
        groupingWindowMinutes: {
            type: Number,
            default: 15,
            min: 1,
            max: 1440 // 24 hours
        }
    },

    // Advanced Project Settings (Replaces simple mutedProjects string array over time)
    projectSettings: [{
        projectId: {
            type: String, // standardized on String for IDs if needed, or Schema.Types.ObjectId
            required: true
        },
        muted: { type: Boolean, default: false },
        mentionsOnly: { type: Boolean, default: false }
    }]
}, {
    timestamps: true
});

// Index for getting user prefs quickly
NotificationPreferenceSchema.index({ userId: 1 });

export default mongoose.model('NotificationPreference', NotificationPreferenceSchema);
