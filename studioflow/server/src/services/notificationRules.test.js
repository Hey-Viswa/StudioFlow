import { jest } from '@jest/globals';
import { NotificationRulesService } from './notificationRules.js';

// Mock dependencies
jest.mock('../models/Project.js', () => ({
    findById: jest.fn()
}));

jest.mock('../models/NotificationPreference.js', () => ({
    findOne: jest.fn()
}));

// Import mocks to define behavior
import Project from '../models/Project.js';
import NotificationPreference from '../models/NotificationPreference.js';

describe('NotificationRulesService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getRecipients', () => {
        it('should return all project members for comment.created', async () => {
            const mockProject = {
                _id: 'proj1',
                members: [
                    { userId: 'user1', role: 'owner' },
                    { userId: 'user2', role: 'client' }
                ]
            };
            Project.findById.mockResolvedValue(mockProject);

            const recipients = await NotificationRulesService.getRecipients(
                'comment.created',
                { projectId: 'proj1' },
                'user1' // actor
            );

            // Should exclude actor (user1)
            expect(recipients).toHaveLength(1);
            expect(recipients[0].userId).toBe('user2');
        });

        it('should return only client/owner for invoice.created', async () => {
            const mockProject = {
                _id: 'proj1',
                members: [
                    { userId: 'owner1', role: 'owner' },
                    { userId: 'client1', role: 'client' },
                    { userId: 'editor1', role: 'editor' }
                ]
            };
            Project.findById.mockResolvedValue(mockProject);

            const recipients = await NotificationRulesService.getRecipients(
                'invoice.created',
                { projectId: 'proj1' },
                'owner1'
            );

            // Should include client1, exclude owner1 (actor), exclude editor1
            expect(recipients).toHaveLength(1);
            expect(recipients[0].userId).toBe('client1');
        });
    });

    describe('shouldNotify', () => {
        it('should return true if no preferences found (defaults)', async () => {
            NotificationPreference.findOne.mockResolvedValue(null);

            const result = await NotificationRulesService.shouldNotify('user1', 'comment.created', {});
            expect(result).toBe(true);
        });

        it('should respect muted projects', async () => {
            NotificationPreference.findOne.mockResolvedValue({
                mutedProjects: ['proj1'],
                triggers: { comments: 'all' }
            });

            const result = await NotificationRulesService.shouldNotify(
                'user1',
                'comment.created',
                { projectId: 'proj1' }
            );
            expect(result).toBe(false);
        });

        it('should bypass mute if mentioned', async () => {
            NotificationPreference.findOne.mockResolvedValue({
                mutedProjects: ['proj1'],
                triggers: { comments: 'all' }
            });

            const result = await NotificationRulesService.shouldNotify(
                'user1',
                'comment.created',
                { projectId: 'proj1', isMention: true }
            );
            expect(result).toBe(true);
        });

        it('should respect DND schedule', async () => {
            // Mock Date to be 23:00 (11 PM)
            const mockDate = new Date('2023-01-01T23:00:00');
            jest.useFakeTimers().setSystemTime(mockDate);

            NotificationPreference.findOne.mockResolvedValue({
                dnd: {
                    enabled: true,
                    startTime: '22:00',
                    endTime: '08:00'
                }
            });

            // shouldNotify returns true (notification exists), but getEnabledChannels should disable push
            // Wait, shouldNotify logic currently returns true for DND but logs it. 
            // Let's check getEnabledChannels instead for DND.
            const result = await NotificationRulesService.shouldNotify('user1', 'comment.created', {});
            expect(result).toBe(true);

            const channels = await NotificationRulesService.getEnabledChannels('user1', false);
            expect(channels.push).toBe(false);
            expect(channels.inApp).toBe(true); // Assuming inApp defaults to true

            jest.useRealTimers();
        });
    });
});
