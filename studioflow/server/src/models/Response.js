import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema({
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    required: true,
    index: true
  },
  userId: {
    type: String, // Clerk ID
    required: true,
    index: true
  },
  body: {
    type: String,
    required: true,
    maxlength: 1000
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId, // For nested replies (1 level deep enforced in logic)
    ref: 'Response',
    default: null,
    index: true
  },
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: String // Array of user IDs who liked
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'hidden', 'deleted'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true
});

// Virtual populate for author profile
responseSchema.virtual('author', {
  ref: 'PublicProfile',
  localField: 'userId',
  foreignField: 'userId',
  justOne: true
});

// Virtual populate for replies
responseSchema.virtual('replies', {
  ref: 'Response',
  localField: '_id',
  foreignField: 'parentId',
  options: { sort: { createdAt: 1 } } // Oldest first for comments usually
});

// Ensure virtuals are included in JSON
responseSchema.set('toJSON', { virtuals: true });
responseSchema.set('toObject', { virtuals: true });

const Response = mongoose.model('Response', responseSchema);

export default Response;
