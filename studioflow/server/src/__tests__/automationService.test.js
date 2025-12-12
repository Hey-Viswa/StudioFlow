import { jest } from '@jest/globals';

// Define mocks check before potential hoisting issues, but unstable_mockModule handles it.
// We must await import AFTER mocking.

describe('AutomationService Tagging', () => {
    let automationService;
    let AutomationRule;
    let ProjectFile;
    let featureFlags;

    beforeEach(async () => {
        jest.resetModules();

        // Mock featureFlags
        jest.unstable_mockModule('../config/featureFlags.js', () => ({
            default: {
                isEnabled: jest.fn().mockReturnValue(true)
            }
        }));

        // Mock Models
        jest.unstable_mockModule('../models/AutomationRule.js', () => ({
            default: {
                find: jest.fn().mockReturnValue({
                    sort: jest.fn().mockResolvedValue([])
                })
            }
        }));

        jest.unstable_mockModule('../models/ProjectFile.js', () => ({
            default: {
                findByIdAndUpdate: jest.fn()
            }
        }));

        jest.unstable_mockModule('../services/auditService.js', () => ({
            logAudit: jest.fn()
        }));

        // Now import the service under test and dependencies
        const asModule = await import('../services/automationService.js');
        automationService = asModule.default;

        const arModule = await import('../models/AutomationRule.js');
        AutomationRule = arModule.default;

        const pfModule = await import('../models/ProjectFile.js');
        ProjectFile = pfModule.default;

        const ffModule = await import('../config/featureFlags.js');
        featureFlags = ffModule.default;
    });

    test('should apply tags based on extension equals rule', async () => {
        // Setup Rule
        const mockRules = [
            {
                isActive: true,
                triggerType: 'file.created',
                conditions: [{ field: 'extension', operator: 'equals', value: 'png' }],
                actions: [{ type: 'add_tag', params: { tag: 'image' } }]
            }
        ];

        AutomationRule.find.mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockRules)
        });

        // Execute
        await automationService.processTagAutomation({
            fileId: 'file123',
            projectId: 'proj1',
            filename: 'test.png',
            extension: 'png',
            userId: 'user1'
        });

        // Verify
        expect(ProjectFile.findByIdAndUpdate).toHaveBeenCalledWith(
            'file123',
            { $addToSet: { tags: { $each: ['image'] } } }
        );
    });

    test('should apply tags based on filename regex rule', async () => {
        // Setup Rule
        const mockRules = [
            {
                isActive: true,
                triggerType: 'file.created',
                conditions: [{ field: 'filename', operator: 'regex', value: '^finance_.*' }],
                actions: [{ type: 'add_tag', params: { tag: 'finance' } }]
            }
        ];

        AutomationRule.find.mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockRules)
        });

        // Execute
        await automationService.processTagAutomation({
            fileId: 'file456',
            projectId: 'proj1',
            filename: 'finance_report.pdf',
            extension: 'pdf',
            userId: 'user1'
        });

        // Verify
        expect(ProjectFile.findByIdAndUpdate).toHaveBeenCalledWith(
            'file456',
            { $addToSet: { tags: { $each: ['finance'] } } }
        );
    });

    test('should NOT apply tags if flag is disabled', async () => {
        featureFlags.isEnabled.mockReturnValue(false);

        await automationService.processTagAutomation({
            fileId: 'file123',
            projectId: 'proj1',
            filename: 'test.png',
            extension: 'png',
            userId: 'user1'
        });

        expect(AutomationRule.find).not.toHaveBeenCalled();
    });
});
