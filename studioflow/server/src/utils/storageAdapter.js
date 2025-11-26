import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { STORAGE_PROVIDER, storageConfig } from '../config/storage.js';

/**
 * Universal storage adapter that abstracts S3/R2/Cloudinary operations
 * Exposes: getSignedUploadUrl, getSignedDownloadUrl, verifyUpload, deleteFile
 */
class StorageAdapter {
  constructor() {
    this.provider = STORAGE_PROVIDER;
    this.client = null;
    this.bucket = null;
    this._initializeClient();
  }

  _initializeClient() {
    if (this.provider === 's3') {
      const config = storageConfig.s3;
      if (!config.accessKeyId || !config.secretAccessKey) {
        console.warn('⚠️ AWS credentials not configured. File upload will not work.');
        return;
      }
      this.client = new S3Client({
        region: config.region,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });
      this.bucket = config.bucket;
      console.log(`✅ Storage adapter initialized: S3 (bucket: ${this.bucket})`);
    } else if (this.provider === 'r2') {
      const config = storageConfig.r2;
      if (!config.accessKeyId || !config.secretAccessKey || !config.accountId) {
        console.warn('⚠️ Cloudflare R2 credentials not configured.');
        return;
      }
      // R2 is S3-compatible
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });
      this.bucket = config.bucket;
      console.log(`✅ Storage adapter initialized: Cloudflare R2 (bucket: ${this.bucket})`);
    } else {
      throw new Error(`Unsupported storage provider: ${this.provider}`);
    }
  }

  /**
   * Generate a signed upload URL for client-side direct upload
   * @param {string} key - Storage key (path) for the file
   * @param {string} contentType - MIME type of the file
   * @param {number} ttl - Time-to-live in seconds (default: 15 minutes)
   * @returns {Promise<{uploadUrl: string, key: string}>}
   */
  async getSignedUploadUrl(key, contentType, ttl = 900) {
    if (!this.client) {
      throw new Error('Storage client not initialized. Check credentials.');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: ttl });

    return {
      uploadUrl,
      key,
      provider: this.provider,
      bucket: this.bucket,
    };
  }

  /**
   * Generate a signed download URL for secure file access
   * @param {string} key - Storage key (path) for the file
   * @param {Object} options - Download options
   * @param {string} options.filename - Original filename for Content-Disposition header
   * @param {number} options.ttl - Time-to-live in seconds (default: 15 minutes)
   * @param {boolean} options.forceDownload - Force download instead of opening in browser (default: true)
   * @returns {Promise<string>}
   */
  async getSignedDownloadUrl(key, options = {}) {
    if (!this.client) {
      throw new Error('Storage client not initialized. Check credentials.');
    }

    const { filename, ttl = 900, forceDownload = true, contentType } = options;

    const commandParams = {
      Bucket: this.bucket,
      Key: key,
    };

    // Set Content-Type if provided (ensures proper MIME type for preview)
    if (contentType) {
      commandParams.ResponseContentType = contentType;
    }

    // Set Content-Disposition header
    if (filename) {
      if (forceDownload) {
        // Force download with original filename
        commandParams.ResponseContentDisposition = `attachment; filename="${encodeURIComponent(filename)}"`;
      } else {
        // Allow preview in browser (inline display)
        commandParams.ResponseContentDisposition = `inline; filename="${encodeURIComponent(filename)}"`;
      }
    }

    const command = new GetObjectCommand(commandParams);

    const downloadUrl = await getSignedUrl(this.client, command, { expiresIn: ttl });
    return downloadUrl;
  }

  /**
   * Verify that a file exists in storage (used after upload)
   * @param {string} key - Storage key (path) for the file
   * @returns {Promise<{exists: boolean, size?: number, contentType?: string}>}
   */
  async verifyUpload(key) {
    if (!this.client) {
      throw new Error('Storage client not initialized. Check credentials.');
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);

      return {
        exists: true,
        size: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
      };
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return { exists: false };
      }
      throw error;
    }
  }

  /**
   * Delete a file from storage
   * @param {string} key - Storage key (path) for the file
   * @returns {Promise<void>}
   */
  async deleteFile(key) {
    if (!this.client) {
      throw new Error('Storage client not initialized. Check credentials.');
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  /**
   * Generate a storage key for a project file
   * @param {string} projectId - Project ID
   * @param {string} filename - Original filename
   * @param {number} version - File version number
   * @returns {string}
   */
  generateStorageKey(projectId, filename, version = 1) {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `projects/${projectId}/files/${timestamp}_v${version}_${sanitizedFilename}`;
  }
}

// Singleton instance
const storageAdapter = new StorageAdapter();

export default storageAdapter;
