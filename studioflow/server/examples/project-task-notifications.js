// Example integration for Project & Task Notifications

import { createNotification, createBulkNotifications } from '../services/notificationService.js';

// Example 1: Project invitation
export const inviteUserToProject = async (req, res) => {
  try {
    const { projectId, email, role } = req.body;
    const inviterId = req.userId;
    
    // ... your existing invite logic ...
    const project = await Project.findById(projectId);
    const inviter = await getUserInfo(inviterId);
    const invite = await Invite.create({ /* ... */ });
    
    // Find invited user by email
    const invitedUser = await findUserByEmail(email);
    
    if (invitedUser) {
      // ✅ NOTIFICATION: Project invitation
      await createNotification({
        userId: invitedUser.id,
        type: 'project-created',
        title: '📁 Project Invitation',
        message: `${inviter.name} invited you to join "${project.name}"`,
        link: `/invites/${invite._id}`,
        priority: 'high',
        sendEmail: true,
        meta: {
          projectId: project._id,
          projectName: project.name,
          role: role,
          inviterName: inviter.name
        }
      });
    }
    
    res.json({ success: true, invite });
  } catch (error) {
    console.error('Error inviting user:', error);
    res.status(500).json({ error: error.message });
  }
};

// Example 2: Task assignment
export const assignTask = async (req, res) => {
  try {
    const { taskId, assigneeId } = req.body;
    const assignerId = req.userId;
    
    // ... your existing task assignment logic ...
    const task = await Task.findById(taskId);
    const project = await Project.findById(task.projectId);
    const assigner = await getUserInfo(assignerId);
    
    task.assignedTo = assigneeId;
    await task.save();
    
    if (assigneeId !== assignerId) {
      // ✅ NOTIFICATION: Task assigned
      await createNotification({
        userId: assigneeId,
        type: 'task-assigned',
        title: '✅ New Task Assignment',
        message: `${assigner.name} assigned you: ${task.title}`,
        link: `/projects/${task.projectId}`,
        priority: 'high',
        sendEmail: true,
        meta: {
          taskId: task._id,
          taskTitle: task.title,
          projectName: project.name,
          assignerName: assigner.name
        }
      });
    }
    
    res.json({ success: true, task });
  } catch (error) {
    console.error('Error assigning task:', error);
    res.status(500).json({ error: error.message });
  }
};

// Example 3: Task status change
export const updateTaskStatus = async (req, res) => {
  try {
    const { taskId, status } = req.body;
    const userId = req.userId;
    
    const task = await Task.findById(taskId);
    const project = await Project.findById(task.projectId);
    const updater = await getUserInfo(userId);
    
    const oldStatus = task.status;
    task.status = status;
    await task.save();
    
    // Notify project owner if task is completed
    if (status === 'completed' && userId !== project.ownerId) {
      // ✅ NOTIFICATION: Task completed
      await createNotification({
        userId: project.ownerId,
        type: 'project-updated',
        title: '✨ Task Completed',
        message: `${updater.name} completed: ${task.title}`,
        link: `/projects/${task.projectId}`,
        priority: 'normal',
        sendEmail: true,
        meta: {
          taskId: task._id,
          taskTitle: task.title,
          oldStatus,
          newStatus: status
        }
      });
    }
    
    res.json({ success: true, task });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: error.message });
  }
};

// Example 4: File upload notification
export const uploadFile = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;
    
    // ... your existing file upload logic ...
    const file = await File.create({ /* ... */ });
    
    const project = await Project.findById(projectId);
    const uploader = await getUserInfo(userId);
    
    // Notify project owner if uploader is client
    if (userId !== project.ownerId) {
      // ✅ NOTIFICATION: File uploaded
      await createNotification({
        userId: project.ownerId,
        type: 'file-uploaded',
        title: '📎 New File Uploaded',
        message: `${uploader.name} uploaded ${file.filename}`,
        link: `/projects/${projectId}/files`,
        priority: 'normal',
        sendEmail: false, // Optional for file uploads
        meta: {
          fileName: file.filename,
          fileSize: file.size,
          uploaderName: uploader.name
        }
      });
    }
    
    res.json({ success: true, file });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: error.message });
  }
};

// Example 5: Project milestone notification
export const createMilestone = async (req, res) => {
  try {
    const { projectId, title, dueDate } = req.body;
    
    // ... your milestone creation logic ...
    const milestone = await Milestone.create({ /* ... */ });
    
    const project = await Project.findById(projectId);
    
    // Get all project team members
    const teamMembers = project.members.map(m => m.userId);
    
    // ✅ NOTIFICATION: Notify all team members
    await createBulkNotifications(
      teamMembers.map(memberId => ({
        userId: memberId,
        type: 'project-updated',
        title: '🎯 New Milestone',
        message: `New milestone created in ${project.name}: ${title}`,
        link: `/projects/${projectId}`,
        priority: 'normal',
        sendEmail: true,
        meta: {
          milestoneTitle: title,
          dueDate: dueDate,
          projectName: project.name
        }
      }))
    );
    
    res.json({ success: true, milestone });
  } catch (error) {
    console.error('Error creating milestone:', error);
    res.status(500).json({ error: error.message });
  }
};

// Example 6: Project deletion notification
export const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;
    
    const project = await Project.findById(projectId);
    const deleter = await getUserInfo(userId);
    
    // Get all project members except the deleter
    const membersToNotify = project.members
      .filter(m => m.userId !== userId)
      .map(m => m.userId);
    
    // ✅ NOTIFICATION: Notify all team members
    if (membersToNotify.length > 0) {
      await createBulkNotifications(
        membersToNotify.map(memberId => ({
          userId: memberId,
          type: 'project-deleted',
          title: '🗑️ Project Deleted',
          message: `${deleter.name} deleted project: ${project.name}`,
          priority: 'normal',
          sendEmail: true,
          meta: {
            projectName: project.name,
            deletedBy: deleter.name,
            deletedAt: new Date()
          }
        }))
      );
    }
    
    // ... your deletion logic ...
    await Project.findByIdAndDelete(projectId);
    
    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: error.message });
  }
};
