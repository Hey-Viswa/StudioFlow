import mongoose from 'mongoose';

const DeviceTokenSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    platform: {
        type: String,
        enum: ['web', 'ios', 'android'],
        default: 'web'
    },
    userAgent: {
        type: String
    },
    lastUsedAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Update lastUsedAt on access
DeviceTokenSchema.methods.touch = function () {
    this.lastUsedAt = new Date();
    return this.save();
};

export default mongoose.model('DeviceToken', DeviceTokenSchema);
