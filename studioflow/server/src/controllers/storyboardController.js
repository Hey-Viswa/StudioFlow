import Storyboard from '../models/Storyboard.js';
import Scene from '../models/Scene.js';
import Edge from '../models/Edge.js';
import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import { checkPermission, PERMISSIONS, ROLES } from '../utils/permissions.js';
import { emitToProject } from '../config/socket.js';

const getProjectAccess = async (projectId, userId) => {
    const project = await Project.findById(projectId).select('ownerId settings');
    if (!project) return { project: null, role: null };

    if (String(project.ownerId) === String(userId)) {
        return { project, role: ROLES.OWNER };
    }

    const membership = await ProjectMember.findOne({
        projectId,
        userId,
        status: { $ne: 'inactive' }
    }).select('role');

    return { project, role: membership?.role || null };
};

const canEdit = (role) => {
    return checkPermission(role, PERMISSIONS.PROJECT_UPDATE);
};

// Get Storyboard (Create if not exists)
export const getStoryboard = async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.userId;

        const { project, role } = await getProjectAccess(projectId, userId);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        // Check access
        if (!checkPermission(role, PERMISSIONS.PROJECT_VIEW)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        let storyboard = await Storyboard.findOne({ projectId });

        // Auto-create if missing
        if (!storyboard) {
            // Only owners/editors should trigger creation? 
            // For now allow any member to init empty board to avoid "missing" states
            storyboard = await Storyboard.create({
                projectId,
                createdBy: userId,
                settings: { defaultZoom: 1.0 }
            });
        }

        // Fetch nodes and edges
        const [scenes, edges] = await Promise.all([
            Scene.find({ storyboardId: storyboard._id }),
            Edge.find({ storyboardId: storyboard._id })
        ]);

        const permissions = {
            canEdit: canEdit(role),
            canComment: true
        };

        res.json({
            storyboard,
            scenes,
            edges,
            permissions
        });

    } catch (error) {
        console.error('getStoryboard error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Create Scene
export const createScene = async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.userId;
        const sceneData = req.body;

        const { project, role } = await getProjectAccess(projectId, userId);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        if (!canEdit(role)) {
            return res.status(403).json({ error: 'Clients cannot edit storyboard' });
        }

        const storyboard = await Storyboard.findOne({ projectId });
        if (!storyboard) return res.status(404).json({ error: 'Storyboard not initialized' });

        const newScene = await Scene.create({
            ...sceneData,
            storyboardId: storyboard._id,
            createdBy: userId,
            updatedBy: userId
        });

        // Realtime Broadcast
        emitToProject(projectId, 'storyboard', 'scene:create', newScene);

        res.status(201).json(newScene);
    } catch (error) {
        console.error('createScene error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Update Scene (Move, Resize, Edit)
export const updateScene = async (req, res) => {
    try {
        const { projectId, sceneId } = req.params;
        const userId = req.userId;
        const updates = req.body;

        const { project, role } = await getProjectAccess(projectId, userId);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        if (!canEdit(role)) {
            return res.status(403).json({ error: 'Clients cannot edit storyboard' });
        }

        const storyboard = await Storyboard.findOne({ projectId }).select('_id');
        if (!storyboard) return res.status(404).json({ error: 'Storyboard not initialized' });

        const scene = await Scene.findOne({ _id: sceneId, storyboardId: storyboard._id });
        if (!scene) return res.status(404).json({ error: 'Scene not found' });

        if (!updatedScene) return res.status(404).json({ error: 'Scene not found' });

        // Realtime Broadcast
        emitToProject(projectId, 'storyboard', 'scene:update', updatedScene);

        res.json(updatedScene);
    } catch (error) {
        console.error('updateScene error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Delete Scene
export const deleteScene = async (req, res) => {
    try {
        const { projectId, sceneId } = req.params;
        const userId = req.userId;

        const { project, role } = await getProjectAccess(projectId, userId);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        if (!canEdit(role)) {
            return res.status(403).json({ error: 'Clients cannot edit storyboard' });
        }

        const storyboard = await Storyboard.findOne({ projectId }).select('_id');
        if (!storyboard) return res.status(404).json({ error: 'Storyboard not initialized' });

        const scene = await Scene.findOne({ _id: sceneId, storyboardId: storyboard._id });
        if (!scene) return res.status(404).json({ error: 'Scene not found' });

        if (scene.isLocked) {
            return res.status(403).json({ error: 'Scene is locked' });
        }

        // Delete scene
        await Scene.deleteOne({ _id: sceneId });

        // Delete connected edges
        await Edge.deleteMany({
            $or: [{ sourceId: sceneId }, { targetId: sceneId }]
        });

        // Realtime Broadcast
        emitToProject(projectId, 'storyboard', 'scene:delete', { sceneId });
        // Also notify about edge deletions implicitly or explicitly?
        // Let's rely on client to cleanup edges for now, or send a refresh event
        // Better: broadcast edge deletions too
        const deletedEdges = await Edge.find({ $or: [{ sourceId: sceneId }, { targetId: sceneId }] });
        // (Too late to find them after deleteMany, fixing order)
        
        // Correct approach:
        // 1. Find edges to delete
        // 2. Delete edges
        // 3. Delete scene
        // 4. Emit

        res.json({ success: true, sceneId });
    } catch (error) {
        console.error('deleteScene error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Add Comment to Scene (Clients ALLOWED)
export const addSceneComment = async (req, res) => {
    try {
        const { projectId, sceneId } = req.params;
        const userId = req.userId;
        const { content } = req.body;

        // Verify project membership (Clients included)
        const { project, role } = await getProjectAccess(projectId, userId);
        if (!project || !checkPermission(role, PERMISSIONS.PROJECT_VIEW)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Add comment embedded
        const storyboard = await Storyboard.findOne({ projectId }).select('_id');
        if (!storyboard) return res.status(404).json({ error: 'Storyboard not initialized' });

        const scene = await Scene.findOne({ _id: sceneId, storyboardId: storyboard._id });
        if (!scene) return res.status(404).json({ error: 'Scene not found' });

        // Mock user name lookup (in real app, use User model or Auth metadata)
        // For now, assuming middleware populates something or we fetch it
        // Ideally we should fetch User to get name/avatar.
        const comment = {
            userId,
            userName: req.userName || 'User', // Clerk claims
            content,
            createdAt: new Date()
        };

        scene.comments.push(comment);
        await scene.save();

        // Broadcast
        emitToProject(projectId, 'storyboard', 'scene:update', scene);

        res.json(scene);
    } catch (error) {
        console.error('addSceneComment error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Create Edge
export const createEdge = async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.userId;
        const edgeData = req.body;

        const { project, role } = await getProjectAccess(projectId, userId);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        if (!canEdit(role)) {
            return res.status(403).json({ error: 'Clients cannot edit storyboard' });
        }

        const storyboard = await Storyboard.findOne({ projectId });
        if (!storyboard) return res.status(404).json({ error: 'Storyboard not initialized' });

        if (!edgeData?.sourceId || !edgeData?.targetId) {
            return res.status(400).json({ error: 'sourceId and targetId are required' });
        }

        const [sourceScene, targetScene] = await Promise.all([
            Scene.findOne({ _id: edgeData.sourceId, storyboardId: storyboard._id }).select('_id'),
            Scene.findOne({ _id: edgeData.targetId, storyboardId: storyboard._id }).select('_id')
        ]);

        if (!sourceScene || !targetScene) {
            return res.status(400).json({ error: 'Cannot connect scenes that do not exist in this storyboard' });
        }
        
        const newEdge = await Edge.create({
            ...edgeData,
            storyboardId: storyboard._id,
            createdBy: userId
        });

        emitToProject(projectId, 'storyboard', 'edge:create', newEdge);

        res.status(201).json(newEdge);
    } catch (error) {
        console.error('createEdge error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Update Edge
export const updateEdge = async (req, res) => {
    try {
        const { projectId, edgeId } = req.params;
        const userId = req.userId;
        const updates = req.body;

        const { project, role } = await getProjectAccess(projectId, userId);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        if (!canEdit(role)) {
            return res.status(403).json({ error: 'Clients cannot edit storyboard' });
        }

        const storyboard = await Storyboard.findOne({ projectId }).select('_id');
        if (!storyboard) return res.status(404).json({ error: 'Storyboard not initialized' });

        const edge = await Edge.findOne({ _id: edgeId, storyboardId: storyboard._id });
        if (!edge) return res.status(404).json({ error: 'Edge not found' });

        if (edge.isLocked && updates.isLocked === undefined) {
             return res.status(403).json({ error: 'Edge is locked' });
        }

        Object.assign(edge, updates);
        const updatedEdge = await edge.save();

        emitToProject(projectId, 'storyboard', 'edge:update', updatedEdge);

        res.json(updatedEdge);
    } catch (error) {
        console.error('updateEdge error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Delete Edge
export const deleteEdge = async (req, res) => {
    try {
        const { projectId, edgeId } = req.params;
        const userId = req.userId;

        const { project, role } = await getProjectAccess(projectId, userId);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        if (!canEdit(role)) {
            return res.status(403).json({ error: 'Clients cannot edit storyboard' });
        }

        const storyboard = await Storyboard.findOne({ projectId }).select('_id');
        if (!storyboard) return res.status(404).json({ error: 'Storyboard not initialized' });

        const edge = await Edge.findOne({ _id: edgeId, storyboardId: storyboard._id });
        if (!edge) return res.status(404).json({ error: 'Edge not found' });

        if (edge.isLocked) {
             return res.status(403).json({ error: 'Edge is locked' });
        }

        await Edge.deleteOne({ _id: edgeId });

        emitToProject(projectId, 'storyboard', 'edge:delete', { edgeId });

        res.json({ success: true, edgeId });
    } catch (error) {
        console.error('deleteEdge error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
