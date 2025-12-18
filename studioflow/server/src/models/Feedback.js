import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  userId: {
    type: String, // Can be null for anonymous, or Clerk ID
    default: null,
    index: true
  },
  type: {
    type: String,
    enum: ['bug', 'feature', 'general', 'love'],
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  message: {
    type: String,
    required: true,
    maxlength: 2000
  },
  pageUrl: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['new', 'read', 'archived'],
    default: 'new',
    index: true
  }
}, {
  timestamps: true
});

feedbackSchema.index({ createdAt: -1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;
