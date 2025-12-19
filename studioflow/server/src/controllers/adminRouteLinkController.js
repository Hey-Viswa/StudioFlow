import User from '../models/User.js';
import { logAudit } from '../services/auditService.js';

// Admin-only handler to link/update a Razorpay Route linked account for an owner
export const linkOwnerRouteAccount = async (req, res) => {
  const actorId = req.userId;
  const { ownerId } = req.params;
  const { razorpayLinkedAccountId, isVerified } = req.body || {};

  try {
    // Validate input
    if (!ownerId) {
      return res.status(400).json({ error: 'ownerId is required' });
    }
    if (!razorpayLinkedAccountId || typeof razorpayLinkedAccountId !== 'string' || !razorpayLinkedAccountId.trim()) {
      return res.status(400).json({ error: 'razorpayLinkedAccountId must be a non-empty string' });
    }
    if (typeof isVerified !== 'boolean') {
      return res.status(400).json({ error: 'isVerified must be a boolean' });
    }

    const user = await User.findById(ownerId);
    if (!user) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    if (user.role !== 'owner') {
      // Explicitly reject non-owners; log attempt for auditability
      await logAudit({
        userId: actorId,
        action: 'route_link_attempt_non_owner',
        resourceType: 'user',
        resourceId: ownerId,
        details: { attemptedRole: user.role },
        status: 'failure',
        req
      });
      return res.status(403).json({ error: 'User is not an owner' });
    }

    const previousLinkedAccountId = user.paymentProfile?.razorpayLinkedAccountId || null;
    const previousRouteReady = user.paymentProfile?.isRouteReady || false;

    // Update metadata only (no payment enablement here)
    user.paymentProfile = user.paymentProfile || {};
    user.paymentProfile.razorpayLinkedAccountId = razorpayLinkedAccountId.trim();
    user.paymentProfile.isRouteReady = Boolean(isVerified); // leave enableV2 untouched (default false)

    await user.save();

    // Audit trail with old/new values
    await logAudit({
      userId: actorId,
      action: 'route_link_update',
      resourceType: 'user',
      resourceId: ownerId,
      details: {
        previousLinkedAccountId,
        newLinkedAccountId: user.paymentProfile.razorpayLinkedAccountId,
        previousRouteReady,
        newRouteReady: user.paymentProfile.isRouteReady
      },
      status: 'success',
      req
    });

    return res.json({
      success: true,
      userId: ownerId,
      razorpayLinkedAccountId: user.paymentProfile.razorpayLinkedAccountId,
      isRouteReady: user.paymentProfile.isRouteReady
    });
  } catch (error) {
    console.error('Route link update failed:', error);
    return res.status(500).json({ error: 'Failed to update route link' });
  }
};
