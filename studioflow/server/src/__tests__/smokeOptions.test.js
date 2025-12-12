import { jest } from '@jest/globals';

describe('Phase 3 Smoke Tests', () => {
    test('Feature Flags Configured', async () => {
        const { default: featureFlags } = await import('../config/featureFlags.js');
        expect(featureFlags).toBeDefined();
        // Check if phase3 flags exist in the object structure
        expect(featureFlags.phase3).toBeDefined();
        expect(featureFlags.phase3.autotagging).toBeDefined();
    });

    test('Services Load Without Crash', async () => {
        const { default: automationService } = await import('../services/automationService.js');
        expect(automationService).toBeDefined();
        expect(typeof automationService.processTagAutomation).toBe('function');

        const notificationService = await import('../services/notificationService.js');
        expect(notificationService.createNotification).toBeDefined();
    });
});
