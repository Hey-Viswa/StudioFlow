import jwt from 'jsonwebtoken';
import Project from '../models/Project.js';

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

    // Create project with owner as first member
    const project = await Project.create({
      title,
      brief: brief || '',
      ownerId,
      members: [{
        userId: ownerId,
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

    const frontendUrl = process.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5173';
    const inviteLink = `${frontendUrl}/invite?token=${inviteToken}`;

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

    // Find projects where user is owner OR member
    const projects = await Project.find({
      $or: [
        { ownerId: userId },
        { 'members.userId': userId }
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

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only owner can generate invites
    if (!project.isOwner(userId)) {
      return res.status(403).json({ error: 'Only project owner can generate invites' });
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

    res.json({
      inviteLink,
      expiresIn: '7 days',
      projectTitle: project.title
    });
  } catch (error) {
    console.error('Generate invite error:', error);
    res.status(500).json({ error: 'Failed to generate invite' });
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

    // Update fields
    if (title !== undefined) project.title = title;
    if (brief !== undefined) project.brief = brief;
    if (status !== undefined) project.status = status;
    if (dueDate !== undefined) project.dueDate = dueDate ? new Date(dueDate) : null;

    await project.save();

    res.json({
      project,
      message: 'Project updated successfully'
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

// @desc    Delete project
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

    await project.deleteOne();

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};
