import AutomationRule from '../models/AutomationRule.js';
import ProjectFile from '../models/ProjectFile.js';
import { logAudit } from '../services/auditService.js';
import { getIO } from '../config/socket.js';

class AutomationService {

    /**
     * Process auto-tagging for a file
     * @param {Object} payload { fileId, projectId, filename, extension, userId }
     */
    async processTagAutomation(payload) {
        const { fileId, projectId, filename, extension, userId } = payload;
        console.log(`🏷️ AutomationService: Processing tags for file: ${filename} (${fileId})`);

        try {
            // 1. Fetch active rules for this project/global
            const rules = await AutomationRule.find({
                isActive: true,
                triggerType: 'file.created',
                $or: [
                    { scope: 'global' },
                    { scope: 'project', scopeId: projectId }
                ]
            }).sort({ priority: -1 });

            if (!rules.length) return;

            const newTags = new Set();

            // 2. Evaluate Rules
            for (const rule of rules) {
                // Simple Evaluation Logic
                const match = rule.conditions.every(condition => {
                    const targetValue = condition.field === 'extension' ? extension : filename;
                    if (!targetValue) return false;

                    switch (condition.operator) {
                        case 'contains': return targetValue.toLowerCase().includes(condition.value.toLowerCase());
                        case 'equals': return targetValue.toLowerCase() === condition.value.toLowerCase();
                        case 'startsWith': return targetValue.toLowerCase().startsWith(condition.value.toLowerCase());
                        case 'endsWith': return targetValue.toLowerCase().endsWith(condition.value.toLowerCase());
                        case 'regex': return new RegExp(condition.value, 'i').test(targetValue);
                        default: return false;
                    }
                });

                if (match) {
                    // Apply Actions
                    rule.actions.forEach(action => {
                        if (action.type === 'add_tag' && action.params.tag) {
                            newTags.add(action.params.tag);
                        }
                    });
                }
            }

            // 3. Apply Tags if any
            if (newTags.size > 0) {
                const tagsArray = Array.from(newTags);
                await ProjectFile.findByIdAndUpdate(fileId, {
                    $addToSet: { tags: { $each: tagsArray } }
                });

                console.log(`✅ AutomationService: Auto-tagged ${filename} with:`, tagsArray);

                // Audit
                await logAudit({
                    userId: userId || 'system',
                    action: 'automation.tag_added',
                    resourceType: 'file',
                    resourceId: fileId,
                    details: { tags: tagsArray, ruleCount: rules.length },
                    status: 'success'
                });
            }

        } catch (error) {
            console.error(`❌ AutomationService: Auto-tagging failed for ${fileId}:`, error);
            throw error;
        }
    }

    /**
     * Process task automation from comments
     * @param {Object} payload { commentId, projectId, content, userId, link }
     */
    async processTaskAutomation(payload) {
        const { commentId, projectId, content, userId, link } = payload;
        console.log(`🤖 AutomationService: Processing task automation for comment in ${projectId}`);
        // console.log(`SB_DEBUG: Payload received:`, JSON.stringify(payload));

        try {
            // 1. Parse Content for Keywords
            const standardKeywords = ['#bug', '#todo'];
            const priorityMap = {
                '#critical': 'urgent',
                '#urgent': 'urgent',
                '#high': 'high',
                '#medium': 'medium',
                '#low': 'low'
            };
            const priorityKeywords = Object.keys(priorityMap);
            const allKeywords = [...standardKeywords, ...priorityKeywords];

            const lowerContent = content.toLowerCase();
            const foundKeyword = allKeywords.find(k => lowerContent.includes(k));

            if (!foundKeyword) {
                // Not an automated task command
                return;
            }

            console.log(`✨ Found automation keyword "${foundKeyword}" in comment: ${commentId}`);

            // 2. Prepare Task Data
            // Check if triggers contain a priority
            // Strategy: We want to extract ALL known keywords to clean them from title
            // And use the "highest" priority found or the specific tag found.

            let priority = 'medium'; // default
            let label = 'automated';

            // Check specific priority tags first
            let foundPriorityTag = priorityKeywords.find(k => lowerContent.includes(k));
            if (foundPriorityTag) {
                priority = priorityMap[foundPriorityTag];
            } else if (foundKeyword === '#bug') {
                priority = 'high';
            }

            if (standardKeywords.includes(foundKeyword)) {
                label = foundKeyword.replace('#', '');
            }

            // Clean content: Remove ALL detected keywords to leave just the description
            let cleanContent = content;
            // We loop through allKeywords and remove any that are present to be safe
            // This handles cases like "#bug #high fix this" -> "fix this"
            allKeywords.forEach(k => {
                const regex = new RegExp(k, 'ig');
                cleanContent = cleanContent.replace(regex, '');
            });

            cleanContent = cleanContent.trim();
            // Remove extra spaces that might have been left
            cleanContent = cleanContent.replace(/\s+/g, ' ').trim();

            // Determine Title
            let taskTitle = '';
            if (cleanContent) {
                // Use first sentence or 80 chars
                taskTitle = cleanContent.split('\n')[0].substring(0, 80);
            } else {
                taskTitle = standardKeywords.includes(foundKeyword)
                    ? (foundKeyword === '#bug' ? 'Bug Investigation' : 'New Task')
                    : 'New Priority Task';
            }

            // Determine Description (No Source Link)
            let taskDescription = cleanContent;
            if (!taskDescription) {
                taskDescription = `Auto-generated task from ${foundKeyword} comment.`;
            }

            // Dynamic Import Task model
            const Task = (await import('../models/Task.js')).default;

            // 3. Create Task
            const newTask = await Task.create({
                projectId,
                title: taskTitle,
                description: taskDescription,
                assignedBy: 'system',
                status: 'pending',
                tags: [label, 'automated'],
                priority: priority
            });

            console.log(`✅ AutomationService: Auto-created task ${newTask._id} from comment`);

            // 4. emit Real-time Update
            try {
                const io = getIO();
                // Emit to legacy project room (project-ID) as expected by TasksTab
                io.to(`project-${projectId}`).emit('task:added', { task: newTask });
                console.log(`📡 Emitted task:added to project-${projectId}`);
            } catch (ioError) {
                console.warn('⚠️ AutomationService: Failed to emit socket event:', ioError.message);
                // Non-critical, continue
            }

            // 5. Trigger Notification (Task Created)
            try {
                const { triggerNotification } = await import('../services/notificationService.js');
                await triggerNotification(
                    'task.created',
                    {
                        projectId,
                        taskId: newTask._id,
                        title: `Auto-Task Created: ${taskTitle}`,
                        message: `A new task was created from your comment.`,
                        link: `/dashboard/projects/${projectId}?tab=tasks`,
                        category: 'task'
                    },
                    'system'
                );
            } catch (notifError) {
                console.error('⚠️ AutomationService: Failed to send auto-task notification:', notifError);
            }

            // 6. Audit Log
            await logAudit({
                userId: userId || 'system',
                action: 'automation.task_created',
                resourceType: 'task',
                resourceId: newTask._id,
                details: { keyword: foundKeyword, sourceCommentId: commentId },
                status: 'success'
            });

        } catch (error) {
            console.error(`❌ AutomationService: Task automation failed for comment ${commentId}:`, error);
            throw error;
        }
    }
}

export default new AutomationService();
