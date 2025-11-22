// server/src/models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    clerkUserId: {
        type: String,
        required: [true, 'Clerk User ID is required'],
        unique: true,
        index: true
    },
    name: { 
        type: String, 
        required: false,
        trim: true,
        default: '',
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: { 
        type: String, 
        required: false,
        lowercase: true,
        trim: true,
        default: '',
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    passwordHash: { 
        type: String, 
        required: false,
        select: false // Don't include password hash by default in queries
    },
    role: { 
        type: String, 
        enum: {
            values: ['editor', 'client', 'admin'],
            message: '{VALUE} is not a valid role'
        },
        default: 'editor' 
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    subscription: {
        plan: {
            type: String,
            enum: ['free', 'pro', 'studio'],
            default: 'free'
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'cancelled', 'expired', 'created', 'paused', 'payment_failed', 'pending', 'scheduled_downgrade'],
            default: 'active'
        },
        razorpayCustomerId: {
            type: String,
            default: null
        },
        razorpaySubscriptionId: {
            type: String,
            default: null
        },
        razorpayOrderId: {
            type: String,
            default: null
        },
        razorpayPaymentId: {
            type: String,
            default: null
        },
        subscriptionStartDate: {
            type: Date,
            default: null
        },
        subscriptionEndDate: {
            type: Date,
            default: null
        },
        nextBillingDate: {
            type: Date,
            default: null
        },
        autoRenew: {
            type: Boolean,
            default: false
        },
        lastStatusChange: {
            type: Date,
            default: Date.now
        },
        cancelledAt: {
            type: Date,
            default: null
        },
        cancelReason: {
            type: String,
            default: null
        }
    }
}, { 
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            delete ret.passwordHash;
            return ret;
        }
    }
});

// Indexes for performance
UserSchema.index({ clerkUserId: 1 }, { unique: true });
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ createdAt: -1 });

export default mongoose.models.User || mongoose.model('User', UserSchema);
