import EntitlementService from '../services/EntitlementService.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import Entitlement from '../models/Entitlement.js';

/**
 * Middleware to check if user has access to a specific feature
 * @param {string} feature - Feature key from EntitlementService.FEATURES
 */
export const checkFeatureAccess = (feature) => {
    return async (req, res, next) => {
        try {
            const userId = req.userId;
            const user = await User.findOne({ clerkUserId: userId });

            if (!user) {
                return res.status(401).json({ error: 'User not found' });
            }

            const hasAccess = EntitlementService.checkAccess(user, feature);

            if (!hasAccess) {
                return res.status(403).json({
                    error: 'Feature not available on your current plan',
                    code: 'UPGRADE_REQUIRED',
                    feature
                });
            }

            next();
        } catch (error) {
            console.error('Feature access check error:', error);
            res.status(500).json({ error: 'Failed to check feature access' });
        }
    };
};

/**
 * Middleware to check if user can create more of a specific resource
 * @param {string} resourceType - 'project' or 'member'
 */
export const checkResourceLimit = (resourceType) => {
    return async (req, res, next) => {
        try {
            const userId = req.userId;
            const user = await User.findOne({ clerkUserId: userId });

            if (!user) {
                return res.status(401).json({ error: 'User not found' });
            }

            let currentCount = 0;

            if (resourceType === 'project') {
                // Count active projects owned by user
                currentCount = await Project.countDocuments({
                    ownerId: userId,
                    deletedAt: null,
                    status: { $ne: 'archived' }
                });
            } else if (resourceType === 'member') {
                // For members, we need to check the project context
                // Usually this middleware is used on a route like POST /api/projects/:id/invite
                const projectId = req.params.id || req.body.projectId;

                if (!projectId) {
                    // If no project context, we can't check member limit per project
                    // But maybe we check total members across all projects? 
                    // EntitlementService usually defines max members PER PROJECT.
                    // Let's assume per project for now.
                    return res.status(400).json({ error: 'Project ID required for member limit check' });
                }

                // Count active members in this project (excluding owner)
                currentCount = await ProjectMember.countDocuments({
                    projectId,
                    status: 'active',
                    role: { $ne: 'owner' }
                });
            }

            const canCreate = EntitlementService.canCreate(user, resourceType, currentCount);

            if (!canCreate) {
                return res.status(403).json({
                    error: `You have reached the maximum number of ${resourceType}s allowed on your plan`,
                    code: 'LIMIT_REACHED',
                    resourceType,
                    currentCount
                });
            }

            next();
        } catch (error) {
            console.error('Resource limit check error:', error);
            res.status(500).json({ error: 'Failed to check resource limit' });
        }
    };
};

/**
 * Middleware to check if user has a specific entitlement for a project
 * @param {string} scope - Entitlement scope (e.g., 'project_download')
 */
/**
 * Middleware to check if user has a specific entitlement for a project
 * @param {string} scope - Entitlement scope (e.g., 'project_download')
 */
export const checkProjectEntitlement = (scope) => {
    return async (req, res, next) => {
        try {
            const userId = req.userId;
            const projectId = req.params.id || req.body.projectId;

            if (!projectId) {
                return res.status(400).json({ error: 'Project ID required' });
            }

            // 1. Get Project and User Role
            const project = await Project.findById(projectId).select('ownerId');
            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            // Owner always has access
            if (String(project.ownerId) === String(userId)) {
                return next();
            }

            // Check Project Membership
            const membership = await ProjectMember.findOne({
                projectId,
                userId,
                status: 'active'
            });

            if (!membership) {
                return res.status(403).json({ error: 'Access denied. You are not a member of this project.' });
            }

            // 2. Role-based Entitlement Check
            // Team Members (COLLABORATOR) generally have access to files
            // Clients (CLIENT) require explicit Entitlement (payment)
            if (membership.role === 'client') {
                const entitlement = await Entitlement.findOne({
                    userId,
                    projectId,
                    scope,
                    revokedAt: null
                });

                if (entitlement) {
                    // Check expiry if applicable
                    if (entitlement.expiresAt && new Date() > new Date(entitlement.expiresAt)) {
                        return res.status(403).json({
                            error: 'Access expired. Please renew your access.',
                            code: 'ENTITLEMENT_EXPIRED'
                        });
                    }
                    return next();
                }

                return res.status(403).json({
                    error: 'Payment Required. You must pay the invoice to access these files.',
                    code: 'ENTITLEMENT_REQUIRED',
                    scope
                });
            }

            // Collaborators/Admins (Non-Clients) are allowed
            return next();

        } catch (error) {
            console.error('Project entitlement check error:', error);
            res.status(500).json({ error: 'Failed to check project entitlement' });
        }
    };
};
