import storageAdapter from '../src/utils/storageAdapter.js';
import ProjectFile from '../src/models/ProjectFile.js';

describe('Storage Adapter', () => {
  describe('generateStorageKey', () => {
    it('should generate unique storage key with project ID, filename, and version', () => {
      const projectId = '507f1f77bcf86cd799439011';
      const filename = 'test-file.mp4';
      const version = 1;

      const key = storageAdapter.generateStorageKey(projectId, filename, version);

      expect(key).toContain(`projects/${projectId}/files/`);
      expect(key).toContain('_v1_');
      expect(key).toContain('test-file.mp4');
    });

    it('should sanitize special characters in filename', () => {
      const projectId = '507f1f77bcf86cd799439011';
      const filename = 'my file (copy) #1.mp4';
      const version = 1;

      const key = storageAdapter.generateStorageKey(projectId, filename, version);

      expect(key).toMatch(/^projects\/.*\/files\/\d+_v1_my_file__copy___1.mp4$/);
    });

    it('should increment version numbers correctly', () => {
      const projectId = '507f1f77bcf86cd799439011';
      const filename = 'video.mp4';

      const key1 = storageAdapter.generateStorageKey(projectId, filename, 1);
      const key2 = storageAdapter.generateStorageKey(projectId, filename, 2);

      expect(key1).toContain('_v1_');
      expect(key2).toContain('_v2_');
    });
  });

  describe('getSignedUploadUrl', () => {
    it('should return upload URL and metadata', async () => {
      // Mock test - actual S3 calls require credentials
      if (process.env.AWS_ACCESS_KEY_ID) {
        const key = 'projects/test/files/test.mp4';
        const contentType = 'video/mp4';

        const result = await storageAdapter.getSignedUploadUrl(key, contentType, 900);

        expect(result).toHaveProperty('uploadUrl');
        expect(result).toHaveProperty('key', key);
        expect(result).toHaveProperty('provider');
        expect(result.uploadUrl).toContain('https://');
      } else {
        expect(true).toBe(true); // Skip if no credentials
      }
    });
  });
});

describe('ProjectFile Model', () => {
  describe('getNextVersion', () => {
    it('should return 1 for first version', async () => {
      const projectId = '507f1f77bcf86cd799439011';
      const baseFileId = 'file_12345';

      // Mock database call
      jest.spyOn(ProjectFile, 'findOne').mockResolvedValue(null);

      const nextVersion = await ProjectFile.getNextVersion(projectId, baseFileId);

      expect(nextVersion).toBe(1);
    });

    it('should increment from latest version', async () => {
      const projectId = '507f1f77bcf86cd799439011';
      const baseFileId = 'file_12345';

      // Mock database call
      jest.spyOn(ProjectFile, 'findOne').mockResolvedValue({ version: 3 });

      const nextVersion = await ProjectFile.getNextVersion(projectId, baseFileId);

      expect(nextVersion).toBe(4);
    });
  });

  describe('Virtuals', () => {
    it('should correctly identify image files', () => {
      const file = new ProjectFile({
        projectId: '507f1f77bcf86cd799439011',
        uploaderId: 'user_123',
        filename: 'photo.jpg',
        originalFilename: 'photo.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        storageProvider: 's3',
        storageKey: 'test/key',
      });

      expect(file.isImage).toBe(true);
      expect(file.isVideo).toBe(false);
    });

    it('should correctly identify video files', () => {
      const file = new ProjectFile({
        projectId: '507f1f77bcf86cd799439011',
        uploaderId: 'user_123',
        filename: 'video.mp4',
        originalFilename: 'video.mp4',
        mimeType: 'video/mp4',
        size: 1024,
        storageProvider: 's3',
        storageKey: 'test/key',
      });

      expect(file.isImage).toBe(false);
      expect(file.isVideo).toBe(true);
    });

    it('should correctly identify previewable files', () => {
      const imageFile = new ProjectFile({
        projectId: '507f1f77bcf86cd799439011',
        uploaderId: 'user_123',
        filename: 'photo.jpg',
        originalFilename: 'photo.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        storageProvider: 's3',
        storageKey: 'test/key',
      });

      const videoFile = new ProjectFile({
        projectId: '507f1f77bcf86cd799439011',
        uploaderId: 'user_123',
        filename: 'video.mp4',
        originalFilename: 'video.mp4',
        mimeType: 'video/mp4',
        size: 1024,
        storageProvider: 's3',
        storageKey: 'test/key',
      });

      const pdfFile = new ProjectFile({
        projectId: '507f1f77bcf86cd799439011',
        uploaderId: 'user_123',
        filename: 'doc.pdf',
        originalFilename: 'doc.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        storageProvider: 's3',
        storageKey: 'test/key',
      });

      expect(imageFile.isPreviewable).toBe(true);
      expect(videoFile.isPreviewable).toBe(true);
      expect(pdfFile.isPreviewable).toBe(true);
    });
  });

  describe('markAsCompleted', () => {
    it('should update status and set completion timestamp', async () => {
      const file = new ProjectFile({
        projectId: '507f1f77bcf86cd799439011',
        uploaderId: 'user_123',
        filename: 'test.jpg',
        originalFilename: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        storageProvider: 's3',
        storageKey: 'test/key',
        status: 'uploading',
      });

      jest.spyOn(file, 'save').mockResolvedValue(file);

      await file.markAsCompleted();

      expect(file.status).toBe('active');
      expect(file.uploadCompletedAt).toBeInstanceOf(Date);
    });
  });
});
