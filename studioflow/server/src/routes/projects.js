import express from 'express';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
import {
  createProject,
  listProjects,
  getProjectById,
  generateInvite,
  updateProject,
  deleteProject
} from '../controllers/projectController.js';

const router = express.Router();

// All routes require authentication
router.use(verifyClerk);

// Project CRUD
router.post('/', createProject);           // Create project
router.get('/', listProjects);              // List all user's projects
router.get('/:id', getProjectById);         // Get single project
router.put('/:id', updateProject);          // Update project (owner only)
router.delete('/:id', deleteProject);       // Delete project (owner only)

// Invite generation
router.post('/:id/invite', generateInvite); // Generate invite link (owner only)

export default router;
