
import mongoose from 'mongoose';

const showcaseItemSchema = new mongoose.Schema({
  // Link to original (for reference only, verify auth before using)
  originalFileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectFile',
    required: true,
    index: true
  },
  
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },

  // Public Access Token (slug)
  slug: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Visuals (Derived/Separate from original)
  // These should point to PUBLIC assets (watermarked or optimized), NOT the secure original URL
  previewUrl: {
    type: String,
    required: true
  },
  
  thumbnailUrl: {
    type: String,
    default: null
  },

  // Metadata for Portfolio
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  description: {
    type: String,
    maxlength: 500
  },
  
  tags: [{
    type: String
  }],

  // Before/After Support
  comparisonFileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectFile',
    default: null
  },

  // Security & State
  isPublished: {
    type: Boolean,
    default: false,
    index: true
  },
  
  publishedAt: {
    type: Date,
    default: null
  },
  
  publishedBy: {
    type: String,
    required: true
  },
  
  views: {
    type: Number,
    default: 0
  }

}, {
  timestamps: true
});

// Indexes
showcaseItemSchema.index({ slug: 1, isPublished: 1 }); // Public query index
showcaseItemSchema.index({ projectId: 1, isPublished: 1 }); // Project portfolio index

const ShowcaseItem = mongoose.model('ShowcaseItem', showcaseItemSchema);
export default ShowcaseItem;
