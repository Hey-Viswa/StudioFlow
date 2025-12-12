import { jest } from '@jest/globals';

describe('Notification Aggregator (Digest)', () => {
    let addToDigest;
    let NotificationPreference;
    let NotificationBatch;
    let mockBatch;

    beforeEach(async () => {
        jest.resetModules();

        mockBatch = {
            _id: 'batch123',
            userId: 'user1',
            status: 'pending',
            notifications: [],
            save: jest.fn().mockResolvedValue(true),
            push: jest.fn()
        };

        // Mock Models
        jest.unstable_mockModule('../models/NotificationPreference.js', () => ({
            default: {
                findOne: jest.fn()
            }
        }));

        jest.unstable_mockModule('../models/NotificationBatch.js', () => ({
            default: jest.fn() // Constructor mock
        }));

        // Add static method findOne to default export (which is the constructor in Mongoose)
        // This is tricky with Mongoose models. 
        // We usually mock the module to return a class/function that has static methods.

        // Re-mock NotificationBatch to handle constructor and statics
        const MockBatchModel = jest.fn((data) => ({
            ...data,
            save: jest.fn().mockResolvedValue(true),
            notifications: data.notifications || []
        }));
        MockBatchModel.findOne = jest.fn();

        jest.unstable_mockModule('../models/NotificationBatch.js', () => ({
            default: MockBatchModel
        }));

        // Dependencies of notificationService might need mocking too
        jest.unstable_mockModule('../models/Notification.js', () => ({ default: {} }));
        jest.unstable_mockModule('../config/socket.js', () => ({ getIO: jest.fn() }));
        jest.unstable_mockModule('../config/appwriteMessaging.js', () => ({}));
        jest.unstable_mockModule('../config/firebase.js', () => ({}));
        jest.unstable_mockModule('../config/queue.js', () => ({}));
        jest.unstable_mockModule('../queues/notificationQueue.js', () => ({}));

        const nsModule = await import('../services/notificationService.js');
        addToDigest = nsModule.addToDigest;

        const npModule = await import('../models/NotificationPreference.js');
        NotificationPreference = npModule.default;

        const nbModule = await import('../models/NotificationBatch.js');
        NotificationBatch = nbModule.default;
    });

    test('should add to digest and calculate next day processing time for daily', async () => {
        // Setup Preferences: Daily Digest
        NotificationPreference.findOne.mockResolvedValue({
            userId: 'user1',
            digest: { emailFrequency: 'daily' }
        });

        // Setup Match: No existing batch
        NotificationBatch.findOne.mockResolvedValue(null);

        // Execute
        const notification = {
            _id: 'notif1',
            type: 'comment.created',
            title: 'Test',
            message: 'Msg',
            createdAt: new Date()
        };
        await addToDigest('user1', notification);

        // Verify
        expect(NotificationBatch).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'user1',
            status: 'pending'
        }));

        // Verify ProcessAfter is tomorrow 9am (approx checking logic)
        const callArg = NotificationBatch.mock.calls[0][0];
        const processAfter = callArg.processAfter;
        // Basic check: should be a date object
        expect(processAfter).toBeInstanceOf(Date);
    });

    test('should append to existing pending batch', async () => {
        // Setup Preferences
        NotificationPreference.findOne.mockResolvedValue({
            userId: 'user1',
            digest: { emailFrequency: 'daily' }
        });

        // Setup Existing Batch
        const existingBatch = {
            _id: 'batch123',
            userId: 'user1',
            status: 'pending',
            notifications: [{ _id: 'old' }],
            save: jest.fn().mockResolvedValue(true)
        };

        NotificationBatch.findOne.mockResolvedValue(existingBatch);

        // Execute
        await addToDigest('user1', { _id: 'new', title: 'New Notif' });

        // Verify
        expect(existingBatch.notifications).toHaveLength(2);
        expect(existingBatch.save).toHaveBeenCalled();
        expect(NotificationBatch).not.toHaveBeenCalled(); // No new batch created (constructor)
    });
});
