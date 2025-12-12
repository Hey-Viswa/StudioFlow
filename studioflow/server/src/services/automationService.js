import AutomationRule from '../models/AutomationRule.js';
import ProjectFile from '../models/ProjectFile.js';
import { logAudit } from '../services/auditService.js';
import featureFlags from '../config/featureFlags.js';

class AutomationService {

    /**
     * Process auto-tagging for a file
     * @param {Object} payload { fileId, projectId, filename, extension, userId }
     */
    async processTagAutomation(payload) {
        if (!featureFlags.isEnabled('phase3.autotagging')) return;

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
        if (!featureFlags.isEnabled('phase3.taskAutomations')) return;

        const { commentId, projectId, content, userId, link } = payload;
        console.log(`🤖 AutomationService: Processing task automation for comment in ${projectId}`);

        try {
            // 1. Fetch active rules
            const rules = await AutomationRule.find({
                isActive: true,
                triggerType: 'comment.created',
                $or: [
                    { scope: 'global' },
                    { scope: 'project', scopeId: projectId }
                ]
            }).sort({ priority: -1 });

            if (!rules.length) {
                // FALLBACK: Use default logic if no rules exist yet (for backward compatibility/testing during rollout)
                // Remove this block if we want to enforce DB rules strictly
                const keywords = ['#bug', '#todo'];
                const lowerContent = content.toLowerCase();
                const foundKeyword = keywords.find(k => lowerContent.includes(k));

                if (foundKeyword) {
                    console.log(`✨ Found legacy automation keyword "${foundKeyword}"`);

                    // Clean content: remove keyword, trim whitespace
                    let cleanContent = content.replace(foundKeyword, '').trim();

                    // Determine Title
                    let taskTitle = '';
                    if (cleanContent) {
                        // Use first line of content as title
                        taskTitle = cleanContent.split('\n')[0].substring(0, 80);
                    } else {
                        // Default if no content provided
                        taskTitle = foundKeyword === '#bug' ? 'Bug Investigation' : 'New Task';
                    }

                    // Determine Description
                    let taskDescription = cleanContent;
                    if (!taskDescription) {
                        taskDescription = `Auto-generated task from ${foundKeyword} comment. Please review the context.`;
                    }

                    // Create simulated rule
                    const legacyRule = {
                        actions: [{
                            type: 'create_task',
                            params: {
                                title: taskTitle,
                                description: taskDescription,
                                label: foundKeyword.replace('#', ''),
                                priority: foundKeyword === '#bug' ? 'high' : 'medium',
                                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Default 24h
                            }
                        }]
                    };
                    await this.executeTaskActions(legacyRule.actions, payload);
                }
                return;
            }

            // 2. Evaluate Rules
            for (const rule of rules) {
                const match = rule.conditions.every(condition => {
                    if (condition.field !== 'content') return false;

                    switch (condition.operator) {
                        case 'contains': return content.toLowerCase().includes(condition.value.toLowerCase());
                        case 'regex': return new RegExp(condition.value, 'i').test(content);
                        default: return false;
                    }
                });

                if (match) {
                    console.log(`✅ Rule Matched: ${rule.name}`);
                    await this.executeTaskActions(rule.actions, payload);
                }
            }

        } catch (error) {
            console.error(`❌ AutomationService: Task automation failed for comment ${commentId}:`, error);
            throw error;
        }
    }

    /**
     * Process automation for file version uploads
     * @param {Object} payload { fileId, projectId, version, baseFileId, userId }
     */
    async processVersionAutomation(payload) {
        if (!featureFlags.isEnabled('phase3.taskAutomations')) return;

        const { fileId, projectId, version, baseFileId, userId } = payload;
        console.log(`🤖 AutomationService: Processing version automation for file ${fileId} (v${version})`);

        try {
            // 1. Fetch active rules
            const rules = await AutomationRule.find({
                isActive: true,
                triggerType: 'file.version_created',
                $or: [
                    { scope: 'global' },
                    { scope: 'project', scopeId: projectId }
                ]
            }).sort({ priority: -1 });

            if (!rules.length) return;

            // 2. Evaluate Rules
            for (const rule of rules) {
                const match = true; // Assume match for now

                if (match) {
                    console.log(`✅ Rule Matched: ${rule.name}`);
                    await this.executeTaskActions(rule.actions, payload);
                }
            }
        } catch (error) {
            console.error(`❌ AutomationService: Version automation failed for file ${fileId}:`, error);
        }
    }

    async executeTaskActions(actions, payload) {
        // Handle payload differences (comment vs file)
        const projectId = payload.projectId;
        const userId = payload.userId;
        const content = payload.content || `Version ${payload.version} Update`;
        const link = payload.link || `/dashboard/projects/${projectId}?tab=files`;

        for (const action of actions) {
            if (action.type === 'create_task') {
                const Task = (await import('../models/Task.js')).default;

                const taskTitle = action.params?.title || content.split('\n')[0].substring(0, 80);
                const descText = action.params?.description || content;
                const taskDescription = `${descText}\n\nSource: [View Item](${link})`;
                const label = action.params?.label || 'automated';
                const priority = action.params?.priority || 'medium';
                const dueDate = action.params?.dueDate || new Date(Date.now() + 48 * 60 * 60 * 1000);

                const newTask = await Task.create({
                    projectId,
                    title: taskTitle,
                    description: taskDescription,
                    assignedBy: 'system',
                    status: 'pending',
                    tags: [label, 'automated'],
                    priority,
                    dueDate
                });

                // Emit Real-time Event
                try {
                    const app = (await import('../index.js')).app; // Or explicit io import if structured differently
                    // Typically we need access to IO. If not available easily, we can skip or rely on 'triggerNotification' if it handles events.
                    // But let's check if we can emit via the notificationService or standard event bus.
                    // A simple way is to use the same mechanism as the controller.
                    // If we lack Io access here, we rely on the client polling or the notification trigger.
                } catch (e) {
                    // Ignore
                }

                console.log(`✅ AutomationService: Auto-created task ${newTask._id} from rule`);

                await logAudit({
                    userId: userId || 'system',
                    action: 'automation.task_created',
                    resourceType: 'task',
                    resourceId: newTask._id,
                    details: { ruleId: 'auto' },
                    status: 'success'
                });

            } else if (action.type === 'auto_complete_task') {
                const Task = (await import('../models/Task.js')).default;

                const query = {
                    projectId,
                    status: { $in: ['pending', 'todo', 'in-progress'] },
                };

                if (payload.baseFileId) {
                    query.linkedFileId = { $in: [payload.baseFileId, payload.fileId] };
                }

                if (action.params?.tag) {
                    query.tags = action.params.tag;
                }

                const tasksToComplete = await Task.find(query);

                console.log(`found ${tasksToComplete.length} tasks to auto-complete`);

                for (const task of tasksToComplete) {
                    task.status = 'completed';
                    task.completedAt = new Date();
                    task.completedBy = 'system';
                    await task.save();

                    await logAudit({
                        userId: userId || 'system',
                        action: 'automation.task_completed',
                        resourceType: 'task',
                        resourceId: task._id,
                        details: { reason: 'new_version_uploaded', fileVersion: payload.version },
                        status: 'success'
                    });
                }
            }
        }
    }
}

export default new AutomationService();
