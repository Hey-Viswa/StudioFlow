import mongoose from 'mongoose';

const contentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  type: {
    type: String,
    enum: ['blog', 'changelog'],
    required: true,
    index: true
  },
  // Block-based representation for editor-friendly, safe rendering
  blocks: [{
    id: { type: String, required: true },
    type: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} }
  }],
  // Legacy field kept for backward compatibility during migration
  content: {
    type: String, // Markdown or HTML legacy payload
    required: false
  },
  excerpt: {
    type: String,
    maxlength: 300
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  author: {
    type: String,
    default: 'StudioFlow Team'
  },
  coverImage: {
    type: String,
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft',
    index: true
  },
  version: {
    type: Number,
    default: 1,
    min: 1
  },
  publishedAt: {
    type: Date,
    default: null
  },
  clapCount: {
    type: Number,
    default: 0,
    min: 0
  },
  commentCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

contentSchema.index({ publishedAt: -1 });
contentSchema.index({ type: 1, status: 1 });
contentSchema.index({ userId: 1, status: 1, updatedAt: -1 });
contentSchema.index({ userId: 1, publishedAt: -1 });

contentSchema.virtual('authorProfile', {
  ref: 'PublicProfile',
  localField: 'userId',
  foreignField: 'userId',
  justOne: true
});

// Ensure virtuals are included in JSON
contentSchema.set('toJSON', { virtuals: true });
contentSchema.set('toObject', { virtuals: true });

const Content = mongoose.model('Content', contentSchema);

export default Content;
