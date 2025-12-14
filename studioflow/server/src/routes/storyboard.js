import express from 'express';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
import { 
    getStoryboard, 
    createScene, 
    updateScene, 
    deleteScene,
    addSceneComment,
    createEdge, 
    deleteEdge 
} from '../controllers/storyboardController.js';

const router = express.Router();

// Feature Flag Middleware
const checkFeatureFlag = (req, res, next) => {
    if (process.env.ENABLE_STORYBOARD !== 'true') {
        return res.status(404).json({ error: 'Feature disabled' });
    }
    next();
};

router.use(verifyClerk);
router.use(checkFeatureFlag);

// Storyboard
router.get('/:projectId', getStoryboard);

// Scenes
router.post('/:projectId/scenes', createScene);
router.patch('/:projectId/scenes/:sceneId', updateScene);
router.delete('/:projectId/scenes/:sceneId', deleteScene);
router.post('/:projectId/scenes/:sceneId/comments', addSceneComment);

// Edges
router.post('/:projectId/edges', createEdge);
router.delete('/:projectId/edges/:edgeId', deleteEdge);

export default router;
