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
    enum: ['active', 'completed', 'on-hold', 'archived'],
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

ProjectSchema.methods.isMember = function(userId) {
  return this.members.some(member => String(member.userId) === String(userId));
};

ProjectSchema.methods.getUserRole = function(userId) {
  const member = this.members.find(member => String(member.userId) === String(userId));
  return member ? member.role : null;
};

ProjectSchema.methods.isOwner = function(userId) {
  // Convert both to strings to ensure proper comparison
  return String(this.ownerId) === String(userId);
};

export default mongoose.model('Project', ProjectSchema);
