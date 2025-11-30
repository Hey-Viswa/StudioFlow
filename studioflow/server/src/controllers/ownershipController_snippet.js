
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
