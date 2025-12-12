import { jest } from '@jest/globals';

// Mock NotificationPreference BEFORE importing the service
jest.unstable_mockModule('../models/NotificationPreference.js', () => ({
    default: {
        findOne: jest.fn(),
    },
}));

// Dynamic imports
const { NotificationRulesService } = await import('../services/notificationRules.js');
const NotificationPreference = (await import('../models/NotificationPreference.js')).default;

describe('NotificationRulesService', () => {
    describe('shouldNotify', () => {
        const userId = 'user123';
        const projectId = 'projABC';

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return true by default if no prefs found', async () => {
            NotificationPreference.findOne.mockResolvedValue(null);
            const result = await NotificationRulesService.shouldNotify(userId, 'comment.created', { projectId });
            expect(result).toBe(true);
        });

        it('should respect legacy mutedProjects', async () => {
            NotificationPreference.findOne.mockResolvedValue({
                mutedProjects: [projectId],
                triggers: { comments: 'all' }
            });
            const result = await NotificationRulesService.shouldNotify(userId, 'comment.created', { projectId });
            expect(result).toBe(false);
        });

        it('should bypass mute for mentions', async () => {
            NotificationPreference.findOne.mockResolvedValue({
                mutedProjects: [projectId],
                triggers: { comments: 'all' }
            });
            const result = await NotificationRulesService.shouldNotify(userId, 'comment.created', { projectId, isMention: true });
            expect(result).toBe(true);
        });

        it('should respect projectSettings.muted', async () => {
            NotificationPreference.findOne.mockResolvedValue({
                projectSettings: [{ projectId, muted: true }],
                triggers: { comments: 'all' }
            });
            const result = await NotificationRulesService.shouldNotify(userId, 'comment.created', { projectId });
            expect(result).toBe(false);
        });

        it('should respect projectSettings.mentionsOnly', async () => {
            NotificationPreference.findOne.mockResolvedValue({
                projectSettings: [{ projectId, mentionsOnly: true }],
                triggers: { comments: 'all' }
            });

            // Not a mention -> should not notify
            const resultNoMention = await NotificationRulesService.shouldNotify(userId, 'comment.created', { projectId, isMention: false });
            expect(resultNoMention).toBe(false);

            // Is a mention -> should notify
            const resultMention = await NotificationRulesService.shouldNotify(userId, 'comment.created', { projectId, isMention: true });
            expect(resultMention).toBe(true);
        });
    });

    describe('shouldDigest', () => {
        const userId = 'user123';

        it('should returns false if digest is realtime', async () => {
            NotificationPreference.findOne.mockResolvedValue({
                digest: { emailFrequency: 'realtime' }
            });
            const result = await NotificationRulesService.shouldDigest(userId, 'comment.created');
            expect(result).toBe(false);
        });

        it('should returns true if digest is daily', async () => {
            NotificationPreference.findOne.mockResolvedValue({
                digest: { emailFrequency: 'daily' }
            });
            const result = await NotificationRulesService.shouldDigest(userId, 'comment.created');
            expect(result).toBe(true);
        });

        it('should return false for urgent invoices', async () => {
            NotificationPreference.findOne.mockResolvedValue({
                digest: { emailFrequency: 'daily' }
            });
            const result = await NotificationRulesService.shouldDigest(userId, 'invoice.overdue');
            expect(result).toBe(false);
        });
    });
});
