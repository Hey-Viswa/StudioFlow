// server/src/models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: { 
        type: String, 
        required: [true, 'Email is required'], 
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    passwordHash: { 
        type: String, 
        required: true,
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
            enum: ['active', 'inactive', 'cancelled', 'expired', 'created'],
            default: 'inactive'
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
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ createdAt: -1 });

export default mongoose.models.User || mongoose.model('User', UserSchema);
