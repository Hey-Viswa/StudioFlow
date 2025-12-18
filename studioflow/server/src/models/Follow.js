import mongoose from 'mongoose';

const followSchema = new mongoose.Schema({
  followerId: {
    type: String, // Clerk ID of the follower
    required: true,
    index: true
  },
  followingId: {
    type: String, // Clerk ID of the user being followed
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// compound index to ensure unique relationships
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

const Follow = mongoose.model('Follow', followSchema);

export default Follow;
