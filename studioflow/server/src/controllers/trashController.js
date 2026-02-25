import Project from '../models/Project.js';
import Trash from '../models/Trash.js';
import ProjectInvoice from '../models/ProjectInvoice.js';
import DeletedInvoice from '../models/DeletedInvoice.js';
import ProjectFile from '../models/ProjectFile.js';
import { clearUserCache } from '../middlewares/cache.js';
import { createClerkClient } from '@clerk/backend';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});

import { checkPermission, PERMISSIONS, ROLES } from '../utils/permissions.js';

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
    // RBAC Fix: Clients should not see projects deleted by owner unless they deleted it themselves
    const trashedProjects = await Trash.find({
      $or: [
        { ownerId: userId },
        { deletedBy: userId }
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

    console.log('🔄 Restore project request:', { trashId: id, userId });

    const trashEntry = await Trash.findById(id);

    if (!trashEntry) {
      console.error('❌ Trashed project not found:', id);
      return res.status(404).json({ error: 'Trashed project not found' });
    }

    console.log('📋 Trash entry found:', {
      ownerId: trashEntry.ownerId,
      deletedBy: trashEntry.deletedBy,
      requestingUser: userId,
      canRestore: trashEntry.canRestore(userId)
    });

    // Determine user role in the original project
    let userRole = null;
    if (trashEntry.ownerId === userId) {
      userRole = ROLES.OWNER;
    } else {
      // Try to find in embedded members (legacy)
      const member = trashEntry.members.find(m => m.userId === userId);
      userRole = member?.role || null;

      // If not found, check ProjectMember collection (for migrated projects)
      if (!userRole) {
        const projectMember = await import('../models/ProjectMember.js').then(m => m.default.findOne({
          projectId: trashEntry.originalProjectId,
          userId: userId
        }));
        if (projectMember) {
          userRole = projectMember.role;
        }
      }
    }

    // Check if user can restore (Owner, Deleter, or has Permission)
    const isDeleter = trashEntry.deletedBy === userId;
    const hasPermission = userRole && checkPermission(userRole, PERMISSIONS.PROJECT_DELETE);

    if (!isDeleter && !hasPermission) {
      console.error('❌ Permission denied for user:', userId);
      return res.status(403).json({
        error: 'You do not have permission to restore this project',
        details: {
          ownerId: trashEntry.ownerId,
          deletedBy: trashEntry.deletedBy,
          userId: userId,
          role: userRole
        }
      });
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

    console.log('✅ Project restored successfully:', restoredProject._id);

    // Emit Socket.IO event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('project-created', {
        projectId: restoredProject._id,
        ownerId: restoredProject.ownerId
      });
      console.log('📡 Socket.IO: Emitted project-created event (restore) globally');
    }

    // Clear the user cache to ensure the restored project appears on the dashboard immediately
    clearUserCache(userId);

    res.json({
      message: 'Project restored successfully',
      project: restoredProject
    });
  } catch (error) {
    console.error('❌ Restore project error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      error: 'Failed to restore project',
      details: error.message
    });
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

    // Determine user role
    let userRole = null;
    if (trashEntry.ownerId === userId) {
      userRole = ROLES.OWNER;
    } else {
      // Try to find in embedded members (legacy)
      const member = trashEntry.members.find(m => m.userId === userId);
      userRole = member?.role || null;

      // If not found, check ProjectMember collection
      if (!userRole) {
        const projectMember = await import('../models/ProjectMember.js').then(m => m.default.findOne({
          projectId: trashEntry.originalProjectId,
          userId: userId
        }));
        if (projectMember) {
          userRole = projectMember.role;
        }
      }
    }

    // Check if user can delete (Owner, Deleter, or has Permission)
    const isDeleter = trashEntry.deletedBy === userId;
    const hasPermission = userRole && checkPermission(userRole, PERMISSIONS.PROJECT_DELETE);

    if (!isDeleter && !hasPermission) {
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

// ============= INVOICE TRASH MANAGEMENT =============

// @desc    Get all deleted invoices for user
// @route   GET /api/trash/invoices
// @access  Protected
export const getDeletedInvoices = async (req, res) => {
  try {
    const userId = req.userId;

    // Find invoices deleted by user or owned by user
    const deletedInvoices = await DeletedInvoice.find({
      $or: [
        { userId: userId },
        { deletedBy: userId },
        { 'client.userId': userId }
      ]
    }).sort({ deletedAt: -1 });

    // Add days remaining to each invoice
    const invoicesWithDetails = deletedInvoices.map(invoice => {
      const invoiceObj = invoice.toObject();
      return {
        ...invoiceObj,
        daysRemaining: invoice.getDaysRemaining(),
        type: 'invoice'
      };
    });

    res.json(invoicesWithDetails);
  } catch (error) {
    console.error('Get deleted invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch deleted invoices' });
  }
};

// @desc    Restore invoice from trash
// @route   POST /api/trash/invoices/:id/restore
// @access  Protected
export const restoreInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const deletedEntry = await DeletedInvoice.findById(id);

    if (!deletedEntry) {
      return res.status(404).json({ error: 'Deleted invoice not found' });
    }

    // Check if user can restore (owner or deleter)
    if (!deletedEntry.canRestore(userId)) {
      return res.status(403).json({ error: 'You do not have permission to restore this invoice' });
    }

    // Check if invoice with same ID already exists
    const existingInvoice = await ProjectInvoice.findById(deletedEntry.originalInvoiceId);
    if (existingInvoice) {
      return res.status(400).json({ error: 'An invoice with this ID already exists. Cannot restore.' });
    }

    // Restore invoice from full data
    const restoredInvoice = new ProjectInvoice(deletedEntry.fullInvoiceData);
    await restoredInvoice.save();

    // Remove from deleted invoices
    await DeletedInvoice.findByIdAndDelete(id);

    res.json({
      message: 'Invoice restored successfully',
      invoice: restoredInvoice
    });
  } catch (error) {
    console.error('Restore invoice error:', error);
    res.status(500).json({ error: 'Failed to restore invoice' });
  }
};

// @desc    Permanently delete invoice from trash
// @route   DELETE /api/trash/invoices/:id
// @access  Protected
export const permanentlyDeleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const deletedEntry = await DeletedInvoice.findById(id);

    if (!deletedEntry) {
      return res.status(404).json({ error: 'Deleted invoice not found' });
    }

    // Check if user can delete (owner or deleter)
    if (!deletedEntry.canRestore(userId)) {
      return res.status(403).json({ error: 'You do not have permission to permanently delete this invoice' });
    }

    await DeletedInvoice.findByIdAndDelete(id);

    res.json({ message: 'Invoice permanently deleted' });
  } catch (error) {
    console.error('Permanent delete invoice error:', error);
    res.status(500).json({ error: 'Failed to permanently delete invoice' });
  }
};

// ============= FILE TRASH MANAGEMENT =============

// @desc    Restore file from trash
// @route   POST /api/trash/files/:id/restore
// @access  Protected
export const restoreFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const file = await ProjectFile.findById(id);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check permissions (Uploader or Project Owner)
    const project = await Project.findById(file.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const isUploader = file.uploaderId === userId;
    const isOwner = project.ownerId === userId;

    // Also check if user is a project member with file delete/restore permissions
    // For now, we'll stick to Uploader or Owner for simplicity, or check RBAC
    let hasPermission = isUploader || isOwner;

    if (!hasPermission) {
      // Check RBAC if not direct owner/uploader
      const member = await import('../models/ProjectMember.js').then(m => m.default.findOne({ projectId: file.projectId, userId }));
      if (member) {
        hasPermission = checkPermission(member.role, PERMISSIONS.FILE_DELETE); // Assuming delete permission covers restore for now
      }
    }

    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to restore this file' });
    }

    file.status = 'active';
    await file.save();

    res.json({
      message: 'File restored successfully',
      file
    });
  } catch (error) {
    console.error('Restore file error:', error);
    res.status(500).json({ error: 'Failed to restore file' });
  }
};

// @desc    Permanently delete file from trash
// @route   DELETE /api/trash/files/:id
// @access  Protected
export const permanentlyDeleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const file = await ProjectFile.findById(id);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check permissions (Uploader or Project Owner)
    const project = await Project.findById(file.projectId);

    // If project is deleted, we might still want to allow deleting the file if user is owner of the deleted project
    // But for now let's assume project exists or we check file ownership

    const isUploader = file.uploaderId === userId;
    const isOwner = project ? project.ownerId === userId : false;

    let hasPermission = isUploader || isOwner;

    if (!hasPermission && project) {
      const member = await import('../models/ProjectMember.js').then(m => m.default.findOne({ projectId: file.projectId, userId }));
      if (member) {
        hasPermission = checkPermission(member.role, PERMISSIONS.FILE_DELETE);
      }
    }

    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to permanently delete this file' });
    }

    // TODO: Delete from storage (S3/R2)
    // await storageAdapter.deleteFile(file.storageKey); 

    await ProjectFile.findByIdAndDelete(id);

    res.json({ message: 'File permanently deleted' });
  } catch (error) {
    console.error('Permanent delete file error:', error);
    res.status(500).json({ error: 'Failed to permanently delete file' });
  }
};

// @desc    Get all trash items (projects + invoices combined)
// @route   GET /api/trash/all
// @access  Protected
export const getAllTrashItems = async (req, res) => {
  try {
    const userId = req.userId;

    // Get trashed projects
    const trashedProjects = await Trash.find({
      $or: [
        { ownerId: userId },
        { deletedBy: userId },
        { 'members.userId': userId }
      ]
    }).sort({ deletedAt: -1 });

    // Get deleted invoices
    const deletedInvoices = await DeletedInvoice.find({
      $or: [
        { userId: userId },
        { deletedBy: userId },
        { 'client.userId': userId }
      ]
    }).sort({ deletedAt: -1 });

    // Get archived files from projects where user is a collaborator
    const userProjects = await Project.find({
      $or: [
        { ownerId: userId },
        { 'members.userId': userId }
      ]
    }).select('_id');

    const projectIds = userProjects.map(p => p._id);

    const archivedFiles = await ProjectFile.find({
      projectId: { $in: projectIds },
      status: 'archived'
    }).sort({ updatedAt: -1 });

    // Format projects
    const projectsWithDetails = trashedProjects.map(project => {
      const projectObj = project.toObject();
      return {
        ...projectObj,
        daysRemaining: project.getDaysRemaining(),
        type: 'project'
      };
    });

    // Format invoices
    const invoicesWithDetails = deletedInvoices.map(invoice => {
      const invoiceObj = invoice.toObject();
      return {
        ...invoiceObj,
        daysRemaining: invoice.getDaysRemaining(),
        type: 'invoice'
      };
    });

    // Format files
    const filesWithDetails = archivedFiles.map(file => {
      const fileObj = file.toObject();
      return {
        ...fileObj,
        _id: file._id,
        fileId: file.fileId,
        filename: file.filename,
        size: file.size,
        mimeType: file.mimeType,
        projectId: file.projectId,
        deletedAt: file.updatedAt,
        deletedBy: file.uploaderId,
        daysRemaining: 90, // Files have 90-day retention
        type: 'file'
      };
    });

    // Combine and sort by deletedAt
    const allItems = [...projectsWithDetails, ...invoicesWithDetails, ...filesWithDetails]
      .sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

    res.json({
      items: allItems,
      counts: {
        projects: projectsWithDetails.length,
        invoices: invoicesWithDetails.length,
        files: filesWithDetails.length,
        total: allItems.length
      }
    });
  } catch (error) {
    console.error('Get all trash items error:', error);
    res.status(500).json({ error: 'Failed to fetch trash items' });
  }
};
