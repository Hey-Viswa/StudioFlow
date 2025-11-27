/**
 * Role-Based Access Control (RBAC) Utility
 * Centralized permission management for the application
 */

// Permission levels for different roles
export const ROLES = {
  OWNER: 'owner',
  CLIENT: 'client',
};

// Define permissions for each role
export const PERMISSIONS = {
  // Project permissions
  PROJECT_EDIT: 'project:edit',
  PROJECT_DELETE: 'project:delete',
  PROJECT_INVITE: 'project:invite',
  PROJECT_TRANSFER: 'project:transfer',
  
  // Task permissions
  TASK_CREATE: 'task:create',
  TASK_EDIT: 'task:edit',
  TASK_DELETE: 'task:delete',
  TASK_ASSIGN: 'task:assign',
  
  // File permissions
  FILE_UPLOAD: 'file:upload',
  FILE_DELETE: 'file:delete',
  FILE_SHARE: 'file:share',
  FILE_MANAGE_SHARING: 'file:manage_sharing',
  FILE_DOWNLOAD: 'file:download',
  FILE_VIEW: 'file:view',
  
  // Invoice permissions
  INVOICE_CREATE: 'invoice:create',
  INVOICE_EDIT: 'invoice:edit',
  INVOICE_DELETE: 'invoice:delete',
  INVOICE_SEND: 'invoice:send',
  INVOICE_VIEW: 'invoice:view',
  INVOICE_PAY: 'invoice:pay',
  
  // Comment permissions
  COMMENT_CREATE: 'comment:create',
  COMMENT_EDIT_OWN: 'comment:edit_own',
  COMMENT_EDIT_ANY: 'comment:edit_any',
  COMMENT_DELETE_OWN: 'comment:delete_own',
  COMMENT_DELETE_ANY: 'comment:delete_any',
  COMMENT_REACT: 'comment:react',
  COMMENT_REPLY: 'comment:reply',
};

// Role to permissions mapping
const ROLE_PERMISSIONS = {
  [ROLES.OWNER]: [
    // All project permissions
    PERMISSIONS.PROJECT_EDIT,
    PERMISSIONS.PROJECT_DELETE,
    PERMISSIONS.PROJECT_INVITE,
    PERMISSIONS.PROJECT_TRANSFER,
    
    // All task permissions
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.TASK_EDIT,
    PERMISSIONS.TASK_DELETE,
    PERMISSIONS.TASK_ASSIGN,
    
    // All file permissions
    PERMISSIONS.FILE_UPLOAD,
    PERMISSIONS.FILE_DELETE,
    PERMISSIONS.FILE_SHARE,
    PERMISSIONS.FILE_MANAGE_SHARING,
    PERMISSIONS.FILE_DOWNLOAD,
    PERMISSIONS.FILE_VIEW,
    
    // All invoice permissions
    PERMISSIONS.INVOICE_CREATE,
    PERMISSIONS.INVOICE_EDIT,
    PERMISSIONS.INVOICE_DELETE,
    PERMISSIONS.INVOICE_SEND,
    PERMISSIONS.INVOICE_VIEW,
    PERMISSIONS.INVOICE_PAY,
    
    // All comment permissions
    PERMISSIONS.COMMENT_CREATE,
    PERMISSIONS.COMMENT_EDIT_OWN,
    PERMISSIONS.COMMENT_EDIT_ANY,
    PERMISSIONS.COMMENT_DELETE_OWN,
    PERMISSIONS.COMMENT_DELETE_ANY,
    PERMISSIONS.COMMENT_REACT,
    PERMISSIONS.COMMENT_REPLY,
  ],
  
  [ROLES.CLIENT]: [
    // Limited file permissions (view and download shared files only)
    PERMISSIONS.FILE_VIEW,
    PERMISSIONS.FILE_DOWNLOAD, // Only for files shared with them
    
    // Invoice permissions (view and pay only)
    PERMISSIONS.INVOICE_VIEW,
    PERMISSIONS.INVOICE_PAY,
    
    // Comment permissions (create, edit own, react, reply)
    PERMISSIONS.COMMENT_CREATE,
    PERMISSIONS.COMMENT_EDIT_OWN,
    PERMISSIONS.COMMENT_DELETE_OWN,
    PERMISSIONS.COMMENT_REACT,
    PERMISSIONS.COMMENT_REPLY,
  ],
};

/**
 * Check if a role has a specific permission
 * @param {string} role - User's role
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export function hasPermission(role, permission) {
  if (!role || !permission) return false;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Check if user can perform an action on a resource
 * @param {object} user - User object with id
 * @param {string} role - User's role in the project
 * @param {string} permission - Permission to check
 * @param {object} resource - Optional resource object (e.g., comment with userId)
 * @returns {boolean}
 */
export function canPerformAction(user, role, permission, resource = null) {
  // Owner bypass - owners can do anything
  if (role === ROLES.OWNER) return true;
  
  // Check if role has the permission
  if (!hasPermission(role, permission)) return false;
  
  // For "own" permissions, verify ownership
  if (permission.includes('_own') && resource) {
    return resource.userId === user?.id || resource.uploaderId === user?.id;
  }
  
  return true;
}

/**
 * Get permission error message
 * @param {string} action - Action being attempted
 * @returns {string}
 */
export function getPermissionErrorMessage(action) {
  const messages = {
    'project:edit': 'Only the project owner can edit project details',
    'project:delete': 'Only the project owner can delete this project',
    'project:invite': 'Only the project owner can invite members',
    'project:transfer': 'Only the project owner can transfer ownership',
    'task:create': 'Only the project owner can create tasks',
    'task:edit': 'Only the project owner can edit tasks',
    'task:delete': 'Only the project owner can delete tasks',
    'file:upload': 'Only the project owner can upload files',
    'file:delete': 'Only the project owner can delete files',
    'file:share': 'Only the project owner can share files',
    'file:manage_sharing': 'Only the project owner can manage file sharing',
    'invoice:create': 'Only the project owner can create invoices',
    'invoice:edit': 'Only the project owner can edit invoices',
    'invoice:delete': 'Only the project owner can delete invoices',
    'invoice:send': 'Only the project owner can send invoices',
    'comment:edit_any': 'You can only edit your own comments',
    'comment:delete_any': 'You can only delete your own comments',
  };
  
  return messages[action] || 'You do not have permission to perform this action';
}

/**
 * Check if file is shared with user
 * @param {object} file - File object with sharedWith array
 * @param {string} userId - User ID to check
 * @returns {boolean}
 */
export function isFileSharedWithUser(file, userId) {
  if (!file || !file.sharedWith || !Array.isArray(file.sharedWith)) return false;
  return file.sharedWith.some(share => share.userId === userId);
}

/**
 * Check if user can download file
 * @param {object} file - File object
 * @param {string} userId - User ID
 * @param {string} role - User role
 * @returns {boolean}
 */
export function canDownloadFile(file, userId, role) {
  // Owners can download any file
  if (role === ROLES.OWNER) return true;
  
  // Clients can only download if file is shared with them AND allowDownload is true
  if (role === ROLES.CLIENT) {
    const sharedInfo = file.sharedWith?.find(s => s.userId === userId);
    return sharedInfo && sharedInfo.allowDownload === true;
  }
  
  return false;
}

/**
 * Check if user can view file
 * @param {object} file - File object
 * @param {string} userId - User ID
 * @param {string} role - User role
 * @returns {boolean}
 */
export function canViewFile(file, userId, role) {
  // Owners can view any file
  if (role === ROLES.OWNER) return true;
  
  // Clients can only view if file is shared with them
  if (role === ROLES.CLIENT) {
    return isFileSharedWithUser(file, userId);
  }
  
  return false;
}
