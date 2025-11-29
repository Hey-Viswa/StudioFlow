import jwt from 'jsonwebtoken';
import Project from '../models/Project.js';
import Trash from '../models/Trash.js';
import User from '../models/User.js';
import { createClerkClient } from '@clerk/backend';
import { clearUserCache } from '../middlewares/cache.js';
import ProjectInvoice from '../models/ProjectInvoice.js';
import ProjectFile from '../models/ProjectFile.js';
import { createNotificationWithIdempotency } from '../services/notificationServiceV2.js';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});

// Subscription plan limits
const PLAN_LIMITS = {
  free: { maxProjects: 5 },
  pro: { maxProjects: 50 },
  studio: { maxProjects: 100 }
};

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

    // Check subscription limits
    const user = await User.findOne({ clerkUserId: ownerId });
    const currentPlan = user?.subscription?.plan || 'free';
    const maxProjects = PLAN_LIMITS[currentPlan]?.maxProjects || 5;

    // Count user's active projects
    const projectCount = await Project.countDocuments({ ownerId });

    if (projectCount >= maxProjects) {
      return res.status(403).json({
        error: 'Project limit reached',
        message: `You've reached the maximum of ${maxProjects} projects for your ${currentPlan} plan. Please upgrade to create more projects.`,
        currentPlan,
        maxProjects,
        currentCount: projectCount
      });
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
    const { status, search, clientId, dateRange } = req.query;

    // Build query filters
    const query = {
      $and: [
        { deletedAt: null }, // Exclude soft-deleted projects
        {
          $or: [
            { ownerId: userId },
            { 'members.userId': userId }
          ]
        }
      ]
    };

    // Add status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Add search filter (title or brief)
    if (search && search.trim() !== '') {
      query.$and.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { brief: { $regex: search, $options: 'i' } }
        ]
      });
    }

    // Add client filter
    if (clientId && clientId !== 'all') {
      query['members.userId'] = clientId;
      query['members.role'] = 'client';
    }

    // Add date range filter
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate;

      switch (dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'quarter':
          startDate = new Date(now.setMonth(now.getMonth() - 3));
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }

    // Find projects where user is owner OR member, and NOT deleted
    // Use lean() for better performance and select only necessary fields
    const projects = await Project.find(query)
      .select('title brief status progress ownerId members createdAt updatedAt dueDate comments') // Only needed fields
      .lean() // Return plain objects for better performance
      .sort({ createdAt: -1 }); // Most recent first

    // OPTIMIZATION: Collect all unique user IDs first to batch fetch from Clerk
    const allUserIds = new Set();
    projects.forEach(project => {
      allUserIds.add(project.ownerId);
      project.members.forEach(member => {
        if (!member.name || member.name === '') {
          allUserIds.add(member.userId);
        }
      });
    });

    // BATCH FETCH: Get all users at once instead of one by one
    const userCache = new Map();
    const userIds = Array.from(allUserIds);

    // Fetch users in parallel with rate limiting (max 10 concurrent)
    const chunkSize = 10;
    for (let i = 0; i < userIds.length; i += chunkSize) {
      const chunk = userIds.slice(i, i + chunkSize);
      await Promise.all(chunk.map(async (id) => {
        try {
          const user = await clerkClient.users.getUser(id);
          const displayName = user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.username || user.emailAddresses?.[0]?.emailAddress || 'Unknown';
          userCache.set(id, {
            name: displayName,
            email: user.emailAddresses?.[0]?.emailAddress
          });
        } catch (err) {
          console.error(`Error fetching user ${id} from Clerk:`, err.message);
          userCache.set(id, { name: 'Unknown', email: '' });
        }
      }));
    }

    // Get counts for invoices, files, and comments for all projects at once
    const projectIds = projects.map(p => p._id);

    // Batch fetch counts
    const [invoiceCounts, fileCounts] = await Promise.all([
      ProjectInvoice.aggregate([
        { $match: { projectId: { $in: projectIds } } },
        {
          $group: {
            _id: '$projectId',
            total: { $sum: 1 },
            paid: {
              $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
            }
          }
        }
      ]),
      ProjectFile.aggregate([
        { $match: { projectId: { $in: projectIds } } },
        { $group: { _id: '$projectId', count: { $sum: 1 } } }
      ])
    ]);

    // Create lookup maps for O(1) access
    const invoiceMap = new Map(
      invoiceCounts.map(item => [item._id.toString(), { paid: item.paid, total: item.total }])
    );
    const fileMap = new Map(
      fileCounts.map(item => [item._id.toString(), item.count])
    );

    // Enhance projects with cached user data (NO MORE API CALLS)
    const enhancedProjects = projects.map((project) => {
      // Determine if this is user's own project or shared project
      const isOwner = String(project.ownerId) === String(userId);

      // Get owner name from cache
      const ownerData = userCache.get(project.ownerId) || { name: 'Unknown' };
      const ownerName = ownerData.name;

      // Enhance members with cached data
      const enhancedMembers = project.members.map((member) => {
        if (!member.name || member.name === '') {
          const memberData = userCache.get(member.userId) || { name: member.userId, email: member.email };
          return {
            ...member,
            name: memberData.name,
            email: memberData.email || member.email
          };
        }
        return member;
      });

      // Calculate user's role
      let userRole = null;
      if (isOwner) {
        userRole = 'owner';
      } else {
        const member = project.members.find(m => String(m.userId) === String(userId));
        userRole = member ? member.role : null;
      }

      // Get counts from maps
      const projectIdStr = project._id.toString();
      const invoiceStats = invoiceMap.get(projectIdStr) || { paid: 0, total: 0 };
      const filesCount = fileMap.get(projectIdStr) || 0;
      const commentsCount = project.comments?.length || 0;

      return {
        ...project,
        ownerName,
        members: enhancedMembers,
        userRole,
        isShared: !isOwner, // Flag to indicate if this is a shared project
        invoiceStats,
        filesCount,
        commentsCount
      };
    });

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

// @desc    Get project metrics for invoice autofill
// @route   GET /api/projects/:id/metrics
// @access  Protected (Project members)
export const getProjectMetrics = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.isMember(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const tasks = project.tasks || [];
    const completedTasks = tasks.filter(task => task.status === 'completed');

    // Attempt to derive metrics from previous invoices
    const latestInvoice = await ProjectInvoice.findOne({ projectId: id })
      .sort({ createdAt: -1 })
      .lean();

    const hoursFromTasks = completedTasks.reduce((sum, task) => {
      const tracked = task?.metrics?.hoursWorked ?? task?.hoursWorked ?? task?.billableHours ?? 0;
      return sum + (tracked || 0);
    }, 0);

    const derivedHours = latestInvoice
      ? latestInvoice.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
      : 0;

    const hoursWorked = hoursFromTasks || derivedHours || completedTasks.length;
    const billableHours = latestInvoice
      ? latestInvoice.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
      : hoursWorked;

    const rateFromInvoice = latestInvoice && latestInvoice.items.length > 0
      ? latestInvoice.items[0].rate
      : 0;

    const metrics = {
      hoursWorked,
      billableHours,
      rate: project.billingRate || project.agreedPrice || rateFromInvoice || 0,
      expenses: project.expenses?.total || 0,
      completedTasks: completedTasks.length
    };

    res.json({ success: true, metrics });
  } catch (error) {
    console.error('❌ Get project metrics error:', error);
    res.status(500).json({ error: 'Failed to calculate project metrics' });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Protected (Owner only)
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const userName = req.userName || '';
    const { title, brief, status, dueDate, progress, tasks, revisionNotes, finalizedAt } = req.body;

    console.log('📊 Update project request:', {
      projectId: id,
      userId,
      updates: { title, brief, status, dueDate, progress, hasTasks: !!tasks, revisionNotes, finalizedAt }
    });

    const project = await Project.findById(id);

    if (!project) {
      console.log('❌ Project not found:', id);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user is a member of the project
    const isMember = project.members.some(m => m.userId === userId);
    const isOwner = project.isOwner(userId);

    if (!isMember && !isOwner) {
      console.log('❌ User is not a member:', { userId, ownerId: project.ownerId });
      return res.status(403).json({ error: 'You are not a member of this project' });
    }

    // Allow clients to request revision or approve final
    const isClientAction = status === 'needs-revision' || status === 'finalized';

    // Only owner can update project details (except client revision/approval)
    if (!isOwner && !isClientAction) {
      console.log('❌ User is not owner:', { userId, ownerId: project.ownerId });
      return res.status(403).json({ error: 'Only project owner can update project details' });
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

      // Add system comment for status changes
      if (status === 'needs-revision' && revisionNotes) {
        project.comments.push({
          userId,
          userName,
          text: `Revision requested: ${revisionNotes}`,
          isSystemMessage: true,
          createdAt: new Date()
        });
      } else if (status === 'finalized') {
        project.comments.push({
          userId,
          userName,
          text: `✅ Project approved and finalized by ${userName || 'client'}`,
          isSystemMessage: true,
          createdAt: new Date()
        });
        if (finalizedAt) {
          project.finalizedAt = new Date(finalizedAt);
        }
      }
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

    // Check for Task Assignments and Trigger Notifications
    if (tasks && tasks.length > 0) {
      const oldTasksMap = new Map(project.tasks.map(t => [t._id?.toString(), t]));

      for (const newTask of tasks) {
        // Check if it's a new assignment
        // Case 1: New task with assignee
        // Case 2: Existing task with CHANGED assignee
        const oldTask = newTask._id ? oldTasksMap.get(newTask._id.toString()) : null;
        const newAssigneeId = newTask.assignedTo?.userId;
        const oldAssigneeId = oldTask?.assignedTo?.userId;

        if (newAssigneeId && newAssigneeId !== userId) { // Don't notify if assigning to self
          if (!oldTask || (oldAssigneeId !== newAssigneeId)) {
            console.log(`🔔 Triggering task assignment notification for user ${newAssigneeId}`);

            // Import dynamically to avoid circular dependency issues
            const { triggerNotification } = await import('../services/notificationService.js');

            await triggerNotification(
              'task.assigned',
              {
                projectId: project._id,
                taskId: newTask._id || 'new', // Might be new, so ID might not be stable yet if not re-fetched
                taskTitle: newTask.title,
                projectTitle: project.title,
                assignedTo: newTask.assignedTo,
                priority: 'medium', // Default
                link: `/dashboard/projects/${project._id}`
              },
              userId // Actor
            );
          }
        }
      }
    }

    // Send Notifications for Client Actions
    if (status === 'needs-revision' && revisionNotes) {
      console.log('🔔 Attempting to send revision notification to owner:', project.ownerId);
      try {
        await createNotificationWithIdempotency({
          projectId: project._id.toString(),
          recipients: [project.ownerId.toString()], // Notify owner (ensure string)
          type: 'project-updated',
          eventType: 'project.needs_revision', // Matches Rules Engine
          actorId: userId,
          title: '📝 Revision Requested',
          message: `Client requested changes: "${revisionNotes.substring(0, 50)}${revisionNotes.length > 50 ? '...' : ''}"`,
          link: `/dashboard/projects/${project._id}?tab=comments`,
          priority: 'high',
          category: 'project',
          metadata: {
            projectTitle: project.title,
            requestedBy: userName
          }
        });
        console.log('🔔 Notification sent: Revision Requested');
      } catch (notifError) {
        console.error('❌ Failed to send revision notification:', notifError);
      }
    } else if (status === 'finalized') {
      try {
        await createNotificationWithIdempotency({
          projectId: project._id.toString(),
          recipients: [project.ownerId.toString()], // Notify owner (ensure string)
          type: 'project-updated',
          eventType: 'project.finalized', // Matches Rules Engine
          actorId: userId,
          title: '✅ Project Approved',
          message: `Client has approved and finalized "${project.title}"`,
          link: `/dashboard/projects/${project._id}`,
          priority: 'high',
          category: 'project',
          metadata: {
            projectTitle: project.title,
            approvedBy: userName
          }
        });
        console.log('🔔 Notification sent: Project Approved');
      } catch (notifError) {
        console.error('❌ Failed to send approval notification:', notifError);
      }
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

    // Notify all project members
    try {
      const memberUserIds = project.members
        .map(m => m.userId)
        .filter(uid => uid !== userId); // Don't notify the person who deleted it

      if (memberUserIds.length > 0) {
        await createNotificationWithIdempotency({
          projectId: project._id.toString(),
          recipients: memberUserIds,
          type: 'project-deleted',
          eventType: 'project.deleted',
          actorId: userId,
          title: '🗑️ Project Deleted',
          message: `Project "${project.title}" has been moved to trash by ${userName}`,
          link: `/dashboard/trash`,
          priority: 'high',
          category: 'project',
          metadata: {
            projectTitle: project.title,
            deletedBy: userName
          }
        });
      }
    } catch (notifError) {
      console.error('Error sending deletion notifications:', notifError);
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
