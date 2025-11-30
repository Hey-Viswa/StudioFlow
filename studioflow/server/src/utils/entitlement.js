import Entitlement from '../models/Entitlement.js';

/**
 * Verify if a user has a valid entitlement for a project
 * @param {string} userId - Clerk User ID
 * @param {string} projectId - Project ID
 * @param {string} [scope='project_download'] - Required scope
 * @returns {Promise<boolean>} - True if entitled
 */
export const verifyEntitlement = async (userId, projectId, scope = 'project_download') => {
    try {
        const entitlement = await Entitlement.findOne({
            userId,
            projectId,
            revokedAt: null
        });

        if (!entitlement) return false;

        // Check expiry
        if (entitlement.expiresAt && new Date() > new Date(entitlement.expiresAt)) {
            return false;
        }

        return true;
    } catch (error) {
        console.error('Entitlement check error:', error);
        return false;
    }
};
