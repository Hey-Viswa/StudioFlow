import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import mongoose from 'mongoose';
import Notification from '../src/models/Notification.js';
import { 
  createNotificationWithIdempotency,
  createNotification,
  createBulkNotifications 
} from '../src/services/notificationServiceV2.js';

// Mock Socket.IO
jest.mock('../src/config/socket.js', () => ({
  getIO: jest.fn(() => ({
    to: jest.fn(() => ({
      emit: jest.fn()
    }))
  }))
}));

// Mock email queue
jest.mock('../src/config/queue.js', () => ({
  emailQueue: {
    add: jest.fn(() => Promise.resolve())
  }
}));

describe('Notification Service V2', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studioflow-test');
  });

  afterAll(async () => {
    await Notification.deleteMany({});
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await Notification.deleteMany({});
  });

  describe('createNotificationWithIdempotency', () => {
    it('should create a notification and persist to DB first', async () => {
      const result = await createNotificationWithIdempotency({
        projectId: 'test-project-1',
        recipients: ['user-1'],
        type: 'project-deleted',
        title: 'Project Deleted',
        message: 'Test project was deleted',
        link: '/dashboard/trash',
        priority: 'high',
        category: 'project',
        eventType: 'project-deleted'
      });

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(1);
      
      const dbNotification = await Notification.findById(result.notifications[0]._id);
      expect(dbNotification).toBeTruthy();
      expect(dbNotification.title).toBe('Project Deleted');
    });

    it('should prevent duplicate notifications with same idempotency key', async () => {
      const params = {
        projectId: 'test-project-1',
        recipients: ['user-1'],
        type: 'project-deleted',
        title: 'Project Deleted',
        message: 'Test project was deleted',
        eventType: 'project-deleted'
      };

      // First call
      const result1 = await createNotificationWithIdempotency(params);
      expect(result1.success).toBe(true);

      // Second call with same params - should be skipped
      const result2 = await createNotificationWithIdempotency(params);
      expect(result2.skipped).toBe(true);

      // Verify only one notification in DB
      const count = await Notification.countDocuments({ 
        type: 'project-deleted',
        'metadata.projectId': 'test-project-1'
      });
      expect(count).toBe(1);
    });

    it('should handle multiple recipients correctly', async () => {
      const result = await createNotificationWithIdempotency({
        projectId: 'test-project-1',
        recipients: ['user-1', 'user-2', 'user-3'],
        type: 'project-deleted',
        title: 'Project Deleted',
        message: 'Test project was deleted',
        category: 'project'
      });

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(3);
      expect(result.count).toBe(3);

      const dbNotifications = await Notification.find({
        type: 'project-deleted'
      });
      expect(dbNotifications).toHaveLength(3);
    });

    it('should include metadata with projectId', async () => {
      const result = await createNotificationWithIdempotency({
        projectId: 'test-project-1',
        recipients: ['user-1'],
        type: 'task-assigned',
        title: 'Task Assigned',
        message: 'You have been assigned a task',
        metadata: {
          taskId: 'task-123',
          taskTitle: 'Test Task'
        }
      });

      const notification = await Notification.findById(result.notifications[0]._id);
      expect(notification.metadata.projectId).toBe('test-project-1');
      expect(notification.metadata.taskId).toBe('task-123');
      expect(notification.metadata.taskTitle).toBe('Test Task');
    });

    it('should gracefully handle errors without breaking main operation', async () => {
      // Force an error by passing invalid data
      const result = await createNotificationWithIdempotency({
        projectId: null,
        recipients: [],
        type: 'invalid-type',
        title: '',
        message: ''
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('createBulkNotifications (backward compatibility)', () => {
    it('should work with legacy API', async () => {
      const result = await createBulkNotifications({
        userIds: ['user-1', 'user-2'],
        type: 'project-updated',
        title: 'Project Updated',
        message: 'Project has been updated',
        priority: 'medium',
        category: 'project'
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
    });
  });

  describe('createNotification (backward compatibility)', () => {
    it('should work with legacy single user API', async () => {
      const result = await createNotification({
        userId: 'user-1',
        type: 'task-completed',
        title: 'Task Completed',
        message: 'Your task is complete',
        priority: 'low'
      });

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(1);
    });
  });
});
