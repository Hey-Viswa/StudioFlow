import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  brief: {
    type: String,
    default: ''
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
  dueDate: {
    type: Date
  }
}, { 
  timestamps: true
});

ProjectSchema.index({ 'members.userId': 1 });

ProjectSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.userId === userId);
};

ProjectSchema.methods.getUserRole = function(userId) {
  const member = this.members.find(member => member.userId === userId);
  return member ? member.role : null;
};

ProjectSchema.methods.isOwner = function(userId) {
  return this.ownerId === userId;
};

export default mongoose.model('Project', ProjectSchema);
