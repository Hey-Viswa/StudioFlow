import Task from '../models/Task.js';
import Project from '../models/Project.js';
import Notification from '../models/Notification.js';

// Get tasks for a project
export const getProjectTasks = async (req, res) => {
    try {
        const { projectId } = req.params;
        const tasks = await Task.find({ projectId, deletedAt: null })
            .sort({ createdAt: -1 })
            .populate('assigneeName', 'name') // Simplified populate for now
            .lean();

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create a new task
export const createTask = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { title, description, assigneeId, dueDate, priority, tags } = req.body;
        const userId = req.userId; // Fixed: Use req.userId directly from middleware

        const task = new Task({
            projectId,
            title,
            description,
            assigneeId,
            assignedBy: userId,
            dueDate,
            priority,
            tags
        });

        await task.save();

        // Trigger Project progress update (async)
        const project = await Project.findById(projectId);
        if (project) await project.updateStatusBasedOnProgress();

        res.status(201).json(task);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update task details
export const updateTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const updates = req.body;

        // Prevent overriding approval status via generic update
        delete updates.approvalStatus;
        delete updates.reviewers;

        const task = await Task.findByIdAndUpdate(taskId, updates, { new: true });

        if (!task) return res.status(404).json({ error: 'Task not found' });

        // Handle status completion check
        if (task.status === 'completed' && !task.completedAt) {
            task.completedAt = new Date();
            await task.save();
        }

        res.json(task);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// --- APPROVAL WORKFLOW ---

// Request Review
export const requestReview = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { reviewerIds, comment } = req.body; // Array of user IDs

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        task.status = 'in-review';
        task.approvalStatus = 'pending';

        // Reset reviewers if provided, or keep existing
        if (reviewerIds && reviewerIds.length > 0) {
            task.reviewers = reviewerIds.map(id => ({
                userId: id,
                status: 'pending',
                reviewedAt: null
            }));
        }

        await task.save();

        // Notify Reviewers (Placeholder)
        // await Notification.create(...)

        res.json(task);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Submit Review (Approve / Request Changes)
export const submitReview = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status, comment } = req.body; // 'approved' or 'changes_requested'
        const userId = req.userId; // Fixed: Use req.userId directly

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        // Find reviewer entry
        const reviewerIndex = task.reviewers.findIndex(r => r.userId === userId);

        if (reviewerIndex === -1 && task.reviewers.length > 0) {
            // If specific reviewers assigned, user must be one of them
            // Or if allowed, we can add them ad-hoc. Enforcing strict for now.
            return res.status(403).json({ error: 'You are not an assigned reviewer for this task' });
        }

        // Update Reviewer Status
        if (reviewerIndex !== -1) {
            task.reviewers[reviewerIndex].status = status;
            task.reviewers[reviewerIndex].comment = comment;
            task.reviewers[reviewerIndex].reviewedAt = new Date();
        } else {
            // Ad-hoc review
            task.reviewers.push({
                userId,
                status,
                comment,
                reviewedAt: new Date()
            });
        }

        // Determine Overall Task Status
        if (status === 'changes_requested') {
            task.status = 'changes-requested';
            task.approvalStatus = 'changes_requested';

            // AUTO-CREATION OF REVISION TASK
            // Get reviewer name safely
            const User = await import('../models/User.js').then(m => m.default);
            const reviewer = await User.findOne({ clerkUserId: userId }).select('firstName lastName email');
            const reviewerName = reviewer ? (reviewer.firstName + ' ' + (reviewer.lastName || '')).trim() : 'Reviewer';

            const revisionTask = new Task({
                projectId: task.projectId,
                title: `Revision: ${task.title}`,
                description: `Changes Requested by ${reviewerName}:\n\n${comment}`,
                assigneeId: task.assigneeId, // Assign back to original doer
                assignedBy: userId,
                // New Fields
                revisionTriggeredBy: task._id,
                linkedFileId: task.linkedFileId,

                status: 'todo', // Reset to todo
                priority: 'high',
                tags: [...(task.tags || []), 'revision']
            });
            await revisionTask.save();

            console.log(`♻️ Auto-created Revision Task: ${revisionTask._id} (Triggered by ${task._id})`);

        } else if (status === 'approved') {
            // Check if ALL reviewers approved (if explicit reviewers exist)
            const allApproved = task.reviewers.every(r => r.status === 'approved');
            if (allApproved || task.reviewers.length === 0) {
                task.status = 'approved';
                task.approvalStatus = 'approved';
            }
        }

        await task.save();
        res.json(task);

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const deleteTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await Task.findByIdAndUpdate(taskId, { deletedAt: new Date() });
        res.json({ message: 'Task deleted' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
