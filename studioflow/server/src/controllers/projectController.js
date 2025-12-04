import jwt from 'jsonwebtoken';
import Project from '../models/Project.js';
import Trash from '../models/Trash.js';
import User from '../models/User.js';
import { createClerkClient } from '@clerk/backend';
import { clearUserCache } from '../middlewares/cache.js';
import ProjectInvoice from '../models/ProjectInvoice.js';
import ProjectFile from '../models/ProjectFile.js';
import ProjectMember from '../models/ProjectMember.js';
import Comment from '../models/Comment.js';
import { createNotificationWithIdempotency } from '../services/notificationServiceV2.js';
import { checkPermission, PERMISSIONS, ROLES } from '../utils/permissions.js';
import { logAudit } from '../services/auditService.js';

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

    // RBAC: Clients cannot create projects
    if (user?.role === 'client') {
      return res.status(403).json({
        error: 'Permission denied',
        message: 'Clients cannot create projects. Please contact support if you believe this is an error.'
      });
    }

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

    // Create project (members array is now empty/deprecated)
    // Create project
    const project = await Project.create({
      title,
      brief: brief || '',
      ownerId,
      dueDate: dueDate ? new Date(dueDate) : undefined
    });

    // Add owner to ProjectMember collection
    await ProjectMember.create({
      projectId: project._id,
      userId: ownerId,
      email: ownerEmail,
      role: 'owner',
      status: 'active',
      joinedAt: new Date(),
      invitedBy: ownerId // Self-invited
    });

    await logAudit({
      userId: ownerId,
      action: 'create_project',
      resourceType: 'project',
      resourceId: project._id,
      details: { title: project.title },
      req
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

    // 1. Find all project memberships for this user
    const memberships = await ProjectMember.find({
      userId,
      status: { $ne: 'inactive' } // Exclude inactive members if needed
    }).select('projectId role');

    const projectIds = memberships.map(m => m.projectId);

    // Build query filters
    // BACKWARDS COMPATIBILITY: Include projects where user is owner OR has ProjectMember record
    const query = {
      $and: [
        { deletedAt: null }, // Exclude soft-deleted projects
        {
          $or: [
            { _id: { $in: projectIds } }, // Projects user is a member of (via ProjectMember)
            { ownerId: userId } // Projects user owns directly (backwards compatibility)
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
      // To filter by client, we need to find which of these projects has this specific client
      // This is a bit more complex with decoupled members.
      // We can find ProjectMembers where userId = clientId AND role = 'client'
      // AND projectId is in our allowed list.
      const clientMemberships = await ProjectMember.find({
        userId: clientId,
        role: 'client',
        projectId: { $in: projectIds }
      }).select('projectId');

      const clientProjectIds = clientMemberships.map(m => m.projectId);
      query._id = { $in: clientProjectIds };
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

    // Find projects
    // Use lean() for better performance and select only necessary fields
    const projects = await Project.find(query)
      .select('title brief status progress ownerId createdAt updatedAt dueDate stats') // Added stats, removed members/comments
      .lean() // Return plain objects for better performance
      .sort({ createdAt: -1 }); // Most recent first

    // Create a map of projectId -> userRole for easy lookup
    const roleMap = new Map(memberships.map(m => [m.projectId.toString(), m.role]));

    // OPTIMIZATION: Collect all unique user IDs first to batch fetch from Clerk
    const allUserIds = new Set();
    projects.forEach(project => {
      allUserIds.add(project.ownerId);
      // Safely check members if it exists
      if (project.members && Array.isArray(project.members)) {
        project.members.forEach(m => allUserIds.add(m.userId));
      }
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
            email: user.emailAddresses?.[0]?.emailAddress,
            avatar: user.imageUrl
          });
        } catch (err) {
          console.error(`Error fetching user ${id} from Clerk:`, err.message);
          userCache.set(id, { name: 'Unknown', email: '', avatar: null });
        }
      }));
    }

    // Get counts for invoices, files, and comments for all projects at once
    const displayedProjectIds = projects.map(p => p._id);

    // Batch fetch counts
    const [invoiceCounts, fileCounts] = await Promise.all([
      ProjectInvoice.aggregate([
        { $match: { projectId: { $in: displayedProjectIds } } },
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
        { $match: { projectId: { $in: displayedProjectIds } } },
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
    const enhancedProjects = await Promise.all(projects.map(async (project) => {
      // Determine if this is user's own project or shared project
      const isOwner = String(project.ownerId) === String(userId);

      // Get owner name from cache
      const ownerData = userCache.get(project.ownerId) || { name: 'Unknown' };
      const ownerName = ownerData.name;

      // Fetch actual members from ProjectMember collection
      const projectMembers = await ProjectMember.find({
        projectId: project._id,
        status: { $ne: 'inactive' }
      }).lean();

      // Enhance members with cached data
      const enhancedMembers = await Promise.all(projectMembers.map(async (member) => {
        // We might need to fetch this user if not in our initial batch
        let memberData = userCache.get(member.userId);

        if (!memberData) {
          try {
            const user = await clerkClient.users.getUser(member.userId);
            const displayName = user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`
              : user.username || user.emailAddresses?.[0]?.emailAddress || 'Unknown';
            memberData = {
              name: displayName,
              email: user.emailAddresses?.[0]?.emailAddress,
              avatar: user.imageUrl
            };
            userCache.set(member.userId, memberData);
          } catch (e) {
            memberData = { name: 'Unknown', email: '', avatar: null };
          }
        }

        return {
          ...member,
          name: memberData.name,
          email: memberData.email || member.email,
          avatar: memberData.avatar
        };
      }));

      // Calculate user's role
      let userRole = null;
      if (isOwner) {
        userRole = 'owner';
      } else {
        // Use roleMap for reliable role lookup
        userRole = roleMap.get(project._id.toString());

        // Fallback to embedded members if not found in map (legacy support)
        if (!userRole && project.members) {
          const member = project.members.find(m => String(m.userId) === String(userId));
          userRole = member ? member.role : null;
        }
      }

      // Get counts from maps
      const projectIdStr = project._id.toString();
      const invoiceStats = invoiceMap.get(projectIdStr) || { paid: 0, total: 0 };
      const filesCount = fileMap.get(projectIdStr) || 0;
      const commentsCount = project.stats?.commentCount || 0;

      return {
        ...project,
        ownerName,
        members: enhancedMembers, // Use the fetched members
        userRole,
        isShared: !isOwner, // Flag to indicate if this is a shared project
        invoiceStats,
        filesCount,
        commentsCount
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
// @desc    Get single project by ID
// @route   GET /api/projects/:id
// @access  Protected
export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const project = await Project.findById(id).lean();

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user is a member or owner
    const membership = await ProjectMember.findOne({
      projectId: id,
      userId: userId,
      status: { $ne: 'inactive' }
    });

    if (!membership && String(project.ownerId) !== String(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate invite link if user is owner
    let inviteLink = null;
    if (String(project.ownerId) === String(userId)) {
      const inviteToken = jwt.sign(
        {
          projectId: project._id.toString(),
          invitedBy: userId,
          role: 'client'
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
      inviteLink = `${frontendUrl}/invite?token=${inviteToken}`;
    }

    // Fetch members from ProjectMember collection
    const projectMembers = await ProjectMember.find({
      projectId: id,
      status: { $ne: 'inactive' }
    }).lean();

    // Enhance members with user details
    const enhancedMembers = await Promise.all(projectMembers.map(async (member) => {
      try {
        const user = await clerkClient.users.getUser(member.userId);
        const displayName = user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.username || user.emailAddresses?.[0]?.emailAddress || 'Unknown';

        return {
          ...member,
          name: displayName,
          email: user.emailAddresses?.[0]?.emailAddress
        };
      } catch (e) {
        return { ...member, name: 'Unknown', email: '' };
      }
    }));

    // Calculate permissions
    console.log('🔐 Permission Check Debug:');
    console.log('   - Project Owner ID:', project.ownerId, typeof project.ownerId);
    console.log('   - Request User ID:', userId, typeof userId);

    const isOwner = String(project.ownerId) === String(userId);
    console.log('   - isOwner Calculated:', isOwner);

    let userRole = isOwner ? 'owner' : membership?.role;

    // Attach members to project object
    // CRITICAL FIX: project is already a plain object due to .lean(), so we CANNOT call .toObject()
    const projectResponse = { ...project }; // Create a shallow copy to be safe
    projectResponse.members = enhancedMembers;
    projectResponse.isOwner = isOwner;
    projectResponse.userRole = userRole;
    projectResponse.isShared = !isOwner;

    // Fetch comments (paginated)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const comments = await Comment.find({ projectId: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalComments = await Comment.countDocuments({ projectId: id });

    res.json({
      project: projectResponse,
      inviteLink,
      comments: {
        data: comments,
        pagination: {
          page,
          limit,
          total: totalComments,
          pages: Math.ceil(totalComments / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

// @desc    Get project usage stats
// @route   GET /api/projects/usage
// @access  Protected
export const getProjectUsage = async (req, res) => {
  try {
    const userId = req.userId;
    const count = await Project.countDocuments({ ownerId: userId, deletedAt: null });

    // Get limit based on plan
    const user = await User.findOne({ clerkUserId: userId });
    const plan = user?.subscription?.plan || 'free';
    const limits = { free: 5, pro: 50, studio: 100 };
    const limit = limits[plan] || 5;

    res.json({ count, limit, plan });
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
};

// @desc    Generate invite link for project
// @route   POST /api/projects/:id/invite
// @access  Protected (Owner only)
export const generateInvite = async (req, res) => {
  try {
    const { id } = req.params;
    const { role = 'client' } = req.body; // Default to client if not specified
    const userId = req.userId;

    console.log('🔗 Generate invite request:', { projectId: id, userId, role });

    // Validate role
    if (!['client', 'team_member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "client" or "team_member"' });
    }

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
        role: role
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

    // Check authorization via ProjectMember
    const membership = await ProjectMember.findOne({
      projectId: id,
      userId: userId,
      status: 'active'
    });

    if (!membership) {
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

    // Check authorization via ProjectMember
    const membership = await ProjectMember.findOne({
      projectId: id,
      userId: userId,
      status: 'active'
    });

    const isOwner = String(project.ownerId) === String(userId);
    const userRole = isOwner ? ROLES.OWNER : (membership?.role || null);

    if (!userRole) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // RBAC Check: General Update

    // If trying to update title, brief, or dueDate -> Needs PROJECT_UPDATE
    if ((title || brief || dueDate) && !checkPermission(userRole, PERMISSIONS.PROJECT_UPDATE)) {
      return res.status(403).json({ error: 'You do not have permission to edit project details' });
    }

    // If trying to update tasks -> Needs TASK permissions
    if (tasks) {
      const canManageTasks = checkPermission(userRole, PERMISSIONS.TASK_CREATE) ||
        checkPermission(userRole, PERMISSIONS.TASK_UPDATE) ||
        checkPermission(userRole, PERMISSIONS.TASK_DELETE);

      if (!canManageTasks) {
        return res.status(403).json({ error: 'You do not have permission to manage tasks' });
      }
    }

    // If trying to update status
    if (status) {
      if (status === 'needs-revision') {
        if (!checkPermission(userRole, PERMISSIONS.PROJECT_REQUEST_REVISION)) {
          return res.status(403).json({ error: 'You do not have permission to request revisions' });
        }
      } else if (status === 'finalized') {
        if (!checkPermission(userRole, PERMISSIONS.PROJECT_APPROVE)) {
          return res.status(403).json({ error: 'You do not have permission to approve the project' });
        }
      } else {
        // Other status changes (active, on-hold, etc.) require generic update permission
        if (!checkPermission(userRole, PERMISSIONS.PROJECT_UPDATE)) {
          return res.status(403).json({ error: 'You do not have permission to change project status' });
        }
      }
    }

    // If trying to update progress manually
    if (progress !== undefined && !checkPermission(userRole, PERMISSIONS.PROJECT_UPDATE)) {
      return res.status(403).json({ error: 'You do not have permission to update progress' });
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

    // Capture old tasks for notification comparison
    const oldTasks = project.tasks ? JSON.parse(JSON.stringify(project.tasks)) : [];

    // Update tasks if provided
    if (tasks !== undefined) {
      project.tasks = tasks;
      console.log('📝 Tasks updated, auto-calculating progress...');
    }

    // Manual status override (only if not letting auto-calc handle it)
    if (status !== undefined && !tasks) {
      project.status = status;

      // Add system comment for status changes
      if (status === 'needs-revision' && revisionNotes) {
        await Comment.create({
          projectId: id,
          userId,
          userName,
          content: `Revision requested: ${revisionNotes}`,
          isSystemMessage: true
        });
      } else if (status === 'finalized') {
        // Create system comment
        await Comment.create({
          projectId: id,
          userId,
          userName,
          content: `✅ Project approved and finalized by ${userName || 'client'}`,
          isSystemMessage: true
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
      const oldTasksMap = new Map(oldTasks.map(t => [t._id?.toString(), t]));

      for (const newTask of tasks) {
        // Check if it's a new assignment
        // Case 1: New task with assignee
        // Case 2: Existing task with CHANGED assignee
        const oldTask = newTask._id ? oldTasksMap.get(newTask._id.toString()) : null;
        const newAssigneeId = newTask.assignedTo?.userId;
        const oldAssigneeId = oldTask?.assignedTo?.userId;

        // DEBUG LOGGING
        if (newAssigneeId) {
          console.log(`🔍 Checking task assignment: Task "${newTask.title}" assigned to ${newAssigneeId} (Actor: ${userId})`);
        }

        // Allow self-notifications for testing purposes
        if (newAssigneeId) {
          if (!oldTask || (oldAssigneeId !== newAssigneeId)) {
            console.log(`🔔 Triggering task assignment notification for user ${newAssigneeId}`);

            // Import dynamically to avoid circular dependency issues
            const { triggerNotification } = await import('../services/notificationService.js');

            await triggerNotification(
              'task.assigned',
              {
                projectId: project._id,
                taskId: newTask._id || 'new',
                taskTitle: newTask.title,
                projectTitle: project.title,
                assignedTo: newTask.assignedTo,
                priority: 'medium',
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
      console.log('   - Actor (Client):', userId);
      console.log('   - Recipient (Owner):', project.ownerId);

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
          idempotencyKey: `rev-${project._id}-${Date.now()}`, // FORCE UNIQUE FOR DEBUGGING
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
          idempotencyKey: `fin-${project._id}-${Date.now()}`, // FORCE UNIQUE FOR DEBUGGING
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

    // Check ownership/permissions via ProjectMember
    const membership = await ProjectMember.findOne({
      projectId: id,
      userId: userId,
      status: { $ne: 'inactive' }
    });

    const isOwner = String(project.ownerId) === String(userId);
    const userRole = isOwner ? ROLES.OWNER : (membership?.role || null);

    if (!checkPermission(userRole, PERMISSIONS.PROJECT_DELETE)) {
      console.log('❌ Permission denied: Delete Project', { userId, role: userRole });
      return res.status(403).json({ error: 'You do not have permission to delete this project' });
    }

    console.log('✅ Owner verified, proceeding with deletion');

    // Fetch all members for notifications and cache clearing
    const projectMembers = await ProjectMember.find({
      projectId: id,
      status: 'active'
    });

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
      members: projectMembers.map(m => ({
        userId: m.userId,
        role: m.role,
        email: m.email
      })), // Store current members snapshot
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

    await logAudit({
      userId,
      action: 'archive_project', // Soft delete is effectively archive/trash
      resourceType: 'project',
      resourceId: id,
      details: { reason },
      req
    });

    // Clear cache for all project members
    console.log('🔄 Clearing cache for project members...');
    clearUserCache(userId);

    // Send notifications and clear cache for other members
    for (const member of projectMembers) {
      if (member.userId !== userId) {
        clearUserCache(member.userId);

        try {
          await createNotificationWithIdempotency({
            projectId: project._id.toString(),
            recipients: [member.userId],
            type: 'project-deleted',
            eventType: 'project.deleted',
            actorId: userId,
            title: '🗑️ Project Deleted',
            message: `Project "${project.title}" has been moved to trash by ${userName}`,
            link: `/dashboard/trash`, // Or just dashboard since it's gone
            priority: 'high',
            category: 'project',
            metadata: {
              projectTitle: project.title,
              deletedBy: userName
            }
          });
        } catch (notifError) {
          console.error(`Failed to notify member ${member.userId} of deletion:`, notifError);
        }
      }
    }
    console.log('✅ Cache cleared and notifications sent');

    res.json({
      message: 'Project moved to trash. Will be permanently deleted after 30 days.',
      trashId: trashEntry._id
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};

// @desc    List trashed projects
// @route   GET /api/projects/trash
// @access  Protected
export const listTrash = async (req, res) => {
  try {
    const userId = req.userId;

    const trashItems = await Trash.find({
      $or: [
        { deletedBy: userId },
        { ownerId: userId }
      ]
    }).sort({ deletedAt: -1 });

    res.json(trashItems);
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

    // Delete from Trash collection if it exists there
    await Trash.findOneAndDelete({ originalProjectId: id });

    // Delete from Project collection
    await Project.findByIdAndDelete(id);

    // Also delete related data (invoices, files, etc.)
    await ProjectInvoice.deleteMany({ projectId: id });
    await ProjectFile.deleteMany({ projectId: id });

    await logAudit({
      userId,
      action: 'delete_project_permanent',
      resourceType: 'project',
      resourceId: id,
      req
    });

    res.json({ message: 'Project permanently deleted' });
  } catch (error) {
    console.error('Permanent delete error:', error);
    res.status(500).json({ error: 'Failed to permanently delete project' });
  }
};
