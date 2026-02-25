import AuditLog from '../models/AuditLog.js';

/**
 * Log an audit event
 * @param {Object} params
 * @param {string} params.userId - Clerk User ID
 * @param {string} params.action - Action performed (e.g., 'login', 'create_project')
 * @param {string} params.resourceType - Type of resource (project, file, payment, etc.)
 * @param {string} params.resourceId - ID of the resource
 * @param {Object} [params.details] - Additional structured details
 * @param {string} [params.status] - 'success' or 'failure'
 * @param {Object} [params.req] - Express request object (for IP/UserAgent)
 */
export const logAudit = async ({
    userId,
    action,
    resourceType,
    resourceId,
    details = {},
    status = 'success',
    req = null
}) => {
    try {
        // Extract IP and User Agent if request object is provided
        let ipAddress = null;
        let userAgent = null;

        if (req) {
            ipAddress = req.ip || req.connection?.remoteAddress || req.headers?.['x-forwarded-for'];
            userAgent = req.headers?.['user-agent'];
        }

        // Create flat metadata map from details for string-based querying if needed
        // This is optional based on the model, but good for the 'metadata' Map field
        const metadata = new Map();
        if (details) {
            Object.entries(details).forEach(([key, value]) => {
                if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                    metadata.set(key, String(value));
                }
            });
        }

        // Extract projectId from details if available
        let projectId = details.projectId || null;
        if (!projectId && resourceType === 'project') {
            projectId = resourceId;
        }

        await AuditLog.create({
            userId,
            action,
            resourceType,
            resourceId,
            projectId,
            details,
            status,
            ipAddress,
            userAgent,
            metadata
        });

    } catch (error) {
        // Fail silently to not disrupt the main flow, but log to console
        console.error('Audit Logging Failed:', error);
    }
};
