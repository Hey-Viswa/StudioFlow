import { jest } from '@jest/globals';

describe('AutomationService Version Automation', () => {
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
                find: jest.fn(),
                create: jest.fn() // Used if rule creates task
            }
        }));

        jest.unstable_mockModule('../services/auditService.js', () => ({
            logAudit: jest.fn()
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

    test('should auto-complete tasks on version upload', async () => {
        // Setup Rule
        const mockRules = [
            {
                isActive: true,
                triggerType: 'file.version_created',
                actions: [{ type: 'auto_complete_task', params: { tag: 'revision' } }]
            }
        ];

        AutomationRule.find.mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockRules)
        });

        // Mock Tasks
        const mockTask = {
            _id: 'task1',
            status: 'in-progress',
            save: jest.fn().mockResolvedValue(true)
        };
        Task.find.mockResolvedValue([mockTask]);

        // Execute
        await automationService.processVersionAutomation({
            fileId: 'fileV2',
            projectId: 'proj1',
            version: 2,
            baseFileId: 'fileV1',
            userId: 'user1'
        });

        // Verify
        expect(Task.find).toHaveBeenCalledWith(expect.objectContaining({
            projectId: 'proj1',
            linkedFileId: expect.anything(),
            tags: 'revision'
        }));

        expect(mockTask.save).toHaveBeenCalled();
    });
});
