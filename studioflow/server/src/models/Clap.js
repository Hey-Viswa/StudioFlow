import mongoose from 'mongoose';

const clapSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
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

// Prevent duplicate claps per user/post
clapSchema.index({ userId: 1, postId: 1 }, { unique: true });

const Clap = mongoose.model('Clap', clapSchema);

export default Clap;
