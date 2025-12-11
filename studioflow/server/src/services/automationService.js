import AutomationRule from '../models/AutomationRule.js';
import ProjectFile from '../models/ProjectFile.js';
import { logAudit } from '../services/auditService.js';

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
        console.log(`SB_DEBUG: Payload received:`, JSON.stringify(payload));

        try {
            // 1. Parse Content for Keywords
            // Simple logic for Phase 3.4 Beta: #bug, #todo
            const keywords = ['#bug', '#todo'];
            const lowerContent = content.toLowerCase();
            const foundKeyword = keywords.find(k => lowerContent.includes(k));

            console.log(`SB_DEBUG: Searching keywords in "${content}". Found: ${foundKeyword}`);

            if (!foundKeyword) {
                console.log('SB_DEBUG: No keyword found. Aborting.');
                return;
            }

            console.log(`✨ Found automation keyword "${foundKeyword}" in comment: ${commentId}`);

            // 2. Prepare Task Data
            const taskTitle = content.split('\n')[0].replace(foundKeyword, '').trim().substring(0, 80) || 'New Auto-Task';
            const taskDescription = `${content}\n\nSource Comment: [View Comment](${link})`;
            const label = foundKeyword.replace('#', '');

            // Dynamic Import Task model
            const Task = (await import('../models/Task.js')).default;

            // 3. Create Task
            const newTask = await Task.create({
                projectId,
                title: taskTitle,
                description: taskDescription,
                assignedBy: 'system', // or userId if we want to attribute to the commenter
                status: 'pending',
                tags: [label, 'automated'],
                priority: label === 'bug' ? 'high' : 'medium'
            });

            console.log(`✅ AutomationService: Auto-created task ${newTask._id} from comment`);

            // 4. Trigger Notification (Task Created)
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

            // 5. Audit Log
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
