import jwt from 'jsonwebtoken';
import Project from '../models/Project.js';
import Trash from '../models/Trash.js';
import { createClerkClient } from '@clerk/backend';
import { clearUserCache } from '../middlewares/cache.js';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});

// @desc    Create a new project
// @route   POST /api/projects
// @access  Protected
export const createProject = async (req, res) => {
  try {
    const { title, brief, dueDate } = req.body;
    const ownerId = req.userId; // From Clerk middleware

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (title.length > 50) {
      return res.status(400).json({ error: 'Title must be 50 characters or less' });
    }

    if (brief && brief.length > 100) {
      return res.status(400).json({ error: 'Brief must be 100 characters or less' });
    }

    // Fetch user details from Clerk
    let ownerEmail = '';
    let ownerName = '';
    try {
      const user = await clerkClient.users.getUser(ownerId);
      ownerEmail = user.emailAddresses?.[0]?.emailAddress || '';
      ownerName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.username || user.firstName || ownerEmail;
    } catch (err) {
      console.error('Error fetching user from Clerk:', err);
      // Continue without user details
    }

    // Create project with owner as first member
    const project = await Project.create({
      title,
      brief: brief || '',
      ownerId,
      members: [{
        userId: ownerId,
        email: ownerEmail,
        name: ownerName,
        role: 'owner',
        joinedAt: new Date()
      }],
      dueDate: dueDate ? new Date(dueDate) : undefined
    });

    // Generate initial invite link for convenience
    const inviteToken = jwt.sign(
      { 
        projectId: project._id.toString(),
        invitedBy: ownerId,
        role: 'client'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
    const inviteLink = `${frontendUrl}/invite?token=${inviteToken}`;

    // Clear user's project list cache
    clearUserCache(ownerId);

    // Emit Socket.IO event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('project-created', {
        projectId: project._id,
        ownerId: ownerId
      });
    }

    res.status(201).json({
      project,
      inviteLink,
      message: 'Project created successfully'
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

// @desc    Get all projects for current user
// @route   GET /api/projects
// @access  Protected
export const listProjects = async (req, res) => {
  try {
    const userId = req.userId;

    // Find projects where user is owner OR member, and NOT deleted
    // Use lean() for better performance and select only necessary fields
    const projects = await Project.find({
      $and: [
        { deletedAt: null }, // Exclude soft-deleted projects
        {
          $or: [
            { ownerId: userId },
            { 'members.userId': userId }
          ]
        }
      ]
    })
    .select('title brief status progress ownerId members createdAt updatedAt dueDate') // Only needed fields
    .lean() // Return plain objects for better performance
    .sort({ createdAt: -1 }); // Most recent first

    // Enhance projects with user names from Clerk and categorize them
    const enhancedProjects = await Promise.all(projects.map(async (project) => {
      // Determine if this is user's own project or shared project
      const isOwner = String(project.ownerId) === String(userId);
      
      // Get owner name from Clerk
      let ownerName = 'Unknown';
      try {
        const ownerUser = await clerkClient.users.getUser(project.ownerId);
        ownerName = ownerUser.firstName && ownerUser.lastName 
          ? `${ownerUser.firstName} ${ownerUser.lastName}` 
          : ownerUser.username || ownerUser.emailAddresses?.[0]?.emailAddress || 'Unknown';
      } catch (err) {
        console.error('Error fetching owner from Clerk:', err);
      }

      // Enhance members with actual names from Clerk if missing
      const enhancedMembers = await Promise.all(project.members.map(async (member) => {
        if (!member.name || member.name === '') {
          try {
            const memberUser = await clerkClient.users.getUser(member.userId);
            return {
              ...member,
              name: memberUser.firstName && memberUser.lastName 
                ? `${memberUser.firstName} ${memberUser.lastName}` 
                : memberUser.username || memberUser.emailAddresses?.[0]?.emailAddress || member.userId,
              email: memberUser.emailAddresses?.[0]?.emailAddress || member.email
            };
          } catch (err) {
            console.error('Error fetching member from Clerk:', err);
            return member;
          }
        }
        return member;
      }));

      // Calculate user's role
      let userRole = null;
      if (isOwner) {
        userRole = 'owner';
      } else {
        const member = project.members.find(m => String(m.userId) === String(userId));
        userRole = member ? member.role : null;
      }
      
      return {
        ...project,
        ownerName,
        members: enhancedMembers,
        userRole,
        isShared: !isOwner // Flag to indicate if this is a shared project
      };
    }));

    // Categorize projects
    const myProjects = enhancedProjects.filter(p => !p.isShared);
    const sharedProjects = enhancedProjects.filter(p => p.isShared);

    res.json({
      projects: enhancedProjects,
      myProjects,
      sharedProjects,
      count: enhancedProjects.length
    });
  } catch (error) {
    console.error('List projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

// @desc    Get single project by ID
// @route   GET /api/projects/:id
// @access  Protected
export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user has access
    if (!project.isMember(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Add user's role
    const userRole = project.getUserRole(userId);
    const projectData = {
      ...project.toObject(),
      userRole,
      isOwner: project.isOwner(userId)
    };

    console.log('🔐 Sending project with role:', {
      userId,
      userRole,
      isOwner: projectData.isOwner,
      ownerId: project.ownerId
    });

    res.json({ project: projectData });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

// @desc    Generate invite link for project
// @route   POST /api/projects/:id/invite
// @access  Protected (Owner only)
export const generateInvite = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    console.log('🔗 Generate invite request:', { projectId: id, userId });

    // Only select fields needed for invite generation
    const project = await Project.findById(id)
      .select('_id title ownerId')
      .lean();

    if (!project) {
      console.log('❌ Project not found:', id);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only owner can generate invites
    if (String(project.ownerId) !== String(userId)) {
      console.log('❌ Not owner:', { userId, ownerId: project.ownerId });
      return res.status(403).json({ error: 'Only project owner can generate invites' });
    }

    // Check JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET not configured in environment variables');
      return res.status(500).json({ error: 'Server configuration error: JWT_SECRET not set' });
    }

    // Create invite token (valid for 7 days)
    const inviteToken = jwt.sign(
      { 
        projectId: project._id.toString(),
        invitedBy: userId,
        role: 'client'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Use frontend URL from env
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteLink = `${frontendUrl}/invite?token=${inviteToken}`;

    console.log('✅ Invite link generated successfully');

    res.json({
      inviteLink,
      expiresIn: '7 days',
      projectTitle: project.title
    });
  } catch (error) {
    console.error('❌ Generate invite error:', error);
    res.status(500).json({ error: 'Failed to generate invite: ' + error.message });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Protected (Owner only)
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { title, brief, status, dueDate, progress, tasks } = req.body;

    console.log('📊 Update project request:', { 
      projectId: id, 
      userId, 
      updates: { title, brief, status, dueDate, progress, hasTasks: !!tasks } 
    });

    const project = await Project.findById(id);

    if (!project) {
      console.log('❌ Project not found:', id);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only owner can update
    if (!project.isOwner(userId)) {
      console.log('❌ User is not owner:', { userId, ownerId: project.ownerId });
      return res.status(403).json({ error: 'Only project owner can update' });
    }

    // Validate character limits
    if (title && title.length > 50) {
      return res.status(400).json({ error: 'Title must be 50 characters or less' });
    }

    if (brief && brief.length > 100) {
      return res.status(400).json({ error: 'Brief must be 100 characters or less' });
    }

    // Update fields
    if (title !== undefined) project.title = title;
    if (brief !== undefined) project.brief = brief;
    if (dueDate !== undefined) project.dueDate = dueDate ? new Date(dueDate) : null;
    
    // Update tasks if provided
    if (tasks !== undefined) {
      project.tasks = tasks;
      console.log('� Tasks updated, auto-calculating progress...');
    }
    
    // Manual status override (only if not letting auto-calc handle it)
    if (status !== undefined && !tasks) {
      project.status = status;
    }
    
    // Manual progress override (only if no tasks update)
    if (progress !== undefined && !tasks) {
      if (progress < 0 || progress > 100) {
        return res.status(400).json({ error: 'Progress must be between 0 and 100' });
      }
      project.progress = progress;
      console.log('📊 Manual progress update:', { old: project.progress, new: progress });
    }

    // Save will trigger pre-save middleware that auto-calculates progress
    await project.save();
    
    console.log('✅ Project updated successfully:', { 
      progress: project.progress,
      status: project.status,
      completedTasks: project.tasks.filter(t => t.status === 'completed').length,
      totalTasks: project.tasks.length
    });

    // Clear cache for all project members
    clearUserCache(userId);
    project.members.forEach(member => {
      if (member.userId !== userId) {
        clearUserCache(member.userId);
      }
    });

    // Emit Socket.IO event for real-time update
    const io = req.app.get('io');
    if (io) {
      // Emit to everyone (for dashboard real-time updates)
      io.emit('project-updated', {
        projectId: id,
        ownerId: project.ownerId,
        updates: { title, brief, status: project.status, dueDate, progress: project.progress, tasks: project.tasks }
      });
      console.log('📡 Socket.IO: Emitted project-updated event globally');
    }

    res.json({
      project,
      message: 'Project updated successfully'
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

// @desc    Soft delete project (move to trash)
// @desc    Delete project (move to trash)
// @route   DELETE /api/projects/:id
// @access  Protected (Owner only)
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const reason = req.body?.reason || null; // Make it optional since body might be undefined

    console.log('🗑️ Delete project request:', { projectId: id, userId, reason });

    const project = await Project.findById(id);

    if (!project) {
      console.log('❌ Project not found:', id);
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log('✅ Project found:', { title: project.title, ownerId: project.ownerId });

    // Only owner can delete
    if (!project.isOwner(userId)) {
      console.log('❌ Not owner:', { userId, ownerId: project.ownerId });
      return res.status(403).json({ error: 'Only project owner can delete' });
    }

    console.log('✅ Owner verified, proceeding with deletion');

    // Get user details for deletion record
    let userName = '';
    try {
      const user = await clerkClient.users.getUser(userId);
      userName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.username || user.firstName || user.emailAddresses?.[0]?.emailAddress || '';
      console.log('✅ User details fetched:', userName);
    } catch (err) {
      console.error('⚠️ Error fetching user from Clerk:', err.message);
      userName = 'Unknown User';
    }

    // Create trash entry with full project data
    console.log('📦 Creating trash entry...');
    const trashEntry = new Trash({
      originalProjectId: project._id.toString(),
      title: project.title,
      brief: project.brief,
      ownerId: project.ownerId,
      members: project.members,
      status: project.status,
      progress: project.progress,
      dueDate: project.dueDate,
      paymentInfo: project.paymentInfo,
      deletedBy: userId,
      deletedByName: userName,
      deleteReason: reason,
      fullProjectData: project.toObject()
    });

    await trashEntry.save();
    console.log('✅ Trash entry created:', trashEntry._id);

    // Delete the project from main collection
    console.log('🗑️ Deleting project from main collection...');
    await Project.findByIdAndDelete(id);
    console.log('✅ Project deleted from main collection');

    // Clear cache for all project members
    console.log('🔄 Clearing cache for project members...');
    clearUserCache(userId);
    project.members.forEach(member => {
      if (member.userId !== userId) {
        clearUserCache(member.userId);
      }
    });
    console.log('✅ Cache cleared');

    // Emit Socket.IO event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('project-deleted', {
        projectId: id,
        ownerId: project.ownerId
      });
      console.log('📡 Socket.IO: Emitted project-deleted event globally');
    }

    res.json({ 
      message: 'Project moved to trash. Will be permanently deleted after 30 days.',
      trashId: trashEntry._id
    });
  } catch (error) {
    console.error('❌ Delete project error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to delete project',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

// @desc    Get trash (soft-deleted projects)
// @route   GET /api/projects/trash
// @access  Protected
export const listTrash = async (req, res) => {
  try {
    const userId = req.userId;

    // Find projects that were deleted by this user and haven't been 30 days yet
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Use lean() and select only needed fields
    const trashedProjects = await Project.find({
      deletedBy: userId,
      deletedAt: { $ne: null, $gte: thirtyDaysAgo }
    })
    .select('title brief status deletedAt ownerId createdAt')
    .lean()
    .sort({ deletedAt: -1 });

    // Calculate days remaining for each project
    const projectsWithDaysRemaining = trashedProjects.map(project => {
      const deletedDate = new Date(project.deletedAt);
      const expiryDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      const daysRemaining = Math.ceil((expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
      
      return {
        ...project,
        daysRemaining
      };
    });

    res.json({
      projects: projectsWithDaysRemaining,
      count: projectsWithDaysRemaining.length
    });
  } catch (error) {
    console.error('List trash error:', error);
    res.status(500).json({ error: 'Failed to fetch trash' });
  }
};

// @desc    Restore project from trash
// @route   POST /api/projects/:id/restore
// @access  Protected (Owner only)
export const restoreProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only the person who deleted it can restore
    if (project.deletedBy !== userId) {
      return res.status(403).json({ error: 'Only the person who deleted this can restore it' });
    }

    // Restore project
    project.deletedAt = null;
    project.deletedBy = null;
    await project.save();

    res.json({ 
      project,
      message: 'Project restored successfully' 
    });
  } catch (error) {
    console.error('Restore project error:', error);
    res.status(500).json({ error: 'Failed to restore project' });
  }
};

// @desc    Permanently delete project
// @route   DELETE /api/projects/:id/permanent
// @access  Protected (Owner only)
export const permanentlyDeleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only owner can permanently delete
    if (!project.isOwner(userId)) {
      return res.status(403).json({ error: 'Only project owner can permanently delete' });
    }

    await project.deleteOne();

    res.json({ message: 'Project permanently deleted' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};
