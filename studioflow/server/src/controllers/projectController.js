import jwt from 'jsonwebtoken';
import Project from '../models/Project.js';
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
    }).sort({ createdAt: -1 }); // Most recent first

    // Add user's role to each project for frontend
    const projectsWithRole = projects.map(project => {
      const userRole = project.getUserRole(userId);
      return {
        ...project.toObject(),
        userRole
      };
    });

    res.json({
      projects: projectsWithRole,
      count: projectsWithRole.length
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

    const project = await Project.findById(id);

    if (!project) {
      console.log('❌ Project not found:', id);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only owner can generate invites
    if (!project.isOwner(userId)) {
      console.log('❌ Not owner:', { userId, ownerId: project.owner });
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
    const { title, brief, status, dueDate } = req.body;

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only owner can update
    if (!project.isOwner(userId)) {
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
    if (status !== undefined) project.status = status;
    if (dueDate !== undefined) project.dueDate = dueDate ? new Date(dueDate) : null;

    await project.save();

    // Clear cache for all project members
    clearUserCache(userId);
    project.members.forEach(member => {
      if (member.userId !== userId) {
        clearUserCache(member.userId);
      }
    });

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
// @route   DELETE /api/projects/:id
// @access  Protected (Owner only)
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only owner can delete
    if (!project.isOwner(userId)) {
      return res.status(403).json({ error: 'Only project owner can delete' });
    }

    // Soft delete - move to trash
    project.deletedAt = new Date();
    project.deletedBy = userId;
    await project.save();

    // Clear cache for all project members
    clearUserCache(userId);
    project.members.forEach(member => {
      if (member.userId !== userId) {
        clearUserCache(member.userId);
      }
    });

    res.json({ message: 'Project moved to trash. Will be permanently deleted after 30 days.' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
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
    
    const trashedProjects = await Project.find({
      deletedBy: userId,
      deletedAt: { $ne: null, $gte: thirtyDaysAgo }
    }).sort({ deletedAt: -1 });

    // Calculate days remaining for each project
    const projectsWithDaysRemaining = trashedProjects.map(project => {
      const deletedDate = new Date(project.deletedAt);
      const expiryDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      const daysRemaining = Math.ceil((expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
      
      return {
        ...project.toObject(),
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
