/**
 * Entitlement Service
 * Decouples billing status from feature access.
 */

const FEATURES = {
    MAX_PROJECTS: 'maxProjects',
    MAX_MEMBERS: 'maxMembers',
    MAX_CLIENTS: 'maxClients',
    BASIC_INVOICING: 'basicInvoicing',
    BRANDED_INVOICES: 'brandedInvoices',
    CLIENT_COLLABORATION: 'clientCollaboration',
    PRIORITY_SUPPORT: 'prioritySupport',
    REAL_TIME_UPDATES: 'realTimeUpdates',
    ADVANCED_ANALYTICS: 'advancedAnalytics',
    TEAM_PERMISSIONS: 'teamPermissions',
    CUSTOM_WORKFLOWS: 'customWorkflows'
};

const PLANS = {
    free: {
        [FEATURES.MAX_PROJECTS]: 5,
        [FEATURES.MAX_MEMBERS]: 1,
        [FEATURES.MAX_CLIENTS]: 2,
        [FEATURES.BASIC_INVOICING]: true,
        [FEATURES.BRANDED_INVOICES]: false,
        [FEATURES.CLIENT_COLLABORATION]: true,
        [FEATURES.PRIORITY_SUPPORT]: false
    },
    pro: {
        [FEATURES.MAX_PROJECTS]: 50,
        [FEATURES.MAX_MEMBERS]: 5,
        [FEATURES.MAX_CLIENTS]: -1, // Unlimited
        [FEATURES.BASIC_INVOICING]: true,
        [FEATURES.BRANDED_INVOICES]: true,
        [FEATURES.CLIENT_COLLABORATION]: true,
        [FEATURES.PRIORITY_SUPPORT]: true,
        [FEATURES.REAL_TIME_UPDATES]: true,
        [FEATURES.ADVANCED_ANALYTICS]: true
    },
    studio: {
        [FEATURES.MAX_PROJECTS]: 100,
        [FEATURES.MAX_MEMBERS]: -1, // Unlimited
        [FEATURES.MAX_CLIENTS]: -1, // Unlimited
        [FEATURES.BASIC_INVOICING]: true,
        [FEATURES.BRANDED_INVOICES]: true,
        [FEATURES.CLIENT_COLLABORATION]: true,
        [FEATURES.PRIORITY_SUPPORT]: true,
        [FEATURES.REAL_TIME_UPDATES]: true,
        [FEATURES.ADVANCED_ANALYTICS]: true,
        [FEATURES.TEAM_PERMISSIONS]: true,
        [FEATURES.CUSTOM_WORKFLOWS]: true
    }
};

export class EntitlementService {
    /**
     * Get all entitlements for a specific plan
     * @param {string} planId 
     * @returns {object}
     */
    static getEntitlements(planId) {
        return PLANS[planId] || PLANS.free;
    }

    static get FEATURES() {
        return FEATURES;
    }

    /**
     * Check if a user has access to a specific feature
     * @param {object} user - User object with subscription details
     * @param {string} feature - Feature key
     * @returns {boolean|number} - True/False or numeric limit
     */
    static checkAccess(user, feature) {
        if (!user || !user.subscription) return false;

        const { plan, status } = user.subscription;

        // Define which statuses allow access
        // Active, Trialing are obvious
        // Past Due usually allows access during grace period (e.g. 7 days)
        // Cancelled allows access until period end
        const hasAccess = ['active', 'trial', 'cancelled', 'past_due'].includes(status);

        if (!hasAccess) {
            // Fallback to free plan limits if subscription is invalid/expired
            // But only if the feature exists in free plan
            const freeEntitlements = PLANS.free;
            return freeEntitlements[feature] || false;
        }

        const entitlements = this.getEntitlements(plan);
        return entitlements[feature];
    }

    /**
     * Check if user can create more resources (e.g. projects)
     * @param {object} user 
     * @param {string} resourceType 
     * @param {number} currentCount 
     * @returns {boolean}
     */
    static canCreate(user, resourceType, currentCount) {
        let limit;

        if (resourceType === 'project') {
            limit = this.checkAccess(user, FEATURES.MAX_PROJECTS);
        } else if (resourceType === 'member') {
            limit = this.checkAccess(user, FEATURES.MAX_MEMBERS);
        } else if (resourceType === 'client') {
            limit = this.checkAccess(user, FEATURES.MAX_CLIENTS);
        }

        if (limit === -1) return true; // Unlimited
        return currentCount < limit;
    }
}

export default EntitlementService;
