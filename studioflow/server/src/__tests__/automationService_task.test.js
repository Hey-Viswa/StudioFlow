import { jest } from '@jest/globals';

describe('AutomationService Task Creation', () => {
    let automationService;
    let AutomationRule;
    let Task;
    let featureFlags;

    beforeEach(async () => {
        jest.resetModules();

        jest.unstable_mockModule('../config/featureFlags.js', () => ({
            default: {
                isEnabled: jest.fn().mockReturnValue(true)
            }
        }));

        jest.unstable_mockModule('../models/AutomationRule.js', () => ({
            default: {
                find: jest.fn().mockReturnValue({
                    sort: jest.fn().mockResolvedValue([])
                })
            }
        }));

        jest.unstable_mockModule('../models/Task.js', () => ({
            default: {
                create: jest.fn()
            }
        }));

        jest.unstable_mockModule('../services/auditService.js', () => ({
            logAudit: jest.fn()
        }));

        jest.unstable_mockModule('../services/notificationService.js', () => ({
            triggerNotification: jest.fn()
        }));

        const asModule = await import('../services/automationService.js');
        automationService = asModule.default;

        const arModule = await import('../models/AutomationRule.js');
        AutomationRule = arModule.default;

        const taskModule = await import('../models/Task.js');
        Task = taskModule.default;

        const ffModule = await import('../config/featureFlags.js');
        featureFlags = ffModule.default;
    });

    test('should create task based on comment rule', async () => {
        // Setup Rule
        const mockRules = [
            {
                isActive: true,
                triggerType: 'comment.created',
                conditions: [{ field: 'content', operator: 'contains', value: '#bug' }],
                actions: [{ type: 'create_task', params: { label: 'bug', priority: 'high' } }]
            }
        ];

        AutomationRule.find.mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockRules)
        });

        Task.create.mockResolvedValue({ _id: 'task123' });

        // Execute
        await automationService.processTaskAutomation({
            commentId: 'comment1',
            projectId: 'proj1',
            content: 'Found a serious #bug in login',
            userId: 'user1',
            link: '/link'
        });

        // Verify
        expect(Task.create).toHaveBeenCalledWith(expect.objectContaining({
            projectId: 'proj1',
            priority: 'high',
            tags: expect.arrayContaining(['bug', 'automated'])
        }));
    });

    test('should fallback to legacy logic if no rules found', async () => {
        AutomationRule.find.mockReturnValue({
            sort: jest.fn().mockResolvedValue([])
        });
        Task.create.mockResolvedValue({ _id: 'task123' });

        await automationService.processTaskAutomation({
            commentId: 'comment1',
            projectId: 'proj1',
            content: 'Need to #todo this',
            userId: 'user1',
            link: '/link'
        });

        expect(Task.create).toHaveBeenCalledWith(expect.objectContaining({
            projectId: 'proj1',
            tags: expect.arrayContaining(['todo'])
        }));
    });
});
