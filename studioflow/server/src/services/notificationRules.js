import Project from '../models/Project.js';
import NotificationPreference from '../models/NotificationPreference.js';

/**
 * Service to determine notification recipients and apply preference rules
 */
export const NotificationRulesService = {
    /**
     * Get potential recipients for an event
     * @param {string} eventType - Type of event (e.g., 'comment.created')
     * @param {object} resource - The resource object (Project, Task, etc.)
     * @param {string} actorId - ID of the user who triggered the event
     * @returns {Promise<Array>} List of recipient objects with userId and role
     */
    async getRecipients(eventType, resource, actorId) {
        // If explicit recipients are provided in the resource (payload), use them
        if (resource.recipients && Array.isArray(resource.recipients) && resource.recipients.length > 0) {
            console.log(`📝 Using explicit recipients for ${eventType}`);
            return resource.recipients.map(r =>
                typeof r === 'string' ? { userId: r, role: 'recipient' } : r
            );
        }

        let recipients = [];

        switch (eventType) {
            case 'comment.created':
                recipients = await this.getProjectMembers(resource.projectId || resource._id);
                break;

            case 'task.assigned':
                if (resource.assignedTo?.userId) {
                    recipients = [{ userId: resource.assignedTo.userId, role: 'assignee' }];
                }
                break;

            case 'project.updated':
            case 'project.status_changed':
            case 'project.needs_revision':
            case 'project.finalized':
                recipients = await this.getProjectMembers(resource.projectId || resource._id);
                break;

            case 'file.uploaded':
                recipients = await this.getProjectMembers(resource.projectId);
                break;

            case 'invoice.created':
            case 'invoice.overdue':
                // Notify project owner (client)
                const project = await Project.findById(resource.projectId);
                if (project) {
                    recipients = project.members
                        .filter(m => m.role === 'client' || m.role === 'owner')
                        .map(m => ({ userId: m.userId, role: m.role }));
                }
                break;

            default:
                console.warn(`Unknown event type for recipient calculation: ${eventType}`);
                return [];
        }

        console.log(`🔍 Calculating recipients for ${eventType} (Actor: ${actorId})`);
        console.log(`   Found ${recipients.length} potential recipients:`, recipients.map(r => r.userId));

        // Always exclude the actor (user who triggered the event)
        const finalRecipients = recipients.filter(r => String(r.userId) !== String(actorId));

        console.log(`   Filtered to ${finalRecipients.length} recipients:`, finalRecipients.map(r => r.userId));
        return finalRecipients;
    },

    /**
     * Get all members of a project
     */
    /**
     * Get all members of a project (including owner)
     */
    async getProjectMembers(projectId) {
        const project = await Project.findById(projectId);
        if (!project) return [];

        // Import ProjectMember dynamically to avoid circular dependencies if any
        const ProjectMember = (await import('../models/ProjectMember.js')).default;

        const members = await ProjectMember.find({
            projectId,
            status: 'active'
        });

        const recipients = members.map(m => ({
            userId: m.userId,
            role: m.role
        }));

        // Ensure owner is included if not in members list
        const ownerExists = recipients.some(r => String(r.userId) === String(project.ownerId));
        if (!ownerExists) {
            recipients.push({
                userId: project.ownerId,
                role: 'owner'
            });
        }

        return recipients;
    },

    /**
     * Check if a user should be notified based on preferences
     * @param {string} userId - User ID
     * @param {string} eventType - Event type
     * @param {object} context - Additional context (projectId, isMention, etc.)
     * @returns {Promise<boolean>} True if should notify
     */
    async shouldNotify(userId, eventType, context = {}) {
        try {
            // 1. Get user preferences (or default if none)
            let prefs = await NotificationPreference.findOne({ userId });

            if (!prefs) {
                // Phase 3: "Client Default Mute"
                // If user is a Client, they shouldn't get non-critical notifications by default.
                const isClient = context.role === 'client';

                // Default preferences
                prefs = {
                    channels: { push: true, inApp: true, email: false },
                    triggers: {
                        comments: isClient ? 'mentions_only' : 'all',
                        tasks: 'assigned_only',
                        files: !isClient, // Clients don't get file notifs by default
                        project_updates: !isClient
                    },
                    dnd: { enabled: false },
                    mutedProjects: []
                };

                if (isClient) {
                    console.log(`🔇 Defaulting Client ${userId} to restricted notifications.`);
                }
            }

            // 2. Check if project is muted
            // Phase 3: Check enhanced project settings
            if (context.projectId) {
                const projectSetting = prefs.projectSettings?.find(s => String(s.projectId) === String(context.projectId));

                if (projectSetting) {
                    // Check Muted
                    if (projectSetting.muted) {
                        // Mentions and Urgent items bypass mute
                        if (!context.isUrgent && !context.isMention) return false;
                    }
                    // Check Mentions Only
                    if (projectSetting.mentionsOnly) {
                        if (!context.isMention && !context.isUrgent) return false;
                    }
                } else if (prefs.mutedProjects?.includes(context.projectId)) {
                    // Legacy Fallback
                    if (!context.isUrgent && !context.isMention) return false;
                }
            }

            // 3. Check specific triggers
            if (eventType === 'comment.created') {
                if (prefs.triggers.comments === 'none') return false;
                if (prefs.triggers.comments === 'mentions_only' && !context.isMention) return false;
            }

            if (eventType === 'task.assigned') {
                if (prefs.triggers.tasks === 'none') return false;
            }

            // 4. Check DND (Do Not Disturb)
            if (prefs.dnd?.enabled && !context.isUrgent) {
                const now = new Date();
                const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

                // Simple string comparison for time ranges (e.g., "22:00" to "08:00")
                // Handle overnight ranges
                const isOvernight = prefs.dnd.startTime > prefs.dnd.endTime;
                const inRange = isOvernight
                    ? (currentTime >= prefs.dnd.startTime || currentTime <= prefs.dnd.endTime)
                    : (currentTime >= prefs.dnd.startTime && currentTime <= prefs.dnd.endTime);

                if (inRange) {
                    console.log(`User ${userId} is in DND mode. Skipping push.`);
                    // We might still want to save to DB (in-app), but skip push. 
                    return true;
                }
            }

            return true;

        } catch (error) {
            console.error(`Error checking preferences for user ${userId}:`, error);
            return true; // Default to notify on error
        }
    },

    /**
     * Check if a notification should be batched for digest
     * @param {string} userId 
     * @param {string} eventType 
     * @returns {Promise<boolean>}
     */
    async shouldDigest(userId, eventType) {
        try {
            // Urgent notifications (invoices, mentions) usually bypass digest
            // But we can check eventType to be sure. 
            // For now, let's assume 'invoice.*' bypasses digest unless user explicitly says so (feature for later)
            if (eventType.startsWith('invoice.')) return false;

            const prefs = await NotificationPreference.findOne({ userId });
            if (!prefs || !prefs.digest) return false;

            // If Frequency is NOT realtime, then we digest
            return prefs.digest.emailFrequency !== 'realtime';
        } catch (error) {
            console.error('Error checking digest preference:', error);
            return false;
        }
    },

    /**
     * Get enabled channels for a user
     */
    async getEnabledChannels(userId, isUrgent = false) {
        const prefs = await NotificationPreference.findOne({ userId });

        if (!prefs) {
            return { inApp: true, push: true, email: false };
        }

        // If digest is enabled, and this is NOT urgent, disable email (it will go to digest)
        // Note: usage of this function assumes immediate sending. 
        // Logic in notificationService will check shouldDigest() first.
        let emailEnabled = prefs.channels.email;
        if (prefs.digest?.emailFrequency !== 'realtime' && !isUrgent) {
            emailEnabled = false; // Suppress immediate email if digesting
        }

        // Check DND for Push
        let pushEnabled = prefs.channels.push;
        if (prefs.dnd?.enabled && !isUrgent) {
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const isOvernight = prefs.dnd.startTime > prefs.dnd.endTime;
            const inRange = isOvernight
                ? (currentTime >= prefs.dnd.startTime || currentTime <= prefs.dnd.endTime)
                : (currentTime >= prefs.dnd.startTime && currentTime <= prefs.dnd.endTime);

            if (inRange) {
                pushEnabled = false;
            }
        }

        return {
            inApp: prefs.channels.inApp,
            push: pushEnabled,
            email: emailEnabled
        };
    }
};
