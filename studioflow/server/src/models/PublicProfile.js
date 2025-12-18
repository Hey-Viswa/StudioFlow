import mongoose from 'mongoose';

const publicProfileSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    lowercase: true,
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  displayName: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    trim: true,
    maxLength: 160
  },
  avatarUrl: {
    type: String
  },
  socialLinks: {
    twitter: String,
    github: String,
    linkedin: String,
    website: String,
    instagram: String
  },
  isPublic: {
    type: Boolean,
    default: false,
    index: true
  },
  followersCount: {
    type: Number,
    default: 0,
    min: 0
  },
  postsCount: {
    type: Number,
    default: 0,
    min: 0
  },
  featuredPostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual populate for user details if needed (though we store most here)
publicProfileSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: 'clerkId',
  justOne: true
});

const PublicProfile = mongoose.model('PublicProfile', publicProfileSchema);

export default PublicProfile;
