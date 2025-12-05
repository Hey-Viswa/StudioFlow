import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import { checkPermission, PERMISSIONS, ROLES } from '../utils/permissions.js';

/**
 * Helper: Get user's role in the project
 */
async function getProjectRole(projectId, userId) {
  const project = await Project.findById(projectId).select('ownerId settings').lean();
  if (!project) return { role: null, project: null };

  if (String(project.ownerId) === String(userId)) {
    return { role: ROLES.OWNER, project };
  }

  const membership = await ProjectMember.findOne({
    projectId,
    userId,
    status: { $ne: 'inactive' }
  });

  return { role: membership?.role || null, project };
}

// @desc    Get activity logs for a project
// @route   GET /api/audit/projects/:projectId
// @access  Protected
export const getProjectActivity = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // 1. Check Access
    const { role } = await getProjectRole(projectId, userId);
    if (!role) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 2. Fetch Logs
    // Filter out 'view' actions to keep the log clean, unless specifically requested
    const query = { 
        projectId,
        action: { $ne: 'comment.view' } // Don't show "User viewed comments" in the activity feed
    };

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // 3. Fetch User Details
    // Collect all unique user IDs from the logs
    const userIds = [...new Set(logs.map(log => log.userId))];
    
    // Fetch users from local DB
    const users = await User.find({ clerkUserId: { $in: userIds } })
      .select('clerkUserId name email')
      .lean();

    // Create a map for quick lookup
    const userMap = {};
    users.forEach(user => {
      userMap[user.clerkUserId] = user;
    });

    // 4. Format Response
    const formattedLogs = logs.map(log => {
      const user = userMap[log.userId] || { name: 'Unknown User', email: '' };
      return {
        _id: log._id,
        action: log.action,
        resourceType: log.resourceType,
        details: log.details,
        createdAt: log.createdAt,
        user: {
          id: log.userId,
          name: user.name || user.email || 'User',
          email: user.email
        }
      };
    });

    res.status(200).json({
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching project activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
};
