import Project from '../models/Project.js';
import Trash from '../models/Trash.js';
import { createClerkClient } from '@clerk/backend';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});

// @desc    Soft delete project (move to trash)
// @route   DELETE /api/projects/:id
// @access  Protected (Owner only)
export const softDeleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { reason } = req.body; // Optional delete reason

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user is owner
    if (project.ownerId !== userId) {
      return res.status(403).json({ error: 'Only the project owner can delete this project' });
    }

    // Get user details for deletion record
    let userName = '';
    try {
      const user = await clerkClient.users.getUser(userId);
      userName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.username || user.firstName || user.emailAddresses?.[0]?.emailAddress || '';
    } catch (err) {
      console.error('Error fetching user from Clerk:', err);
    }

    // Create trash entry with full project data
    const trashEntry = new Trash({
      originalProjectId: project._id.toString(),
      title: project.title,
      brief: project.brief,
      ownerId: project.ownerId,
      members: project.members,
      status: project.status,
      progress: project.progress,
      dueDate: project.dueDate,
      paymentInfo: project.paymentInfo,
      deletedBy: userId,
      deletedByName: userName,
      deleteReason: reason,
      fullProjectData: project.toObject() // Store complete project data
    });

    await trashEntry.save();

    // Delete the project from main collection
    await Project.findByIdAndDelete(id);

    res.json({
      message: 'Project moved to trash',
      trashId: trashEntry._id,
      expiresIn: '30 days'
    });
  } catch (error) {
    console.error('Soft delete error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};

// @desc    Get all trashed projects for user
// @route   GET /api/trash
// @access  Protected
export const getTrashedProjects = async (req, res) => {
  try {
    const userId = req.userId;

    // Find projects deleted by user or owned by user
    const trashedProjects = await Trash.find({
      $or: [
        { ownerId: userId },
        { deletedBy: userId },
        { 'members.userId': userId }
      ]
    }).sort({ deletedAt: -1 });

    // Add days remaining to each project
    const projectsWithDetails = trashedProjects.map(project => {
      const projectObj = project.toObject();
      return {
        ...projectObj,
        daysRemaining: project.getDaysRemaining()
      };
    });

    res.json(projectsWithDetails);
  } catch (error) {
    console.error('Get trash error:', error);
    res.status(500).json({ error: 'Failed to fetch trashed projects' });
  }
};

// @desc    Restore project from trash
// @route   POST /api/trash/:id/restore
// @access  Protected
export const restoreProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const trashEntry = await Trash.findById(id);

    if (!trashEntry) {
      return res.status(404).json({ error: 'Trashed project not found' });
    }

    // Check if user can restore (owner or deleter)
    if (!trashEntry.canRestore(userId)) {
      return res.status(403).json({ error: 'You do not have permission to restore this project' });
    }

    // Check if project with same ID already exists
    const existingProject = await Project.findById(trashEntry.originalProjectId);
    if (existingProject) {
      return res.status(400).json({ error: 'A project with this ID already exists. Cannot restore.' });
    }

    // Restore project from full data
    const restoredProject = new Project(trashEntry.fullProjectData);
    await restoredProject.save();

    // Remove from trash
    await Trash.findByIdAndDelete(id);

    res.json({
      message: 'Project restored successfully',
      project: restoredProject
    });
  } catch (error) {
    console.error('Restore project error:', error);
    res.status(500).json({ error: 'Failed to restore project' });
  }
};

// @desc    Permanently delete project from trash
// @route   DELETE /api/trash/:id
// @access  Protected
export const permanentlyDeleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const trashEntry = await Trash.findById(id);

    if (!trashEntry) {
      return res.status(404).json({ error: 'Trashed project not found' });
    }

    // Check if user can delete (owner or deleter)
    if (!trashEntry.canRestore(userId)) {
      return res.status(403).json({ error: 'You do not have permission to permanently delete this project' });
    }

    await Trash.findByIdAndDelete(id);

    res.json({ message: 'Project permanently deleted' });
  } catch (error) {
    console.error('Permanent delete error:', error);
    res.status(500).json({ error: 'Failed to permanently delete project' });
  }
};

// @desc    Empty entire trash (delete all trashed projects for user)
// @route   DELETE /api/trash/empty
// @access  Protected
export const emptyTrash = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await Trash.deleteMany({
      $or: [
        { ownerId: userId },
        { deletedBy: userId }
      ]
    });

    res.json({
      message: 'Trash emptied successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Empty trash error:', error);
    res.status(500).json({ error: 'Failed to empty trash' });
  }
};
