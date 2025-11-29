import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, 'Title must be 50 characters or less']
  },
  brief: {
    type: String,
    default: '',
    maxlength: [100, 'Brief must be 100 characters or less']
  },
  ownerId: {
    type: String,
    required: true,
    index: true
  },
  members: [{
    userId: {
      type: String,
      required: true
    },
    email: {
      type: String,
      default: ''
    },
    name: {
      type: String,
      default: ''
    },
    role: {
      type: String,
      enum: ['owner', 'client'],
      default: 'client'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'on-hold', 'archived', 'needs-revision', 'finalized'],
    default: 'active'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  dueDate: {
    type: Date
  },
  finalizedAt: {
    type: Date,
    default: null
  },
  tasks: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    assignedTo: {
      userId: String,
      name: String,
      email: String
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending'
    },
    dueDate: {
      type: Date
    },
    googleCalendarEventId: {
      type: String,
      default: null
    },
    createdBy: {
      userId: String,
      name: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date,
      default: null
    }
  }],
  comments: [{
    userId: {
      type: String,
      required: true
    },
    userName: {
      type: String,
      default: ''
    },
    userEmail: {
      type: String,
      default: ''
    },
    text: {
      type: String,
      required: true
    },
    parentId: {
      type: String,
      default: null
    },
    reactions: {
      type: Map,
      of: [String],
      default: () => new Map()
    },
    attachments: [{
      filename: String,
      url: String,
      mimeType: String,
      size: Number
    }],
    mentions: [{
      userId: String,
      userName: String
    }],
    isResolved: {
      type: Boolean,
      default: false
    },
    resolvedBy: {
      type: String,
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    isSystemMessage: {
      type: Boolean,
      default: false
    },
    edited: {
      type: Boolean,
      default: false
    },
    editedAt: {
      type: Date
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better query performance
ProjectSchema.index({ 'members.userId': 1 });
ProjectSchema.index({ ownerId: 1, deletedAt: 1 }); // For listing user's projects
ProjectSchema.index({ deletedBy: 1, deletedAt: 1 }); // For trash queries
ProjectSchema.index({ createdAt: -1 }); // For sorting by creation date

ProjectSchema.methods.isMember = function (userId) {
  return this.members.some(member => String(member.userId) === String(userId));
};

ProjectSchema.methods.getUserRole = function (userId) {
  const member = this.members.find(member => String(member.userId) === String(userId));
  return member ? member.role : null;
};

ProjectSchema.methods.isOwner = function (userId) {
  // Convert both to strings to ensure proper comparison
  return String(this.ownerId) === String(userId);
};

// Auto-calculate progress based on task completion
ProjectSchema.methods.calculateProgress = function () {
  if (!this.tasks || this.tasks.length === 0) {
    return 0;
  }

  const completedTasks = this.tasks.filter(task => task.status === 'completed').length;
  const totalTasks = this.tasks.length;

  return Math.round((completedTasks / totalTasks) * 100);
};

// Auto-update project status based on progress
ProjectSchema.methods.updateStatusBasedOnProgress = function () {
  const progress = this.calculateProgress();

  // Don't change status if it's archived, needs revision, or finalized
  if (this.status === 'archived' || this.status === 'needs-revision' || this.status === 'finalized') {
    return;
  }

  // Update status based on progress
  if (progress === 0) {
    // No tasks completed - keep active (or leave as-is if on-hold)
    if (this.status !== 'on-hold') {
      this.status = 'active';
    }
  } else if (progress === 100) {
    // All tasks completed
    this.status = 'completed';
  } else {
    // Some tasks in progress
    if (this.status !== 'on-hold') {
      this.status = 'active';
    }
  }

  this.progress = progress;
};

// Pre-save middleware to auto-calculate progress and update status
ProjectSchema.pre('save', function (next) {
  // Only auto-update if tasks exist
  if (this.tasks && this.tasks.length > 0) {
    this.updateStatusBasedOnProgress();
  }
  next();
});

export default mongoose.model('Project', ProjectSchema);
