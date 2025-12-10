/**
 * File Upload Limits by Subscription Tier
 */

export const FILE_SIZE_LIMITS = {
  free: {
    maxFileSize: 50 * 1024 * 1024, // 50MB per file
    maxTotalStorage: 1024 * 1024 * 1024, // 1GB total storage
    maxFilesPerProject: 50,
    allowedFileTypes: ['image/*', 'application/pdf', 'text/*', 'application/json', 'audio/*'],
  },
  pro: {
    maxFileSize: 200 * 1024 * 1024, // 200MB per file
    maxTotalStorage: 10 * 1024 * 1024 * 1024, // 10GB total storage
    maxFilesPerProject: 500,
    allowedFileTypes: ['*'], // All file types
  },
  studio: {
    maxFileSize: 500 * 1024 * 1024, // 500MB per file
    maxTotalStorage: 50 * 1024 * 1024 * 1024, // 50GB total storage
    maxFilesPerProject: 5000,
    allowedFileTypes: ['*'], // All file types
  },
};

/**
 * Get file size limit for a subscription plan
 */
export function getMaxFileSize(plan = 'free') {
  return FILE_SIZE_LIMITS[plan]?.maxFileSize || FILE_SIZE_LIMITS.free.maxFileSize;
}

/**
 * Get total storage limit for a subscription plan
 */
export function getMaxTotalStorage(plan = 'free') {
  return FILE_SIZE_LIMITS[plan]?.maxTotalStorage || FILE_SIZE_LIMITS.free.maxTotalStorage;
}

/**
 * Get max files per project for a subscription plan
 */
export function getMaxFilesPerProject(plan = 'free') {
  return FILE_SIZE_LIMITS[plan]?.maxFilesPerProject || FILE_SIZE_LIMITS.free.maxFilesPerProject;
}

/**
 * Check if file type is allowed for subscription plan
 */
export function isFileTypeAllowed(mimeType, plan = 'free') {
  const allowedTypes = FILE_SIZE_LIMITS[plan]?.allowedFileTypes || FILE_SIZE_LIMITS.free.allowedFileTypes;

  if (allowedTypes.includes('*')) return true;

  return allowedTypes.some(pattern => {
    if (pattern.endsWith('/*')) {
      const baseType = pattern.split('/')[0];
      return mimeType.startsWith(baseType + '/');
    }
    return pattern === mimeType;
  });
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
