import mongoose from 'mongoose';

const blogCommentSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

blogCommentSchema.index({ postId: 1, createdAt: -1 });

const BlogComment = mongoose.model('BlogComment', blogCommentSchema);

export default BlogComment;
