import mongoose from 'mongoose';

const projectFileSchema = new mongoose.Schema({
  // File identification
  fileId: {
    type: String,
    required: false, // Auto-generated in pre-save hook
    unique: true,
    index: true,
  },

  // Project association
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true,
  },

  // Uploader information
  uploaderId: {
    type: String,
    required: true,
    index: true,
  },

  uploaderName: {
    type: String,
    default: '',
  },

  // File metadata
  filename: {
    type: String,
    required: true,
  },

  originalFilename: {
    type: String,
    required: true,
  },

  mimeType: {
    type: String,
    required: true,
  },

  size: {
    type: Number,
    required: true,
    min: 0,
  },

  // Versioning
  version: {
    type: Number,
    required: true,
    default: 1,
    min: 1,
  },

  isFinal: {
    type: Boolean,
    default: false,
  },

  // Version history reference
  baseFileId: {
    type: String,
    default: null,
    index: true,
  },

  previousVersionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectFile',
    default: null,
  },

  // Storage information
  storageProvider: {
    type: String,
    enum: ['s3', 'r2', 'cloudinary'],
    required: true,
  },

  storageKey: {
    type: String,
    required: true,
  },

  bucket: {
    type: String,
    default: '',
  },

  // Access control
  visibility: {
    type: String,
    enum: ['private', 'project'],
    default: 'project',
  },

  // File status
  status: {
    type: String,
    enum: ['uploading', 'active', 'archived', 'deleted'],
    default: 'uploading',
  },

  deletedAt: {
    type: Date,
    default: null,
  },

  // Preview generation
  previewStorageKey: {
    type: String,
    default: null
  },

  previewState: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'not_applicable'],
    default: 'not_applicable'
  },

  // Upload tracking
  uploadStartedAt: {
    type: Date,
    default: Date.now,
  },

  uploadCompletedAt: {
    type: Date,
    default: null,
  },

  // Metadata
  description: {
    type: String,
    default: '',
  },

  tags: [{
    type: String,
  }],

  // File sharing for clients
  sharedWith: [{
    userId: {
      type: String,
      required: true,
    },
    shareToken: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
    },
    allowDownload: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    sharedBy: {
      type: String,
      required: true,
    },
    sharedAt: {
      type: Date,
      default: Date.now,
    },
    // Link to specific invoice (if gated)
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProjectInvoice',
      default: null
    }
  }],

  // Analytics
  downloadCount: {
    type: Number,
    default: 0,
  },

  lastAccessedAt: {
    type: Date,
    default: null,
  },

}, {
  timestamps: true,
});

// Compound indexes for efficient queries
projectFileSchema.index({ projectId: 1, status: 1 });
projectFileSchema.index({ projectId: 1, createdAt: -1 }); // Added for recent files query
projectFileSchema.index({ projectId: 1, baseFileId: 1, version: -1 });
projectFileSchema.index({ uploaderId: 1, createdAt: -1 });

// Pre-save hook to generate fileId if not present
projectFileSchema.pre('save', function (next) {
  if (!this.fileId) {
    this.fileId = `${this.projectId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Virtual for checking if file is image
projectFileSchema.virtual('isImage').get(function () {
  return this.mimeType.startsWith('image/');
});

// Virtual for checking if file is video
projectFileSchema.virtual('isVideo').get(function () {
  return this.mimeType.startsWith('video/');
});

// Virtual for checking if file can be previewed
projectFileSchema.virtual('isPreviewable').get(function () {
  return this.isImage || this.isVideo || this.mimeType === 'application/pdf';
});

// Static method to get next version number for a file
projectFileSchema.statics.getNextVersion = async function (projectId, baseFileId) {
  const latestVersion = await this.findOne({
    projectId,
    baseFileId,
    status: { $ne: 'deleted' },
  })
    .sort({ version: -1 })
    .select('version')
    .lean();

  return latestVersion ? latestVersion.version + 1 : 1;
};

// Static method to get file version history
projectFileSchema.statics.getVersionHistory = async function (projectId, baseFileId) {
  return this.find({
    projectId,
    baseFileId,
    status: { $ne: 'deleted' },
  })
    .sort({ version: -1 })
    .lean();
};

// Instance method to mark as completed
projectFileSchema.methods.markAsCompleted = function () {
  this.status = 'active';
  this.uploadCompletedAt = new Date();
  return this.save();
};

// Instance method to increment download count
projectFileSchema.methods.recordDownload = function () {
  this.downloadCount += 1;
  this.lastAccessedAt = new Date();
  return this.save();
};

const ProjectFile = mongoose.model('ProjectFile', projectFileSchema);

export default ProjectFile;
