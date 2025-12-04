import mongoose from 'mongoose';
import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import OwnershipTransferRequest from '../models/OwnershipTransferRequest.js';
import Notification from '../models/Notification.js';
import { logAudit } from '../services/auditService.js';
import { ROLES } from '../utils/permissions.js';

/**
 * Request ownership transfer
 * @route POST /api/projects/:id/ownership/request
 */
export const requestTransfer = async (req, res) => {
    // Helper for logging
    const logDebug = async (msg) => {
        try {
            const fs = await import('fs');
            const path = await import('path');
            const logPath = path.resolve(process.cwd(), 'debug.log');
            fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
        } catch (e) { console.error('Log failed:', e); }
    };

    try {
        await logDebug(`Starting transfer request. Body: ${JSON.stringify(req.body)}`);
        const { id: projectId } = req.params;
        const { newOwnerId } = req.body;
        const currentOwnerId = req.userId;

        if (!newOwnerId) {
            await logDebug('Missing newOwnerId');
            return res.status(400).json({ error: 'New owner ID is required' });
        }

        if (newOwnerId === currentOwnerId) {
            await logDebug('Transfer to self');
            return res.status(400).json({ error: 'Cannot transfer ownership to yourself' });
        }

        // Verify Project and Current Owner
        const project = await Project.findById(projectId);
        if (!project) {
            await logDebug('Project not found');
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.ownerId.toString() !== currentOwnerId) {
            await logDebug('Not owner');
            return res.status(403).json({ error: 'Only the project owner can request transfer' });
        }

        // Verify New Owner is a Team Member
        const targetMember = await ProjectMember.findOne({
            projectId,
            userId: newOwnerId,
            status: 'active'
        });

        if (!targetMember) {
            await logDebug('Target member not found or inactive');
            return res.status(400).json({ error: 'Target user must be an active member of the project' });
        }

        if (targetMember.role === ROLES.CLIENT) {
            await logDebug('Target is client');
            return res.status(400).json({ error: 'Cannot transfer ownership to a client' });
        }

        // Check for existing pending request
        const existingRequest = await OwnershipTransferRequest.findOne({
            projectId,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        });

        if (existingRequest) {
            await logDebug('Existing pending request');
            return res.status(400).json({ error: 'A transfer request is already pending for this project' });
        }

        // Create Request
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48); // 48 hour expiry

        const request = await OwnershipTransferRequest.create({
            projectId,
            currentOwnerId,
            newOwnerId,
            status: 'pending',
            expiresAt
        });

        await logAudit({
            userId: currentOwnerId,
            action: 'ownership_transfer_requested',
            resourceType: 'project',
            resourceId: projectId,
            details: { newOwnerId, requestId: request._id },
            req
        });

        // Send notification to new owner
        await logDebug('Creating notification...');
        const notification = await Notification.create({
            recipientId: newOwnerId,
            actorId: currentOwnerId,
            resourceId: projectId,
            resourceType: 'project',
            type: 'ownership_transfer_request',
            title: 'Ownership Transfer Request',
            message: `You have been requested to take ownership of project "${project.title}"`,
            data: {
                url: `/dashboard/projects/${projectId}`,
                metadata: { requestId: request._id }
            },
            category: 'action'
        });
        await logDebug('Notification created');

        // Emit Socket.IO event
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${newOwnerId}`).emit('notification', notification);
            await logDebug('Socket event emitted to new owner');
        }

        res.status(200).json({
            success: true,
            message: 'Ownership transfer requested',
            requestId: request._id,
            expiresAt
        });

    } catch (error) {
        console.error('Error requesting ownership transfer:', error);
        // Debug logging to file
        try {
            const fs = await import('fs');
            const path = await import('path');
            const logPath = path.resolve(process.cwd(), 'debug.log');
            const logEntry = `[${new Date().toISOString()}] Error in requestTransfer: ${error.message}\nStack: ${error.stack}\n\n`;
            fs.appendFileSync(logPath, logEntry);
        } catch (logError) {
            console.error('Failed to write to debug log:', logError);
        }
        res.status(500).json({ error: error.message || 'Failed to request transfer' });
    }
};

/**
 * Accept ownership transfer
 * @route POST /api/projects/:id/ownership/accept
 */
export const acceptTransfer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id: projectId } = req.params;
        const { requestId } = req.body;
        const userId = req.userId; // This should be the newOwnerId

        if (!requestId) {
            return res.status(400).json({ error: 'Request ID is required' });
        }

        // Verify Request
        const request = await OwnershipTransferRequest.findOne({
            _id: requestId,
            projectId,
            status: 'pending'
        }).session(session);

        if (!request) {
            await session.abortTransaction();
            return res.status(404).json({ error: 'Transfer request not found or invalid' });
        }

        if (request.newOwnerId !== userId) {
            await session.abortTransaction();
            return res.status(403).json({ error: 'You are not the designated new owner' });
        }

        if (new Date() > request.expiresAt) {
            request.status = 'rejected'; // Auto-reject expired
            await request.save({ session });
            await session.commitTransaction();
            return res.status(400).json({ error: 'Transfer request has expired' });
        }

        // Perform Transfer
        const project = await Project.findById(projectId).session(session);
        if (!project) {
            await session.abortTransaction();
            return res.status(404).json({ error: 'Project not found' });
        }

        // 1. Update Project Owner
        project.ownerId = userId;
        await project.save({ session });

        // 2. Update Roles
        // Old Owner -> Team Member
        await ProjectMember.findOneAndUpdate(
            { projectId, userId: request.currentOwnerId },
            {
                $set: { role: ROLES.TEAM_MEMBER },
                $setOnInsert: {
                    invitedBy: request.currentOwnerId, // Self-invited if created now
                    status: 'active',
                    joinedAt: new Date()
                }
            },
            { session, upsert: true } // Upsert just in case, though should exist
        );

        // New Owner -> Owner
        await ProjectMember.findOneAndUpdate(
            { projectId, userId: userId },
            { role: ROLES.OWNER },
            { session }
        );

        // 3. Update Request Status
        request.status = 'accepted';
        await request.save({ session });

        await session.commitTransaction();

        await logAudit({
            userId: userId,
            action: 'ownership_transfer_accepted',
            resourceType: 'project',
            resourceId: projectId,
            details: { oldOwnerId: request.currentOwnerId, requestId: request._id },
            req
        });

        // Notify old owner
        const notification = await Notification.create({
            recipientId: request.currentOwnerId,
            actorId: userId,
            resourceId: projectId,
            resourceType: 'project',
            type: 'ownership_transfer_accepted',
            title: 'Ownership Transfer Accepted',
            message: `Your ownership transfer request for "${project.title}" has been accepted.`,
            data: {
                url: `/dashboard/projects/${projectId}`
            },
            category: 'info'
        });

        // Emit Socket.IO events
        const io = req.app.get('io');
        if (io) {
            // Notify old owner
            io.to(`user:${request.currentOwnerId}`).emit('notification', notification);

            // Update project UI for everyone
            io.emit('project-updated', {
                projectId,
                ownerId: userId,
                updates: { ownerId: userId }
            });
        }

        res.status(200).json({
            success: true,
            message: 'Ownership transferred successfully'
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Error accepting ownership transfer:', error);
        res.status(500).json({ error: 'Failed to accept transfer' });
    } finally {
        session.endSession();
    }
};

/**
 * Force ownership transfer (Admin/Owner override)
 * @route POST /api/projects/:id/ownership/force
 */
export const forceTransfer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id: projectId } = req.params;
        const { newOwnerId } = req.body;
        const currentOwnerId = req.userId;

        if (!newOwnerId) {
            return res.status(400).json({ error: 'New owner ID is required' });
        }

        if (newOwnerId === currentOwnerId) {
            return res.status(400).json({ error: 'Cannot transfer ownership to yourself' });
        }

        // Verify Project and Current Owner
        const project = await Project.findById(projectId).session(session);
        if (!project) {
            await session.abortTransaction();
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check permission: Only Owner (or Admin if we had that role in context)
        if (project.ownerId.toString() !== currentOwnerId) {
            await session.abortTransaction();
            return res.status(403).json({ error: 'Only the project owner can force transfer' });
        }

        // Verify New Owner is a Team Member
        const targetMember = await ProjectMember.findOne({
            projectId,
            userId: newOwnerId,
            status: 'active'
        }).session(session);

        if (!targetMember) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'Target user must be an active member of the project' });
        }

        if (targetMember.role === ROLES.CLIENT) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'Cannot transfer ownership to a client' });
        }

        // Perform Transfer

        // 1. Update Project Owner
        project.ownerId = newOwnerId;
        await project.save({ session });

        // 2. Update Roles
        // Old Owner -> Team Member
        await ProjectMember.findOneAndUpdate(
            { projectId, userId: currentOwnerId },
            {
                $set: { role: ROLES.TEAM_MEMBER },
                $setOnInsert: {
                    invitedBy: currentOwnerId, // Self-invited
                    status: 'active',
                    joinedAt: new Date()
                }
            },
            { session, upsert: true }
        );

        // New Owner -> Owner
        await ProjectMember.findOneAndUpdate(
            { projectId, userId: newOwnerId },
            { role: ROLES.OWNER },
            { session }
        );

        // 3. Log Request (for history)
        const request = await OwnershipTransferRequest.create([{
            projectId,
            currentOwnerId,
            newOwnerId,
            status: 'forced',
            type: 'forced',
            expiresAt: new Date() // Expired immediately as it's done
        }], { session });

        await session.commitTransaction();

        await logAudit({
            userId: currentOwnerId,
            action: 'ownership_transfer_forced',
            resourceType: 'project',
            resourceId: projectId,
            details: { newOwnerId, requestId: request[0]._id },
            req
        });

        // Notify new owner
        await Notification.create({
            recipientId: newOwnerId,
            actorId: currentOwnerId,
            resourceId: projectId,
            resourceType: 'project',
            type: 'ownership_transfer_accepted', // Reusing accepted type as it's done
            title: 'Ownership Transferred',
            message: `You have been made the owner of project "${project.title}" by the administrator/owner.`,
            data: {
                url: `/dashboard/projects/${projectId}`
            },
            category: 'urgent'
        });

        res.status(200).json({
            success: true,
            message: 'Ownership transferred successfully (Forced)'
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Error forcing ownership transfer:', error);
        res.status(500).json({ error: 'Failed to force transfer' });
    } finally {
        session.endSession();
    }
};

/**
 * Get pending ownership transfer request
 * @route GET /api/projects/:id/ownership/pending
 */
export const getPendingRequest = async (req, res) => {
    try {
        const { id: projectId } = req.params;
        const userId = req.userId;

        const request = await OwnershipTransferRequest.findOne({
            projectId,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        });

        if (!request) {
            return res.status(200).json({ request: null });
        }

        // Only show to current owner or new owner
        if (request.currentOwnerId !== userId && request.newOwnerId !== userId) {
            return res.status(403).json({ error: 'Not authorized to view this request' });
        }

        // Get new owner details
        const newOwner = await ProjectMember.findOne({
            projectId,
            userId: request.newOwnerId
        });

        res.status(200).json({
            request: {
                ...request.toObject(),
                newOwnerName: newOwner?.name || newOwner?.email || 'Unknown User'
            }
        });

    } catch (error) {
        console.error('Error fetching pending request:', error);
        res.status(500).json({ error: 'Failed to fetch pending request' });
    }
};

/**
 * Cancel ownership transfer request
 * @route POST /api/projects/:id/ownership/cancel
 */
export const cancelRequest = async (req, res) => {
    try {
        const { id: projectId } = req.params;
        const userId = req.userId;

        const request = await OwnershipTransferRequest.findOne({
            projectId,
            status: 'pending'
        });

        if (!request) {
            return res.status(404).json({ error: 'No pending request found' });
        }

        // Only current owner can cancel
        if (request.currentOwnerId !== userId) {
            return res.status(403).json({ error: 'Only the project owner can cancel the request' });
        }

        request.status = 'cancelled';
        await request.save();

        await logAudit({
            userId,
            action: 'ownership_transfer_cancelled',
            resourceType: 'project',
            resourceId: projectId,
            details: { requestId: request._id },
            req
        });

        res.status(200).json({
            success: true,
            message: 'Transfer request cancelled'
        });

    } catch (error) {
        console.error('Error cancelling request:', error);
        res.status(500).json({ error: 'Failed to cancel request' });
    }
};
