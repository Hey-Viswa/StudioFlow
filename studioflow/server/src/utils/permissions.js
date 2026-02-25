
/**
 * Role-Based Access Control (RBAC) System
 */

export const ROLES = {
    OWNER: 'owner',
    TEAM_MEMBER: 'team_member', // or 'member' in DB? DB uses 'team_member' usually, let's check. 
    // Actually ProjectMember schema uses 'team_member' or 'client'. 
    // Wait, ProjectMember.js schema says: enum: ['owner', 'team_member', 'client']
    // Let me double check ProjectMember.js schema first to be sure.
    CLIENT: 'client'
};

export const PERMISSIONS = {
    // Project Permissions
    PROJECT_VIEW: 'project.view',
    PROJECT_UPDATE: 'project.update',
    PROJECT_DELETE: 'project.delete',
    PROJECT_INVITE: 'project.invite',
    PROJECT_REMOVE_MEMBER: 'project.remove_member',

    // Client Specific Project Actions
    PROJECT_REQUEST_REVISION: 'project.request_revision',
    PROJECT_APPROVE: 'project.approve',

    // Task Permissions
    TASK_CREATE: 'task.create',
    TASK_VIEW: 'task.view',
    TASK_UPDATE: 'task.update',
    TASK_DELETE: 'task.delete',

    // File Permissions
    FILE_UPLOAD: 'file.upload',
    FILE_VIEW: 'file.view',
    FILE_DELETE: 'file.delete',

    // Comment Permissions
    COMMENT_CREATE: 'comment.create',
    COMMENT_DELETE: 'comment.delete', // Delete ANY comment
    COMMENT_DELETE_OWN: 'comment.delete_own' // Delete OWN comment
};

const ROLE_PERMISSIONS = {
    [ROLES.OWNER]: [
        PERMISSIONS.PROJECT_VIEW,
        PERMISSIONS.PROJECT_UPDATE,
        PERMISSIONS.PROJECT_DELETE,
        PERMISSIONS.PROJECT_INVITE,
        PERMISSIONS.PROJECT_REMOVE_MEMBER,
        PERMISSIONS.TASK_CREATE,
        PERMISSIONS.TASK_VIEW,
        PERMISSIONS.TASK_UPDATE,
        PERMISSIONS.TASK_DELETE,
        PERMISSIONS.FILE_UPLOAD,
        PERMISSIONS.FILE_VIEW,
        PERMISSIONS.FILE_DELETE,
        PERMISSIONS.COMMENT_CREATE,
        PERMISSIONS.COMMENT_DELETE,
        PERMISSIONS.COMMENT_DELETE_OWN,
        PERMISSIONS.PROJECT_REQUEST_REVISION,
        PERMISSIONS.PROJECT_APPROVE
    ],
    [ROLES.TEAM_MEMBER]: [
        PERMISSIONS.PROJECT_VIEW,
        PERMISSIONS.PROJECT_UPDATE,
        PERMISSIONS.TASK_CREATE,
        PERMISSIONS.TASK_VIEW,
        PERMISSIONS.TASK_UPDATE,
        PERMISSIONS.TASK_DELETE, // Team members can delete tasks? Matrix says Yes.
        PERMISSIONS.FILE_UPLOAD,
        PERMISSIONS.FILE_VIEW,
        PERMISSIONS.FILE_DELETE, // Only own? Matrix says "Only their own uploads". 
        // We need a way to check ownership for files. 
        // For now, let's give generic delete permission and handle ownership check in controller or context.
        PERMISSIONS.COMMENT_CREATE,
        PERMISSIONS.COMMENT_DELETE_OWN
    ],
    [ROLES.CLIENT]: [
        PERMISSIONS.PROJECT_VIEW,
        PERMISSIONS.PROJECT_REQUEST_REVISION,
        PERMISSIONS.PROJECT_APPROVE,
        PERMISSIONS.TASK_VIEW,
        PERMISSIONS.FILE_VIEW,
        PERMISSIONS.COMMENT_CREATE,
        PERMISSIONS.COMMENT_DELETE_OWN
        // File upload for client is conditional on settings. We'll handle that in controller.
    ],
    // Alias for 'member' which might be used in DB
    'member': [
        PERMISSIONS.PROJECT_VIEW,
        PERMISSIONS.PROJECT_UPDATE,
        PERMISSIONS.TASK_CREATE,
        PERMISSIONS.TASK_VIEW,
        PERMISSIONS.TASK_UPDATE,
        PERMISSIONS.TASK_DELETE,
        PERMISSIONS.FILE_UPLOAD,
        PERMISSIONS.FILE_VIEW,
        PERMISSIONS.FILE_DELETE,
        PERMISSIONS.COMMENT_CREATE,
        PERMISSIONS.COMMENT_DELETE_OWN
    ]
};

/**
 * Check if a role has a specific permission.
 * @param {string} role - The user's role (owner, team_member, client)
 * @param {string} permission - The permission to check
 * @param {object} context - Optional context for granular checks (e.g. project settings)
 * @returns {boolean}
 */
export const checkPermission = (role, permission, context = {}) => {
    if (!role) return false;

    // Normalize role (handle potential DB inconsistencies if any)
    const normalizedRole = role.toLowerCase();

    // Check if role exists in our definitions
    const permissions = ROLE_PERMISSIONS[normalizedRole];
    if (!permissions) {
        console.warn(`Unknown role encountered: ${role}`);
        return false;
    }

    // Special Case: Client File Uploads
    if (normalizedRole === ROLES.CLIENT && permission === PERMISSIONS.FILE_UPLOAD) {
        return context.allowClientUploads === true;
    }

    return permissions.includes(permission);
};

export const hasPermission = checkPermission; // Alias
