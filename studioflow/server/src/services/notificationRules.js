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
                // Default preferences
                prefs = {
                    channels: { push: true, inApp: true, email: false },
                    triggers: { comments: 'all', tasks: 'assigned_only' },
                    dnd: { enabled: false },
                    mutedProjects: []
                };
            }

            // 2. Check if project is muted
            if (context.projectId && prefs.mutedProjects?.includes(context.projectId)) {
                // Mentions usually bypass mute, but let's be strict for now unless it's urgent
                if (!context.isUrgent && !context.isMention) return false;
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
                    // For this function, we'll return true but the caller should handle channel selection.
                    // Let's return a special object or just true/false? 
                    // For simplicity, let's assume this checks if they want *any* notification.
                    // DND usually suppresses push/sound, not the existence of the notification.
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
     * Get enabled channels for a user
     */
    async getEnabledChannels(userId, isUrgent = false) {
        const prefs = await NotificationPreference.findOne({ userId });

        if (!prefs) {
            return { inApp: true, push: true, email: false };
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
            email: prefs.channels.email
        };
    }
};
