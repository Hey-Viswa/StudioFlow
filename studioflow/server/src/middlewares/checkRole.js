// server/src/middlewares/checkRole.js

/**
 * Middleware to check if the user has one of the required roles.
 * Assumes verifyClerk has already run and populated req.userRole.
 * 
 * @param {string[]} allowedRoles - Array of roles allowed to access the route
 */
export const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.userRole) {
            return res.status(403).json({ error: 'Access denied. No role assigned.' });
        }

        if (!allowedRoles.includes(req.userRole)) {
            return res.status(403).json({
                error: 'Access denied. Insufficient permissions.',
                required: allowedRoles,
                current: req.userRole
            });
        }

        next();
    };
};

// Pre-defined role checks
export const requireOwner = checkRole(['owner']);
export const requireAdmin = checkRole(['owner', 'admin']);
export const requireTeam = checkRole(['owner', 'admin', 'member']);
export const requireClient = checkRole(['client']);
// Admin-only guard for privileged routes
export const requireStrictAdmin = checkRole(['admin']);
