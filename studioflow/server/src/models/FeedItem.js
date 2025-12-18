import mongoose from 'mongoose';

const feedItemSchema = new mongoose.Schema({
  userId: {
    type: String, // whose feed
    required: true,
    index: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    required: true,
    index: true
  },
  reason: {
    type: String,
    enum: ['followed_creator'],
    default: 'followed_creator'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

feedItemSchema.index({ userId: 1, createdAt: -1 });
feedItemSchema.index({ postId: 1 });

const FeedItem = mongoose.model('FeedItem', feedItemSchema);

export default FeedItem;
