import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  authorId: {
    type: String,
    required: true,
    index: true
  },
  authorName: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true,
    maxlength: 5000
  },
  // Threading support
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
    index: true
  },
  threadDepth: {
    type: Number,
    default: 0,
    max: 2 // Limit to 2 levels (original -> reply -> nested reply)
  },
  // Mentions
  mentions: [{
    userId: String,
    name: String
  }],
  // Reactions
  reactions: [{
    userId: String,
    emoji: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Attachments
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'file', 'link']
    },
    url: String,
    filename: String,
    size: Number,
    mimeType: String
  }],
  // Status
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for performance
messageSchema.index({ projectId: 1, createdAt: -1 });
messageSchema.index({ projectId: 1, parentId: 1, createdAt: -1 });
messageSchema.index({ authorId: 1, createdAt: -1 });
messageSchema.index({ 'mentions.userId': 1 });

// Virtual for reply count
messageSchema.virtual('replyCount', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'parentId',
  count: true
});

// Ensure virtuals are included when converting to JSON
messageSchema.set('toJSON', { virtuals: true });
messageSchema.set('toObject', { virtuals: true });

const Message = mongoose.model('Message', messageSchema);

export default Message;
