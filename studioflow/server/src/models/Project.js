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
  // Preview members (subset for UI display) - Full list in ProjectMember collection
  previewMembers: [{
    userId: String,
    name: String,
    avatar: String,
    role: String
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
  // Pricing & Payment Configuration
  pricing: {
    model: {
      type: String,
      enum: ['fixed', 'milestone', 'hourly'],
      default: 'fixed'
    },
    currency: {
      type: String,
      default: 'INR'
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    hourlyRate: {
      type: Number,
      default: 0
    },
    milestones: [{
      title: String,
      amount: Number,
      status: {
        type: String,
        enum: ['pending', 'funded', 'released'],
        default: 'pending'
      }
    }]
  },
  // Project Settings
  settings: {
    allowClientUploads: {
      type: Boolean,
      default: true
    },
    requireApprovalForDownloads: {
      type: Boolean,
      default: true
    }
  },
  finalizedAt: {
    type: Date,
    default: null
  },
  // Cached counters
  stats: {
    fileCount: {
      type: Number,
      default: 0
    },
    commentCount: {
      type: Number,
      default: 0
    },
    taskCount: {
      type: Number,
      default: 0
    },
    completedTaskCount: {
      type: Number,
      default: 0
    }
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
  // Comments moved to global 'Comment' collection
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
// Indexes for better query performance
ProjectSchema.index({ ownerId: 1, updatedAt: -1 }); // Optimized for dashboard
ProjectSchema.index({ 'previewMembers.userId': 1 });
ProjectSchema.index({ ownerId: 1, deletedAt: 1 }); // For listing user's projects
ProjectSchema.index({ deletedBy: 1, deletedAt: 1 }); // For trash queries
ProjectSchema.index({ createdAt: -1 }); // For sorting by creation date

import ProjectMember from './ProjectMember.js';

ProjectSchema.methods.isMember = async function (userId) {
  // Check if owner
  if (String(this.ownerId) === String(userId)) return true;

  // Check ProjectMember collection
  const member = await ProjectMember.findOne({
    projectId: this._id,
    userId: userId,
    status: 'active'
  });
  return !!member;
};

ProjectSchema.methods.getUserRole = async function (userId) {
  if (String(this.ownerId) === String(userId)) return 'owner';

  const member = await ProjectMember.findOne({
    projectId: this._id,
    userId: userId,
    status: 'active'
  });
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
