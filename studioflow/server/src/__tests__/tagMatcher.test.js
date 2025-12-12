import { jest } from '@jest/globals';
import automationService from '../services/automationService.js';
import AutomationRule from '../models/AutomationRule.js';
import ProjectFile from '../models/ProjectFile.js';

// Mock dependencies
jest.mock('../models/AutomationRule.js', () => {
    return {
        __esModule: true,
        default: {
            find: jest.fn()
        }
    };
});
jest.mock('../models/ProjectFile.js', () => {
    return {
        __esModule: true,
        default: {
            findByIdAndUpdate: jest.fn()
        }
    };
});
jest.mock('../services/auditService.js');
jest.mock('../config/featureFlags.js', () => ({
    isEnabled: jest.fn().mockReturnValue(true) // Enable flag for tests
}));

describe('TagMatcher Logic', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockRules = [
        {
            name: 'Image Rule',
            isActive: true,
            triggerType: 'file.created',
            conditions: [{ field: 'extension', operator: 'regex', value: 'jpg|png' }],
            actions: [{ type: 'add_tag', params: { tag: 'image' } }]
        },
        {
            name: 'PDF Rule',
            isActive: true,
            triggerType: 'file.created',
            conditions: [{ field: 'extension', operator: 'equals', value: 'pdf' }],
            actions: [{ type: 'add_tag', params: { tag: 'document' } }]
        }
    ];

    // Helper to fix the structure needed by the service if it's not exactly like Mongoose doc
    const getMockRules = () => mockRules.map(r => ({
        ...r,
        conditions: {
            every: (cb) => r.conditions.every(cb)
        }
    }));

    test('should match .png extension to image tag', async () => {
        // Setup Mongoose mock to return our rules
        AutomationRule.find.mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockRules)
        });

        // Test payload
        const payload = {
            fileId: 'file123',
            projectId: 'proj1',
            filename: 'test.png',
            extension: 'png',
            userId: 'user1'
        };

        await automationService.processTagAutomation(payload);

        // Verify ProjectFile.findByIdAndUpdate was called with 'image' tag
        expect(ProjectFile.findByIdAndUpdate).toHaveBeenCalledWith(
            'file123',
            expect.objectContaining({
                $addToSet: { tags: { $each: ['image'] } }
            })
        );
    });

    test('should match .pdf extension to document tag', async () => {
        AutomationRule.find.mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockRules)
        });

        const payload = {
            fileId: 'file456',
            projectId: 'proj1',
            filename: 'contract.pdf',
            extension: 'pdf',
            userId: 'user1'
        };

        await automationService.processTagAutomation(payload);

        expect(ProjectFile.findByIdAndUpdate).toHaveBeenCalledWith(
            'file456',
            expect.objectContaining({
                $addToSet: { tags: { $each: ['document'] } }
            })
        );
    });

    test('should NOT match unknown extension', async () => {
        AutomationRule.find.mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockRules)
        });

        const payload = {
            fileId: 'file789',
            projectId: 'proj1',
            filename: 'unknown.xyz',
            extension: 'xyz',
            userId: 'user1'
        };

        await automationService.processTagAutomation(payload);

        expect(ProjectFile.findByIdAndUpdate).not.toHaveBeenCalled();
    });
});
