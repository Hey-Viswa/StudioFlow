import jwt from 'jsonwebtoken';
import Project from '../models/Project.js';
import { createClerkClient } from '@clerk/backend';
import { createNotificationWithIdempotency } from '../services/notificationServiceV2.js';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});

// @desc    Accept project invite
// @route   POST /api/invites/accept
// @access  Protected
export const acceptInvite = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.userId; // From Clerk middleware

    if (!token) {
      return res.status(400).json({ error: 'Invite token is required' });
    }

    // Verify and decode the invite token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(400).json({ error: 'Invite link has expired' });
      }
      return res.status(400).json({ error: 'Invalid invite token' });
    }

    const { projectId, role, invitedBy } = decoded;

    // Find the project
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user is the owner
    if (String(project.ownerId) === String(userId)) {
      return res.status(400).json({ error: 'You are the owner of this project and cannot join via invite.' });
    }

    // Check if user is already a member
    if (await project.isMember(userId)) {
      return res.status(200).json({
        message: 'You are already a member of this project',
        project: {
          _id: project._id,
          title: project.title,
          userRole: await project.getUserRole(userId)
        },
        alreadyMember: true
      });
    }

    // Fetch user details from Clerk
    let userEmail = '';
    let userName = '';
    try {
      const user = await clerkClient.users.getUser(userId);
      userEmail = user.emailAddresses?.[0]?.emailAddress || '';
      userName = user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.username || user.firstName || userEmail;
    } catch (err) {
      console.error('Error fetching user from Clerk:', err);
      // Continue without user details
    }

    // Add user to ProjectMember collection
    await import('../models/ProjectMember.js').then(async ({ default: ProjectMember }) => {
      await ProjectMember.findOneAndUpdate(
        { projectId, userId },
        {
          projectId,
          userId,
          email: userEmail,
          name: userName,
          role: role || 'client',
          status: 'active',
          joinedAt: new Date(),
          invitedBy: invitedBy || project.ownerId // Use token's invitedBy, fallback to owner
        },
        { upsert: true, new: true }
      );
    });

    // Legacy support: keep embedded members for now (optional, but good for safety)
    // project.members.push({ ... }); 
    // We can skip legacy push to avoid confusion, as we are moving away from it.
    // But to be safe, let's NOT push to deprecated array to force usage of new collection.

    // Update project timestamp
    project.updatedAt = new Date();
    await project.save();

    // Emit Socket.IO event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`project-${projectId}`).emit('member-joined', {
        projectId,
        member: {
          userId,
          name: userName,
          email: userEmail,
          role: role || 'client'
        }
      });
    }

    // Notify project owner
    try {
      await createNotificationWithIdempotency({
        projectId: projectId,
        recipients: [project.ownerId],
        type: 'project-invitation',
        title: '✉️ New Member Joined',
        message: `${userName} has joined your project "${project.title}"`,
        link: `/dashboard/projects/${projectId}`,
        priority: 'medium',
        category: 'project',
        eventType: 'member-joined',
        metadata: {
          projectId,
          newMemberUserId: userId,
          newMemberName: userName
        }
      });
    } catch (notifError) {
      console.error('Error sending join notification:', notifError);
    }

    res.status(200).json({
      message: 'Successfully joined project',
      project: {
        _id: project._id,
        title: project.title,
        brief: project.brief,
        status: project.status,
        dueDate: project.dueDate,
        userRole: role || 'client'
      }
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ error: 'Failed to accept invite' });
  }
};

// @desc    Verify invite token without accepting
// @route   POST /api/invites/verify
// @access  Public (no auth required to check if link is valid)
export const verifyInvite = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(400).json({
          valid: false,
          error: 'Invite link has expired'
        });
      }
      return res.status(400).json({
        valid: false,
        error: 'Invalid invite token'
      });
    }

    const { projectId } = decoded;

    // Check if project exists
    const project = await Project.findById(projectId).select('title brief status');

    if (!project) {
      return res.status(404).json({
        valid: false,
        error: 'Project not found'
      });
    }

    res.json({
      valid: true,
      project: {
        title: project.title,
        brief: project.brief,
        status: project.status,
        role: decoded.role || 'client' // Include role from token
      }
    });
  } catch (error) {
    console.error('Verify invite error:', error);
    res.status(500).json({
      valid: false,
      error: 'Failed to verify invite'
    });
  }
};
