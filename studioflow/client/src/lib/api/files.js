/**
 * File Upload API Client
 * Handles signed uploads, progress tracking, and file management
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Request signed upload URL from server
 */
export async function requestSignedUpload(projectId, fileMetadata, token) {
  const response = await fetch(`${API_BASE}/projects/${projectId}/files/sign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(fileMetadata),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get signed upload URL');
  }

  return response.json();
}

/**
 * Upload file directly to storage using signed URL
 */
export async function uploadToStorage(uploadUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percentComplete = (e.loaded / e.total) * 100;
        onProgress(percentComplete);
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ success: true });
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed due to network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted by user'));
    });

    // Open connection and send
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);

    // Return xhr instance so caller can abort if needed
    return xhr;
  });
}

/**
 * Confirm upload completion with server
 */
export async function confirmUpload(projectId, confirmData, token) {
  const response = await fetch(`${API_BASE}/projects/${projectId}/files/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(confirmData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to confirm upload');
  }

  return response.json();
}

/**
 * Complete upload flow: sign → upload → confirm
 */
export async function uploadFile(projectId, file, token, options = {}) {
  const { onProgress, onStateChange, isNewVersion, baseFileId, description, tags, signal } = options;

  try {
    // Step 1: Request signed upload URL
    onStateChange?.('signing');
    const signResponse = await requestSignedUpload(
      projectId,
      {
        filename: file.name,
        contentType: file.type,
        size: file.size,
        isNewVersion,
        baseFileId,
      },
      token
    );

    const { uploadUrl, fileId, storageKey, version } = signResponse;

    // Check if aborted
    if (signal?.aborted) {
      throw new Error('Upload cancelled');
    }

    // Step 2: Upload to storage
    onStateChange?.('uploading');
    await uploadToStorage(uploadUrl, file, onProgress);

    // Check if aborted
    if (signal?.aborted) {
      throw new Error('Upload cancelled');
    }

    // Step 3: Confirm with server
    onStateChange?.('confirming');
    const confirmResponse = await confirmUpload(
      projectId,
      {
        fileId,
        storageKey,
        description,
        tags,
      },
      token
    );

    onStateChange?.('completed');
    return {
      ...confirmResponse,
      fileId,
      version,
    };
  } catch (error) {
    onStateChange?.('error', error.message);
    throw error;
  }
}

/**
 * Fetch all files for a project
 */
export async function getProjectFiles(projectId, token, options = {}) {
  const { status = 'active', includeArchived = false } = options;
  const params = new URLSearchParams({ status, includeArchived: includeArchived.toString() });

  const response = await fetch(`${API_BASE}/projects/${projectId}/files?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch files');
  }

  return response.json();
}

/**
 * Fetch single file details with download URL
 */
export async function getFileDetails(projectId, fileId, token) {
  const response = await fetch(`${API_BASE}/projects/${projectId}/files/${fileId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch file details');
  }

  return response.json();
}

/**
 * Get file preview URL
 */
export async function getFilePreviewUrl(projectId, fileId, token) {
  const response = await fetch(`${API_BASE}/projects/${projectId}/files/${fileId}/preview`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get preview URL');
  }

  return response.json();
}

/**
 * Delete a file (archive it)
 */
export async function archiveFile(projectId, fileId, token) {
  const response = await fetch(`${API_BASE}/projects/${projectId}/files/${fileId}/archive`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to archive file');
  }

  return response.json();
}

/**
 * Permanently delete a file
 */
export async function deleteFile(projectId, fileId, token) {
  const response = await fetch(`${API_BASE}/projects/${projectId}/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete file');
  }

  return response.json();
}

/**
 * Restore archived file
 */
export async function restoreFile(projectId, fileId, token) {
  const response = await fetch(`${API_BASE}/projects/${projectId}/files/${fileId}/restore`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to restore file');
  }

  return response.json();
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file icon based on MIME type
 */
export function getFileIcon(mimeType) {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎥';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
  if (mimeType.includes('word')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📊';
  return '📎';
}

/**
 * Validate file before upload
 */
export function validateFile(file, maxSize = 500 * 1024 * 1024) {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${formatFileSize(maxSize)}`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  return { valid: true };
}

/**
 * Share file with client
 */
export async function shareFileWithClient(projectId, fileId, clientId, options, token) {
  const response = await fetch(`${API_BASE}/projects/${projectId}/files/${fileId}/share`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientId,
      ...options,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to share file');
  }

  return response.json();
}

/**
 * Get shared file by token
 */
export async function getSharedFile(shareToken, token) {
  const response = await fetch(`${API_BASE}/projects/files/shared/${shareToken}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to access shared file');
  }

  return response.json();
}

/**
 * Revoke file share access
 */
export async function revokeFileShare(projectId, fileId, clientId, token) {
  const response = await fetch(`${API_BASE}/projects/${projectId}/files/${fileId}/revoke`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ clientId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to revoke access');
  }

  return response.json();
}

/**
 * Enable download for shared file
 */
export async function enableFileDownload(projectId, fileId, clientId, token) {
  const response = await fetch(`${API_BASE}/projects/${projectId}/files/${fileId}/enable-download`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ clientId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to enable download');
  }

  return response.json();
}
