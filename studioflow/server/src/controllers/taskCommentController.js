import Project from '../models/Project.js';
import { createClerkClient } from '@clerk/backend';
import { clearUserCache } from '../middlewares/cache.js';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});

// Helper: Clear cache for all project members
const clearProjectMembersCache = (project) => {
  project.members.forEach(member => {
    clearUserCache(member.userId);
  });
};

// @desc    Get all tasks for a project
// @route   GET /api/projects/:projectId/tasks
// @access  Protected (Members only)
export const getTasks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.isMember(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ tasks: project.tasks || [] });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

// @desc    Create a new task
// @route   POST /api/projects/:projectId/tasks
// @access  Protected (Members only)
export const createTask = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;
    const { title, description, assignedTo, dueDate, status } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.isMember(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get current user info
    let userName = '';
    try {
      const user = await clerkClient.users.getUser(userId);
      userName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.username || user.firstName || user.emailAddresses?.[0]?.emailAddress || '';
    } catch (err) {
      console.error('Error fetching user from Clerk:', err);
    }

    const newTask = {
      title,
      description: description || '',
      assignedTo: assignedTo || null,
      status: status || 'pending',
      dueDate: dueDate || null,
      createdBy: {
        userId,
        name: userName
      },
      createdAt: new Date()
    };

    project.tasks.push(newTask);
    await project.save();

    // Clear cache for all members
    clearProjectMembersCache(project);

    const createdTask = project.tasks[project.tasks.length - 1];

    res.status(201).json({ 
      message: 'Task created successfully',
      task: createdTask
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
};

// @desc    Update a task
// @route   PUT /api/projects/:projectId/tasks/:taskId
// @access  Protected (Members only)
export const updateTask = async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    const userId = req.userId;
    const updates = req.body;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.isMember(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const task = project.tasks.id(taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Update task fields
    if (updates.title !== undefined) task.title = updates.title;
    if (updates.description !== undefined) task.description = updates.description;
    if (updates.status !== undefined) {
      task.status = updates.status;
      if (updates.status === 'completed' && !task.completedAt) {
        task.completedAt = new Date();
      } else if (updates.status !== 'completed') {
        task.completedAt = null;
      }
    }
    if (updates.assignedTo !== undefined) task.assignedTo = updates.assignedTo;
    if (updates.dueDate !== undefined) task.dueDate = updates.dueDate;
    if (updates.googleCalendarEventId !== undefined) task.googleCalendarEventId = updates.googleCalendarEventId;

    await project.save();

    // Clear cache for all members
    clearProjectMembersCache(project);

    res.json({ 
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

// @desc    Delete a task
// @route   DELETE /api/projects/:projectId/tasks/:taskId
// @access  Protected (Members only)
export const deleteTask = async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    const userId = req.userId;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.isMember(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    project.tasks.pull(taskId);
    await project.save();

    // Clear cache for all members
    clearProjectMembersCache(project);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

// @desc    Get all comments for a project
// @route   GET /api/projects/:projectId/comments
// @access  Protected (Members only)
export const getComments = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.isMember(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ comments: project.comments || [] });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

// @desc    Create a new comment
// @route   POST /api/projects/:projectId/comments
// @access  Protected (Members only)
export const createComment = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;
    const { text } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.isMember(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get user info from Clerk
    let userName = '';
    let userEmail = '';
    try {
      const user = await clerkClient.users.getUser(userId);
      userName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.username || user.firstName || '';
      userEmail = user.emailAddresses?.[0]?.emailAddress || '';
    } catch (err) {
      console.error('Error fetching user from Clerk:', err);
    }

    const newComment = {
      userId,
      userName,
      userEmail,
      text: text.trim(),
      createdAt: new Date()
    };

    project.comments.push(newComment);
    await project.save();

    // Clear cache for all members
    clearProjectMembersCache(project);

    const createdComment = project.comments[project.comments.length - 1];

    res.status(201).json({ 
      message: 'Comment created successfully',
      comment: createdComment
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
};

// @desc    Delete a comment
// @route   DELETE /api/projects/:projectId/comments/:commentId
// @access  Protected (Comment owner or project owner)
export const deleteComment = async (req, res) => {
  try {
    const { projectId, commentId } = req.params;
    const userId = req.userId;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.isMember(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const comment = project.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Only comment owner or project owner can delete
    if (comment.userId !== userId && !project.isOwner(userId)) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    project.comments.pull(commentId);
    await project.save();

    // Clear cache for all members
    clearProjectMembersCache(project);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};
