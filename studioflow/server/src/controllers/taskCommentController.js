import Project from '../models/Project.js';
import { createClerkClient } from '@clerk/backend';
import { clearUserCache } from '../middlewares/cache.js';
import { createNotificationWithIdempotency } from '../services/notificationServiceV2.js';
import { taskQueue } from '../queues/automationQueue.js';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});

// Helper: Clear cache for all project members
const clearProjectMembersCache = (project) => {
  project.members.forEach(member => {
    clearUserCache(member.userId);
  });
};

// Helper: Calculate project progress based on completed tasks
const calculateProgressFromTasks = (project) => {
  const tasks = project.tasks || [];

  if (tasks.length === 0) {
    return 0;
  }

  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const progress = Math.round((completedTasks / tasks.length) * 100);

  return progress;
};

// Helper: Update project progress based on tasks
const updateProjectProgress = async (project) => {
  const calculatedProgress = calculateProgressFromTasks(project);

  // Update project progress
  project.progress = calculatedProgress;

  // Auto-complete project if all tasks are done
  if (calculatedProgress === 100 && project.status !== 'completed') {
    project.status = 'completed';
  }

  // Revert to active if tasks are incomplete
  if (calculatedProgress < 100 && project.status === 'completed') {
    project.status = 'active';
  }

  await project.save();
  return calculatedProgress;
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

    if (!await project.isMember(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Calculate task statistics
    const tasks = project.tasks || [];
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;
    const pendingTasks = tasks.filter(task => task.status === 'pending').length;
    const progress = calculateProgressFromTasks(project);

    res.json({
      tasks,
      stats: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        pending: pendingTasks,
        progress
      }
    });
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

    if (!await project.isMember(userId)) {
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

    // Calculate and update progress based on tasks
    await updateProjectProgress(project);

    // Clear cache for all members
    clearProjectMembersCache(project);

    const createdTask = project.tasks[project.tasks.length - 1];

    // Emit Socket.IO event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`project-${projectId}`).emit('task-added', {
        task: createdTask,
        projectId,
        progress: project.progress
      });
    }

    // Notify assigned user if different from creator
    if (assignedTo && assignedTo !== userId) {
      try {
        await createNotificationWithIdempotency({
          projectId: projectId,
          recipients: [assignedTo],
          type: 'task-assigned',
          title: '📋 New Task Assigned',
          message: `You've been assigned to "${title}" in ${project.title}`,
          link: `/dashboard/projects/${projectId}`,
          priority: 'high',
          category: 'task',
          sendEmail: true,
          eventType: 'task-assigned',
          metadata: {
            projectId,
            taskId: createdTask._id.toString(),
            taskTitle: title,
            assignedBy: userName
          }
        });
      } catch (notifError) {
        console.error('Error sending task assignment notification:', notifError);
      }
    }

    res.status(201).json({
      message: 'Task created successfully',
      task: createdTask,
      progress: project.progress
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

    if (!await project.isMember(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const task = project.tasks.id(taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Track status change for notifications
    const wasCompleted = task.status === 'completed';

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

    const nowCompleted = task.status === 'completed';

    // Calculate and update progress based on tasks
    await updateProjectProgress(project);

    // Clear cache for all members
    clearProjectMembersCache(project);

    // Emit Socket.IO event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`project-${projectId}`).emit('task-updated', {
        task,
        projectId,
        progress: project.progress
      });
    }

    // Notify project owner when task is completed
    if (!wasCompleted && nowCompleted && project.ownerId !== userId) {
      try {
        await createNotificationWithIdempotency({
          projectId: projectId,
          recipients: [project.ownerId],
          type: 'task-completed',
          title: '✅ Task Completed',
          message: `Task "${task.title}" has been completed in ${project.title}`,
          link: `/dashboard/projects/${projectId}`,
          priority: 'medium',
          category: 'task',
          eventType: 'task-completed',
          metadata: {
            projectId,
            taskId: task._id.toString(),
            taskTitle: task.title
          }
        });
      } catch (notifError) {
        console.error('Error sending task completion notification:', notifError);
      }
    }

    res.json({
      message: 'Task updated successfully',
      task,
      progress: project.progress
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

    if (!await project.isMember(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    project.tasks.pull(taskId);

    // Calculate and update progress based on tasks
    await updateProjectProgress(project);

    // Clear cache for all members
    clearProjectMembersCache(project);

    // Emit Socket.IO event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`project-${projectId}`).emit('task-deleted', {
        taskId,
        projectId,
        progress: project.progress
      });
    }

    res.json({
      message: 'Task deleted successfully',
      progress: project.progress
    });
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

    if (!await project.isMember(userId)) {
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

    if (!await project.isMember(userId)) {
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

    // Emit Socket.IO event for real-time comments
    const io = req.app.get('io');
    if (io) {
      io.to(`project-${projectId}`).emit('comment-added', {
        projectId,
        comment: createdComment
      });
    }

    // Trigger Notification via Queue
    try {
      await createNotificationWithIdempotency({
        projectId,
        type: 'comment-created',
        eventType: 'comment.created', // Matches Rules Engine
        actorId: userId,
        title: `New comment in ${project.title}`,
        message: `${userName} commented: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
        link: `/dashboard/projects/${projectId}?tab=comments`,
        priority: 'medium',
        category: 'comment',
        metadata: {
          commentId: createdComment._id.toString(),
          commentText: text,
          projectTitle: project.title
        }
      });
    } catch (notifError) {
      console.error('Failed to trigger comment notification:', notifError);
    }

    // Trigger Task Automation if keywords are present
    try {
      const standardKeywords = ['#bug', '#todo', '#critical', '#urgent', '#high', '#medium', '#low'];
      const lowerText = text.toLowerCase();
      const hasKeyword = standardKeywords.some(k => lowerText.includes(k));

      if (hasKeyword) {
        console.log(`🤖 Comment contains automation keywords, queuing task creation...`);

        const payload = {
          commentId: createdComment._id.toString(),
          projectId: projectId.toString(),
          content: text,
          userId: userId,
          link: `/dashboard/projects/${projectId}?tab=tasks`
        };

        // If Redis queue is disabled, we must process it directly
        if (process.env.ENABLE_REDIS_QUEUE !== 'true') {
          console.log('🤖 Redis Queue is disabled. Processing task automation directly.');
          // Dynamic import to avoid circular dependency issues at the top level
          const automationService = (await import('../services/automationService.js')).default;
          await automationService.processTaskAutomation(payload);
        } else {
          await taskQueue.add('process-comment', payload, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 }
          });
        }
      }
    } catch (autoError) {
      console.error('Failed to queue or process task automation:', autoError);
    }

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
// @desc    Update a comment
// @route   PUT /api/projects/:projectId/comments/:commentId
// @access  Protected
export const updateComment = async (req, res) => {
  try {
    const { projectId, commentId } = req.params;
    const { text } = req.body;
    const userId = req.userId;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!await project.isMember(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const comment = project.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Only comment owner can edit
    if (comment.userId !== userId) {
      return res.status(403).json({ error: 'You can only edit your own comments' });
    }

    // Update comment
    comment.text = text.trim();
    comment.edited = true;
    comment.editedAt = new Date();

    await project.save();

    // Clear cache for all members
    clearProjectMembersCache(project);

    // Get user details for the response
    let userName = 'Unknown User';
    try {
      const user = await clerkClient.users.getUser(userId);
      userName = user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.username || user.firstName || user.emailAddresses?.[0]?.emailAddress || 'Unknown User';
    } catch (err) {
      console.error('Error fetching user from Clerk:', err);
    }

    res.json({
      comment: {
        _id: comment._id,
        text: comment.text,
        userId: comment.userId,
        userName: userName,
        taskId: comment.taskId,
        edited: comment.edited,
        editedAt: comment.editedAt,
        createdAt: comment.createdAt
      }
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
};

// @desc    Delete a comment
// @route   DELETE /api/projects/:projectId/comments/:commentId
// @access  Protected
export const deleteComment = async (req, res) => {
  try {
    const { projectId, commentId } = req.params;
    const userId = req.userId;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!await project.isMember(userId)) {
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

    // Emit Socket.IO event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`project-${projectId}`).emit('comment-deleted', {
        commentId,
        projectId,
        deletedBy: userId
      });
    }

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};
