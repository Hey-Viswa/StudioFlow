/**
 * Feature Flags Configuration for StudioFlow
 * 
 * Uses environment variables or defaults to enable/disable features.
 * All Phase 3 automation features default to false.
 */

const featureFlags = {
    // Phase 3: Automation & Productivity
    phase3: {
        autotagging: process.env.FF_PHASE3_AUTOTAGGING === 'true',
        smartNotifications: process.env.FF_PHASE3_SMART_NOTIFICATIONS === 'true',
        taskAutomations: process.env.FF_PHASE3_TASK_AUTOMATIONS === 'true'
    },

    // Future flags can be added here
    isEnabled: (flagPath) => {
        const parts = flagPath.split('.');
        let current = featureFlags;
        for (const part of parts) {
            if (current[part] === undefined) return false;
            current = current[part];
        }
        return !!current;
    }
};

export default featureFlags;
