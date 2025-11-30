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

        // If scope is specific, check it (optional, depending on how strict we want to be)
        // For now, any active entitlement allows access, but we can enforce scope later
        // if (entitlement.scope !== scope && entitlement.scope !== 'all') return false;

        return true;
    } catch (error) {
        console.error('Entitlement check error:', error);
        return false;
    }
};
